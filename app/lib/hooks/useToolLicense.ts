/**
 * React Hook for Tool License Validation
 * 
 * Usage:
 * const { isValid, loading, activate, validate, deviceCount } = useToolLicense('tool-slug');
 * 
 * Features:
 * - Automatic token refresh
 * - Device registration
 * - Offline payload support
 * - Heartbeat management
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

type DeviceInfo = {
  platform: "windows" | "macos" | "linux" | "android" | "ios" | "web";
  platformVersion?: string;
  appVersion?: string;
  cpuCores?: number;
  totalMemory?: number;
  screenResolution?: string;
};

type LicenseState = {
  isValid: boolean;
  loading: boolean;
  activating: boolean;
  error: string | null;
  token: string | null;
  expiresAt: string | null;
  deviceCount: number;
  maxDevices: number;
  offlinePayload: any | null;
  signature: string | null;
  nextCheckAt: string | null;
};

type UseToolLicenseOptions = {
  slug: string;
  licenseKey?: string;
  deviceInfo?: DeviceInfo;
  autoActivate?: boolean;
  onActivated?: () => void;
  onExpired?: () => void;
  onInvalid?: () => void;
};

/**
 * Generate a stable device ID for this browser/device
 * Uses localStorage + fingerprinting
 */
function getDeviceId(): string {
  // Check localStorage first
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("device_id");
    if (stored) return stored;
  }

  // Generate new device ID
  const deviceId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  // Store for future use
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("device_id", deviceId);
  }

  return deviceId;
}

/**
 * Get basic device info for the current platform
 */
function getDeviceInfo(): DeviceInfo {
  const nav = typeof navigator !== "undefined" ? navigator : null;

  let platform: DeviceInfo["platform"] = "web";
  const userAgent = nav?.userAgent || "";

  if (/Android/i.test(userAgent)) {
    platform = "android";
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    platform = "ios";
  } else if (/Win/i.test(userAgent)) {
    platform = "windows";
  } else if (/Mac/i.test(userAgent)) {
    platform = "macos";
  } else if (/Linux/i.test(userAgent)) {
    platform = "linux";
  }

  return {
    platform,
    platformVersion: nav?.platform,
    appVersion: "1.0.0", // Replace with actual app version
    screenResolution:
      typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : undefined,
  };
}

export function useToolLicense({
  slug,
  licenseKey,
  deviceInfo: providedDeviceInfo,
  autoActivate = false,
  onActivated,
  onExpired,
  onInvalid,
}: UseToolLicenseOptions) {
  const [state, setState] = useState<LicenseState>({
    isValid: false,
    loading: true,
    activating: false,
    error: null,
    token: null,
    expiresAt: null,
    deviceCount: 0,
    maxDevices: 0,
    offlinePayload: null,
    signature: null,
    nextCheckAt: null,
  });

  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const deviceId = useRef<string>(getDeviceId());
  const deviceInfo = useRef<DeviceInfo>(providedDeviceInfo || getDeviceInfo());

  // Clear heartbeat on unmount
  useEffect(() => {
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, []);

  // Send heartbeat to keep session alive
  const sendHeartbeat = useCallback(async (token: string, nextCheckAt?: string | null) => {
    try {
      const res = await fetch("/api/device/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          token,
          deviceId: deviceId.current,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.nextHeartbeatAt;
      }
    } catch (error) {
      console.error("[useToolLicense] Heartbeat failed:", error);
    }
    return nextCheckAt;
  }, [slug]);

  // Setup heartbeat interval
  useEffect(() => {
    if (state.isValid && state.token && !state.loading) {
      // Send first heartbeat after 5 minutes
      const initialDelay = setTimeout(() => {
        sendHeartbeat(state.token!, state.nextCheckAt).then((nextHeartbeat) => {
          if (nextHeartbeat) {
            // Then send heartbeats every 14 days (or before expiry)
            const intervalMs = Math.min(
              14 * 24 * 60 * 60 * 1000,
              new Date(nextHeartbeat).getTime() - Date.now() - 24 * 60 * 60 * 1000
            );

            if (intervalMs > 0) {
              heartbeatInterval.current = setInterval(() => {
                sendHeartbeat(state.token!, state.nextCheckAt);
              }, intervalMs);
            }
          }
        });
      }, 5 * 60 * 1000);

      return () => clearTimeout(initialDelay);
    }
  }, [state.isValid, state.token, state.loading, sendHeartbeat, state.nextCheckAt]);

  // Activate license
  const activate = useCallback(
    async (key?: string): Promise<boolean> => {
      const keyToUse = key || licenseKey;

      if (!keyToUse) {
        setState((s) => ({ ...s, error: "No license key provided", loading: false }));
        return false;
      }

      setState((s) => ({ ...s, activating: true, error: null }));

      try {
        const res = await fetch("/api/license/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            licenseKey: keyToUse,
            deviceId: deviceId.current,
            deviceInfo: deviceInfo.current,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Activation failed");
        }

        setState({
          isValid: true,
          loading: false,
          activating: false,
          error: null,
          token: data.token,
          expiresAt: data.expiresAt,
          deviceCount: data.deviceCount,
          maxDevices: data.maxDevices,
          offlinePayload: data.offlinePayload,
          signature: data.signature,
          nextCheckAt: data.nextCheckAt,
        });

        // Store token for persistence
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(`license_token_${slug}`, data.token);
          localStorage.setItem(`license_key_${slug}`, keyToUse);
        }

        onActivated?.();
        toast.success("Tool activated successfully");

        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Activation failed";
        setState((s) => ({
          ...s,
          activating: false,
          loading: false,
          error: message,
          isValid: false,
        }));
        toast.error(message);
        return false;
      }
    },
    [slug, licenseKey, onActivated]
  );

  // Validate existing token
  const validate = useCallback(
    async (token?: string): Promise<boolean> => {
      const tokenToUse =
        token ||
        (typeof localStorage !== "undefined" ? localStorage.getItem(`license_token_${slug}`) : null);

      if (!tokenToUse) {
        setState((s) => ({ ...s, loading: false, isValid: false }));
        return false;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const res = await fetch("/api/license/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            token: tokenToUse,
            deviceId: deviceId.current,
          }),
        });

        const data = await res.json();

        if (data.valid) {
          setState({
            isValid: true,
            loading: false,
            activating: false,
            error: null,
            token: tokenToUse,
            expiresAt: data.expiresAt,
            deviceCount: data.deviceCount,
            maxDevices: data.maxDevices,
            offlinePayload: null,
            signature: null,
            nextCheckAt: null,
          });
          return true;
        } else {
          // Token invalid - clear stored token
          if (typeof localStorage !== "undefined") {
            localStorage.removeItem(`license_token_${slug}`);
          }

          setState((s) => ({
            ...s,
            loading: false,
            isValid: false,
            token: null,
            error: data.reason || "Invalid license",
          }));

          onInvalid?.();
          return false;
        }
      } catch (error) {
        setState((s) => ({
          ...s,
          loading: false,
          error: error instanceof Error ? error.message : "Validation failed",
        }));
        return false;
      }
    },
    [slug, onInvalid]
  );

  // Initial validation/activation
  useEffect(() => {
    async function init() {
      // Try to validate existing token first
      const storedToken =
        typeof localStorage !== "undefined" ? localStorage.getItem(`license_token_${slug}`) : null;

      if (storedToken) {
        const valid = await validate(storedToken);
        if (valid) return;
      }

      // Auto-activate if license key provided
      if (autoActivate && licenseKey) {
        await activate(licenseKey);
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    }

    init();
  }, [slug, autoActivate, licenseKey, validate, activate]);

  // Remove device from license
  const removeDevice = useCallback(
    async (deviceToRemove?: string): Promise<boolean> => {
      const device = deviceToRemove || deviceId.current;

      try {
        const res = await fetch("/api/device/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseKey: licenseKey,
            deviceId: device,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to remove device");
        }

        const data = await res.json();
        setState((s) => ({ ...s, deviceCount: data.remainingDevices }));

        toast.success("Device removed successfully");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to remove device";
        toast.error(message);
        return false;
      }
    },
    [licenseKey]
  );

  // Clear license (logout)
  const clear = useCallback(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(`license_token_${slug}`);
      localStorage.removeItem(`license_key_${slug}`);
    }

    setState({
      isValid: false,
      loading: false,
      activating: false,
      error: null,
      token: null,
      expiresAt: null,
      deviceCount: 0,
      maxDevices: 0,
      offlinePayload: null,
      signature: null,
      nextCheckAt: null,
    });

    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, [slug]);

  return {
    ...state,
    deviceId: deviceId.current,
    activate,
    validate,
    removeDevice,
    clear,
  };
}

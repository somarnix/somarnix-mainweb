"use client";

import { useEffect, useMemo, useState } from "react";

export type KeyLicenceStatus = "checking" | "ready" | "missing" | "invalid";

export type KeyLicenceState = {
  status: KeyLicenceStatus;
  token: string;
  deviceId: string;
  expiresAt: string | null;
  maxDevices: number | null;
  deviceCount: number | null;
  error: string | null;
};

type KeyLicenceProps = {
  toolSlug: string;
  title?: string;
  className?: string;
  showStatusInCard?: boolean;
  licenseKeyStorageKey?: string;
  onLicenseKeyChange?: (licenseKey: string) => void;
  onChange?: (state: KeyLicenceState) => void;
  children?: (state: KeyLicenceState) => React.ReactNode;
};

const DEVICE_ID_KEY = "gstech_tool_device_id";

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

function getLicenseTokenKey(slug: string): string {
  return `gstech_tool_license_${slug}`;
}

export default function KeyLicence({
  toolSlug,
  title = "License access",
  className = "",
  showStatusInCard = true,
  licenseKeyStorageKey,
  onLicenseKeyChange,
  onChange,
  children,
}: KeyLicenceProps) {
  const [deviceId, setDeviceId] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<KeyLicenceStatus>("checking");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [maxDevices, setMaxDevices] = useState<number | null>(null);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const tokenStorageKey = useMemo(() => getLicenseTokenKey(toolSlug), [toolSlug]);
  const keyStorageKey = useMemo(
    () => licenseKeyStorageKey || `${tokenStorageKey}_key`,
    [licenseKeyStorageKey, tokenStorageKey]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedLicenseKey = window.localStorage.getItem(keyStorageKey) || "";
    setLicenseKey(savedLicenseKey);
  }, [keyStorageKey]);

  useEffect(() => {
    onLicenseKeyChange?.(licenseKey);
    if (typeof window === "undefined") return;
    if (licenseKey.trim()) {
      window.localStorage.setItem(keyStorageKey, licenseKey);
      return;
    }
    window.localStorage.removeItem(keyStorageKey);
  }, [keyStorageKey, licenseKey, onLicenseKeyChange]);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    if (typeof window === "undefined") return;
    const savedToken = window.localStorage.getItem(tokenStorageKey) || "";
    setToken(savedToken);
    if (!savedToken) {
      setStatus("missing");
      setMaxDevices(null);
      setDeviceCount(null);
      return;
    }

    let mounted = true;
    const verify = async () => {
      setStatus("checking");
      setError(null);
      try {
        const res = await fetch(
          `/api/tools/license/status?slug=${encodeURIComponent(toolSlug)}&deviceId=${encodeURIComponent(id)}`,
          {
            credentials: "include",
            headers: { Authorization: `Bearer ${savedToken}` },
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok || data.valid !== true) {
          setStatus("invalid");
          setError(data?.reason || "License is not valid for this device.");
          setMaxDevices(null);
          setDeviceCount(null);
          return;
        }
        setStatus("ready");
        setExpiresAt(typeof data?.expiresAt === "string" ? data.expiresAt : null);
        setMaxDevices(Number.isFinite(Number(data?.maxDevices)) ? Number(data.maxDevices) : null);
        setDeviceCount(Number.isFinite(Number(data?.deviceCount)) ? Number(data.deviceCount) : null);
      } catch {
        if (!mounted) return;
        setStatus("invalid");
        setError("Failed to verify license.");
        setMaxDevices(null);
        setDeviceCount(null);
      }
    };
    void verify();

    return () => {
      mounted = false;
    };
  }, [tokenStorageKey, toolSlug]);

  const activate = async () => {
    if (!licenseKey.trim() || !deviceId) return;
    setActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug: toolSlug,
          licenseKey: licenseKey.trim(),
          deviceId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        throw new Error(data?.error || "Activation failed");
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(tokenStorageKey, data.token);
        window.localStorage.setItem(keyStorageKey, licenseKey.trim());
      }
      setToken(data.token);
      setLicenseKey(licenseKey.trim());
      setStatus("ready");
      setExpiresAt(typeof data?.expiresAt === "string" ? data.expiresAt : null);
      setMaxDevices(Number.isFinite(Number(data?.maxDevices)) ? Number(data.maxDevices) : null);
      setDeviceCount(Number.isFinite(Number(data?.deviceCount)) ? Number(data.deviceCount) : null);
      setError(null);
    } catch (err) {
      setStatus("invalid");
      setError(err instanceof Error ? err.message : "Activation failed");
      setMaxDevices(null);
      setDeviceCount(null);
    } finally {
      setActivating(false);
    }
  };

  const deactivate = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(tokenStorageKey);
    }
    setToken("");
    setStatus("missing");
    setExpiresAt(null);
    setMaxDevices(null);
    setDeviceCount(null);
    setError(null);
  };

  const state = useMemo<KeyLicenceState>(
    () => ({
      status,
      token,
      deviceId,
      expiresAt,
      maxDevices,
      deviceCount,
      error,
    }),
    [status, token, deviceId, expiresAt, maxDevices, deviceCount, error]
  );

  useEffect(() => {
    onChange?.(state);
  }, [onChange, state]);

  const isReady = status === "ready";

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{isReady ? "License" : title}</h2>
          {showStatusInCard && isReady ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Licensed
            </span>
          ) : null}
        </div>
        {showStatusInCard ? (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              isReady
                ? "bg-emerald-100 text-emerald-700"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {isReady ? "Active" : status === "checking" ? "Checking" : "Not active"}
          </span>
        ) : null}
      </div>

      {isReady ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-3">
          <div className="mb-3 flex items-center justify-between">
            <div />
            <button
              type="button"
              onClick={deactivate}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Deactivate License
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <span className="text-slate-500">Device ID:</span>{" "}
              <span className="font-medium">{deviceId || "--"}</span>
            </div>
            <div>
              <span className="text-slate-500">Device max:</span>{" "}
              <span className="font-medium">{maxDevices ?? "--"}</span>
            </div>
            <div>
              <span className="text-slate-500">Device count:</span>{" "}
              <span className="font-medium">{deviceCount ?? "--"}</span>
            </div>
            <div>
              <span className="text-slate-500">Expires:</span>{" "}
              <span className="font-medium">
                {expiresAt ? new Date(expiresAt).toLocaleString() : "No expiry"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-1">
            <input
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Enter license key"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={activate}
              disabled={activating || !licenseKey.trim() || !deviceId}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activating ? "Activating..." : "Activate License"}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Device ID: {deviceId || "--"}
            </span>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            Please activate your license to unlock the editor features.
          </div>
        </>
      )}

      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}

      {children ? <div className="mt-4">{children(state)}</div> : null}
    </div>
  );
}

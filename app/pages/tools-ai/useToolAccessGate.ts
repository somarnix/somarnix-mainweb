"use client";

import { useEffect, useMemo, useState } from "react";

import type { ToolDefinitionClientRecord } from "./tool-runtime-types";
import { readBoolean, readObject, readString } from "./tool-runtime-types";

type AccessResponse = {
  hasAccess: boolean;
  reason?: string;
  accessEnd?: string;
  deviceLimit?: number;
  deviceType?: string;
  product?: { id: number; slug: string; title: string };
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

export function useToolAccessGate(toolSlug: string, definition: ToolDefinitionClientRecord | null) {
  const [deviceId] = useState(() => getDeviceId());
  const [fetchedStatus, setFetchedStatus] = useState<"loading" | "ready" | "blocked">("loading");
  const [fetchedInfo, setFetchedInfo] = useState<AccessResponse | null>(null);

  const config = useMemo(() => readObject(definition?.config), [definition?.config]);
  const display = useMemo(() => readObject(config?.display), [config]);
  const purchase = useMemo(() => readObject(config?.purchase), [config]);
  const access = useMemo(() => readObject(config?.access), [config]);
  const ui = useMemo(() => readObject(config?.ui), [config]);
  const features = useMemo(() => readObject(config?.features), [config]);

  const requiresLogin = readBoolean(purchase?.requiresLogin, true);
  const requiresPurchase = readBoolean(purchase?.requiresPurchase, true);
  const requiresLicenseActivation = readBoolean(purchase?.requiresLicenseActivation, false);
  const allowGuestPreview = readBoolean(access?.allowGuestPreview, false);
  const accessModel = readString(definition?.accessModel, "purchase");
  const canSkipAccessCheck =
    accessModel === "none" || (!requiresLogin && !requiresPurchase && allowGuestPreview);

  useEffect(() => {
    if (!deviceId) return;
    let mounted = true;

    if (canSkipAccessCheck) {
      return;
    }

    const load = async () => {
      setFetchedStatus("loading");
      try {
        const res = await fetch(
          `/api/tools/access?slug=${encodeURIComponent(toolSlug)}&deviceId=${encodeURIComponent(deviceId)}`,
          { credentials: "include" }
        );
        const data = (await res.json().catch(() => ({}))) as AccessResponse;
        if (!mounted) return;
        setFetchedInfo(data);
        setFetchedStatus(data.hasAccess ? "ready" : "blocked");
      } catch {
        if (!mounted) return;
        setFetchedInfo({ hasAccess: false, reason: "network_error" });
        setFetchedStatus("blocked");
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [canSkipAccessCheck, deviceId, toolSlug]);

  const status = canSkipAccessCheck ? "ready" : fetchedStatus;
  const info = canSkipAccessCheck ? { hasAccess: true } : fetchedInfo;

  return {
    deviceId,
    status,
    info,
    config,
    display,
    purchase,
    access,
    ui,
    features,
    requiresLicenseActivation,
  };
}

export function getBlockedReasonMessage(reason?: string | null): string {
  switch (reason) {
    case "login_required":
      return "Please login to use this tool.";
    case "expired":
      return "Your access has expired. Please buy again.";
    case "device_not_allowed":
      return "This plan is not allowed on your device type.";
    case "device_limit":
      return "Device limit reached for this plan.";
    case "tool_disabled":
      return "This tool is currently disabled.";
    case "tool_not_found":
      return "This tool could not be found.";
    case "network_error":
      return "The tool could not verify access right now. Please try again.";
    default:
      return "You need to buy this tool to use it.";
  }
}

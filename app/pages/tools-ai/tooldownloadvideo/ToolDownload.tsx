import { useEffect, useState } from "react";
import KeyLicence, { type KeyLicenceState } from "@/app/components/KeyLicence";

type AccessResponse = {
  hasAccess: boolean;
  reason?: string;
  accessEnd?: string;
  deviceLimit?: number;
  deviceType?: string;
  product?: { id: number; slug: string; title: string };
};

const DEFAULT_TOOL_PRODUCT_SLUG = "tooldownloadvideo";

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const key = "gstech_tool_device_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, id);
  return id;
}

export default function ToolDownload({ toolSlug }: { toolSlug?: string }) {
  const resolvedToolSlug = (toolSlug || DEFAULT_TOOL_PRODUCT_SLUG).trim() || DEFAULT_TOOL_PRODUCT_SLUG;
  const [deviceId] = useState(() => getDeviceId());
  const [status, setStatus] = useState<"loading" | "ready" | "blocked">("loading");
  const [info, setInfo] = useState<AccessResponse | null>(null);
  const [licenseState, setLicenseState] = useState<KeyLicenceState>({
    status: "checking",
    token: "",
    deviceId: "",
    expiresAt: null,
    maxDevices: null,
    deviceCount: null,
    error: null,
  });

  useEffect(() => {
    if (!deviceId) return;
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/tools/access?slug=${encodeURIComponent(resolvedToolSlug)}&deviceId=${encodeURIComponent(
            deviceId
          )}`,
          { credentials: "include" }
        );
        const data = (await res.json().catch(() => ({}))) as AccessResponse;
        if (!mounted) return;
        setInfo(data);
        setStatus(data.hasAccess ? "ready" : "blocked");
      } catch {
        if (!mounted) return;
        setInfo({ hasAccess: false, reason: "network_error" });
        setStatus("blocked");
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [deviceId, resolvedToolSlug]);

  if (status === "loading") {
    return <div className="p-6 text-gray-500">Loading tool access...</div>;
  }

  if (status === "blocked") {
    const reason = info?.reason ?? "not_purchased";
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Tool Download</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          {reason === "login_required"
            ? "Please login to use this tool."
            : reason === "expired"
              ? "Your access has expired. Please buy again."
              : reason === "device_not_allowed"
                ? "This plan is not allowed on your device type."
                : reason === "device_limit"
                  ? "Device limit reached for this plan."
                  : "You need to buy this tool to use it."}
        </div>
        <div className="flex gap-2">
          {reason === "login_required" ? (
            <button
              className="px-4 py-2 rounded-lg bg-black text-white text-sm"
              onClick={() => (window.location.href = "/login")}
            >
              Login
            </button>
          ) : (
            <button
              className="px-4 py-2 rounded-lg bg-black text-white text-sm"
              onClick={() => (window.location.href = `/product/${resolvedToolSlug}`)}
            >
              Buy Tool
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Tool Download</h1>
      <KeyLicence toolSlug={resolvedToolSlug} title="Tool license" onChange={setLicenseState} />
      {licenseState.status === "ready" ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Access granted. Put your download tool UI here.
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Enter and activate your license key before using this tool.
        </div>
      )}
    </div>
  );
}

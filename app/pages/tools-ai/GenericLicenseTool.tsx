"use client";

import { useState } from "react";

import KeyLicence, { type KeyLicenceState } from "@/app/components/KeyLicence";

import type { ToolDefinitionClientRecord } from "./tool-runtime-types";
import { readString } from "./tool-runtime-types";
import { getBlockedReasonMessage, useToolAccessGate } from "./useToolAccessGate";

export default function GenericLicenseTool({
  toolSlug,
  definition,
}: {
  toolSlug: string;
  definition: ToolDefinitionClientRecord | null;
}) {
  const { status, info, display, ui } = useToolAccessGate(toolSlug, definition);
  const [licenseState, setLicenseState] = useState<KeyLicenceState>({
    status: "checking",
    token: "",
    deviceId: "",
    expiresAt: null,
    maxDevices: null,
    deviceCount: null,
    error: null,
  });

  const title = readString(display?.title, definition?.productTitle || "License Tool");
  const subtitle = readString(display?.subtitle, "");
  const activationInstructions = readString(ui?.activationInstructions, "");
  const deliveryInstructions = readString(ui?.deliveryInstructions, "");
  const supportText = readString(ui?.supportText, "");

  const openProduct = () => {
    window.location.href = `/product/${toolSlug}`;
  };

  if (status === "loading") {
    return <div className="p-6 text-gray-500">Loading tool access...</div>;
  }

  if (status === "blocked") {
    const reason = info?.reason ?? "not_purchased";
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">{getBlockedReasonMessage(reason)}</p>
          <div className="mt-4 flex gap-2">
            {reason === "login_required" ? (
              <button
                type="button"
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
                onClick={() => (window.location.href = "/login")}
              >
                Login
              </button>
            ) : (
              <button
                type="button"
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
                onClick={openProduct}
              >
                Open product page
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}
      </div>

      <KeyLicence toolSlug={toolSlug} title="Activate your license" onChange={setLicenseState} />

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">License status</div>
        <p className="mt-2 text-sm text-gray-600">
          {licenseState.status === "ready"
            ? "Your license is active on this device."
            : "Activate your license key to use this product."}
        </p>

        {activationInstructions ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Activation instructions</div>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
              {activationInstructions}
            </p>
          </div>
        ) : null}

        {deliveryInstructions ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Delivery notes</div>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
              {deliveryInstructions}
            </p>
          </div>
        ) : null}

        {supportText ? (
          <div className="mt-4 text-sm text-gray-500">{supportText}</div>
        ) : null}
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";

import KeyLicence, { type KeyLicenceState } from "@/app/components/KeyLicence";

import type { ToolDefinitionClientRecord } from "./tool-runtime-types";
import { readBoolean, readString } from "./tool-runtime-types";
import { getBlockedReasonMessage, useToolAccessGate } from "./useToolAccessGate";

export default function GenericOnlineTool({
  toolSlug,
  definition,
}: {
  toolSlug: string;
  definition: ToolDefinitionClientRecord | null;
}) {
  const { status, info, display, features, ui, requiresLicenseActivation } = useToolAccessGate(
    toolSlug,
    definition
  );
  const [licenseState, setLicenseState] = useState<KeyLicenceState>({
    status: "checking",
    token: "",
    deviceId: "",
    expiresAt: null,
    maxDevices: null,
    deviceCount: null,
    error: null,
  });

  const title = readString(display?.title, definition?.productTitle || "Online Tool");
  const subtitle = readString(display?.subtitle, "");
  const launchUrl = readString(features?.launchUrl, readString(ui?.launchUrl, ""));
  const runMode = readString(features?.runMode, "external_url");
  const introText = readString(ui?.introText, "");
  const usageInstructions = readString(ui?.usageInstructions, "");
  const allowEmbed = readBoolean(ui?.embedInFrame, false);
  const toolReady = !requiresLicenseActivation || licenseState.status === "ready";

  const openProduct = () => {
    window.location.href = `/product/${toolSlug}`;
  };

  const openTool = () => {
    if (!launchUrl) return;
    window.open(launchUrl, "_blank", "noopener,noreferrer");
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
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}
        {introText ? <p className="mt-3 text-sm text-gray-600">{introText}</p> : null}
      </div>

      {requiresLicenseActivation ? (
        <KeyLicence toolSlug={toolSlug} title="Activate license to open tool" onChange={setLicenseState} />
      ) : null}

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Tool access</h2>
            <p className="mt-1 text-sm text-gray-600">
              {toolReady
                ? "Your access is active. Open the tool using the button below."
                : "Activate your license before opening this tool."}
            </p>
          </div>
          <button
            type="button"
            disabled={!toolReady || !launchUrl}
            onClick={openTool}
            className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runMode === "internal_page" ? "Open internal tool" : "Open web tool"}
          </button>
        </div>

        {usageInstructions ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Usage instructions</div>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{usageInstructions}</p>
          </div>
        ) : null}

        {allowEmbed && launchUrl ? (
          <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200">
            <iframe
              title={title}
              src={launchUrl}
              className="h-[680px] w-full bg-white"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}


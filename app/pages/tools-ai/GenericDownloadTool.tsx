"use client";

import { useState } from "react";

import KeyLicence, { type KeyLicenceState } from "@/app/components/KeyLicence";

import type { ToolDefinitionClientRecord } from "./tool-runtime-types";
import { readBoolean, readString } from "./tool-runtime-types";
import { getBlockedReasonMessage, useToolAccessGate } from "./useToolAccessGate";

export default function GenericDownloadTool({
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

  const title = readString(display?.title, definition?.productTitle || "Download Tool");
  const subtitle = readString(display?.subtitle, "");
  const downloadUrl = readString(features?.downloadUrl, readString(ui?.downloadUrl, ""));
  const platform = readString(features?.platform, "Windows");
  const version = readString(features?.version, "");
  const instructions = readString(ui?.installationInstructions, "");
  const releaseNotes = readString(ui?.releaseNotes, "");
  const allowDirectDownload = readBoolean(features?.allowDirectDownload, true);
  const downloadReady = !requiresLicenseActivation || licenseState.status === "ready";

  const openProduct = () => {
    window.location.href = `/product/${toolSlug}`;
  };

  const openDownload = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const metadata = [
    version ? `Version ${version}` : null,
    platform ? `${platform} build` : null,
    info?.accessEnd ? `Access until ${new Date(info.accessEnd).toLocaleDateString()}` : null,
  ].filter(Boolean) as string[];

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
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}
            {metadata.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {metadata.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={openProduct}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View product
          </button>
        </div>
      </div>

      {requiresLicenseActivation ? (
        <KeyLicence toolSlug={toolSlug} title="Activate license to download" onChange={setLicenseState} />
      ) : null}

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Download package</h2>
            <p className="mt-1 text-sm text-gray-600">
              {downloadReady
                ? "Your access is active. Download the current build below."
                : "Activate your license before downloading this build."}
            </p>
          </div>
          <button
            type="button"
            disabled={!downloadReady || !downloadUrl || !allowDirectDownload}
            onClick={openDownload}
            className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloadUrl ? "Download build" : "No file uploaded"}
          </button>
        </div>

        {instructions ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Installation instructions</div>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{instructions}</p>
          </div>
        ) : null}

        {releaseNotes ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Release notes</div>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{releaseNotes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

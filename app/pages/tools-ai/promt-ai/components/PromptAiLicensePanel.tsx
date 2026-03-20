"use client";

import KeyLicence, { type KeyLicenceState } from "@/app/components/KeyLicence";

const PROMT_AI_LICENSE_KEY_STORAGE = "gstech_promt_ai_license_key";

export default function PromptAiLicensePanel({
  toolSlug,
  onLicenseKeyChange,
  onChange,
}: {
  toolSlug: string;
  onLicenseKeyChange: (licenseKey: string) => void;
  onChange: (state: KeyLicenceState) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <div className="absolute -right-12 top-10 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/15 blur-3xl" />
      <div className="relative z-10 border-b border-slate-200/70 px-6 py-5 dark:border-gray-800">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
          License
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Prompt AI access
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Change the Prompt AI license here. Flow Queue will copy this key automatically and lock it.
        </p>
      </div>
      <div className="relative z-10 p-6">
        <KeyLicence
          toolSlug={toolSlug}
          title="Prompt AI License"
          className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
          showStatusInCard={false}
          licenseKeyStorageKey={PROMT_AI_LICENSE_KEY_STORAGE}
          onLicenseKeyChange={onLicenseKeyChange}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

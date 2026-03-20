// gstechedukh\app\pages\tools-ai\promt-ai\PromtAi.tsx
"use client";

import { useEffect, useState } from "react";
import type { KeyLicenceState } from "@/app/components/KeyLicence";
import type { PromtAiTab } from "@/app/components/promt/types";
import PromptAiContent from "./components/PromptAiContent";
import PromptAiHero from "./components/PromptAiHero";
import PromptAiLicensePanel from "./components/PromptAiLicensePanel";
import PromptAiTabs from "./components/PromptAiTabs";

const STORAGE_KEY = "promt-ai-tab";
const DEFAULT_PROMT_AI_TOOL_SLUG = process.env.NEXT_PUBLIC_PROMT_AI_TOOL_SLUG || "promt-ai";

function getInitialTab(): PromtAiTab {
  if (typeof window === "undefined") return "imgtotext";
  const saved = window.localStorage.getItem(STORAGE_KEY) as PromtAiTab | null;
  return saved || "imgtotext";
}

export default function PromtAiPage({ toolSlug }: { toolSlug?: string }) {
  const resolvedToolSlug =
    (toolSlug || DEFAULT_PROMT_AI_TOOL_SLUG).trim() || DEFAULT_PROMT_AI_TOOL_SLUG;
  const [tab, setTab] = useState<PromtAiTab>(getInitialTab);
  const [promptAiLicenseKey, setPromptAiLicenseKey] = useState("");
  const [promptAiLicenseState, setPromptAiLicenseState] = useState<KeyLicenceState>({
    status: "checking",
    token: "",
    deviceId: "",
    expiresAt: null,
    maxDevices: null,
    deviceCount: null,
    error: null,
  });
  const promptAiUnlocked = promptAiLicenseState.status === "ready";

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, tab);
  }, [tab]);

  return (
    <div className="page-bg min-h-screen">
      <div className="prompt-ai-studio mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <PromptAiHero licenseStatus={promptAiLicenseState.status} />
          <PromptAiLicensePanel
            toolSlug={resolvedToolSlug}
            onLicenseKeyChange={setPromptAiLicenseKey}
            onChange={setPromptAiLicenseState}
          />
        </div>

        <PromptAiTabs tab={tab} onTabChange={setTab} promptAiUnlocked={promptAiUnlocked} />
        <PromptAiContent
          tab={tab}
          promptAiUnlocked={promptAiUnlocked}
          resolvedToolSlug={resolvedToolSlug}
          promptAiLicenseKey={promptAiLicenseKey}
        />
      </div>
    </div>
  );
}

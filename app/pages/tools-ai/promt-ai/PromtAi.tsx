// gstechedukh\app\pages\tools-ai\promt-ai\PromtAi.tsx
"use client";

import { useEffect, useState } from "react";
import ImgToTextPage from "./imgtotext/page";
import TextToImgPage from "./texttoimg/page";
import TextToStoryPage from "./texttostory/page";
import StoryToScenePage from "./texttoscene/page";
import FlowWorkerPage from "./generateflow-ai/FlowWorkerPage";
import KeyLicence, { type KeyLicenceState } from "@/app/components/KeyLicence";
import ThemeLightAndDark, {
  themeContentFrameClass,
  themePageDescriptionClass,
  themePageEyebrowClass,
  themeTabButtonClasses,
} from "@/app/components/ThemeLightAndDark";
import type { PromtAiTab } from "@/app/components/promt/types";

const STORAGE_KEY = "promt-ai-tab";
const DEFAULT_PROMT_AI_TOOL_SLUG = process.env.NEXT_PUBLIC_PROMT_AI_TOOL_SLUG || "promt-ai";
const PROMT_AI_LICENSE_KEY_STORAGE = "gstech_promt_ai_license_key";

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
    <ThemeLightAndDark>
      <div className="prompt-ai-studio mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-500/15 to-indigo-500/15 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 blur-3xl" />
            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-gray-700 dark:bg-gray-800">
                  Prompt AI Suite
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${
                    promptAiLicenseState.status === "ready"
                      ? "border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {promptAiLicenseState.status === "ready" ? "License active" : "License required"}
                </span>
              </div>
              <p className={themePageEyebrowClass}>Prompt AI Tools</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white md:text-4xl">
                Image to Text • Text to Image • Text to Story • Story to Scene • Flow Queue
              </h1>
              <p className={`${themePageDescriptionClass} max-w-3xl`}>
                Switch between tools without leaving this page. The Flow Queue now uses the same Prompt AI
                license automatically.
              </p>
            </div>
          </header>

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
                toolSlug={resolvedToolSlug}
                title="Prompt AI License"
                className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
                showStatusInCard={false}
                licenseKeyStorageKey={PROMT_AI_LICENSE_KEY_STORAGE}
                onLicenseKeyChange={setPromptAiLicenseKey}
                onChange={setPromptAiLicenseState}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setTab("imgtotext")}
            className={themeTabButtonClasses(tab === "imgtotext", "bg-emerald-500 text-slate-950")}
          >
            Image to Text
          </button>
          <button
            onClick={() => setTab("texttoimg")}
            className={themeTabButtonClasses(tab === "texttoimg", "bg-cyan-500 text-slate-950")}
          >
            Text to Image
          </button>
          <button
            onClick={() => setTab("texttostory")}
            className={themeTabButtonClasses(tab === "texttostory", "bg-purple-500 text-slate-950")}
          >
            Text to Story
          </button>
          <button
            onClick={() => setTab("texttoscene")}
            className={themeTabButtonClasses(tab === "texttoscene", "bg-indigo-500 text-slate-950")}
          >
            Story to Scene
          </button>
          <button
            onClick={() => setTab("generateflow")}
            className={themeTabButtonClasses(tab === "generateflow", "bg-amber-400 text-slate-950")}
          >
            Flow Queue
          </button>
          <span
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
              promptAiUnlocked
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {promptAiUnlocked ? "Prompt AI unlocked" : "License required for all Prompt AI tools"}
          </span>
        </div>

        <div className={`${themeContentFrameClass} relative overflow-hidden`}>
          <div
            className={`transition ${
              promptAiUnlocked ? "" : "pointer-events-none select-none blur-[3px] opacity-40"
            }`}
          >
            <div className={tab === "imgtotext" ? "block" : "hidden"}>
              <ImgToTextPage />
            </div>
            <div className={tab === "texttoimg" ? "block" : "hidden"}>
              <TextToImgPage />
            </div>
            <div className={tab === "texttostory" ? "block" : "hidden"}>
              <TextToStoryPage />
            </div>
            <div className={tab === "texttoscene" ? "block" : "hidden"}>
              <StoryToScenePage />
            </div>
            <div className={tab === "generateflow" ? "block" : "hidden"}>
              <FlowWorkerPage
                sharedToolSlug={resolvedToolSlug}
                sharedLicenseKey={promptAiLicenseKey}
                lockToolSlug
                lockLicenseKey
              />
            </div>
          </div>

          {!promptAiUnlocked ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 p-6 backdrop-blur-sm dark:bg-slate-950/75">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3a4 4 0 0 0-4 4v3H7a2 2 0 0 0-2 2v7h14v-7a2 2 0 0 0-2-2h-1V7a4 4 0 0 0-4-4Z" />
                    <path d="M9 10V7a3 3 0 1 1 6 0v3" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Prompt AI Locked</h3>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Activate the Prompt AI license above to use Image to Text, Text to Image, Text to Story,
                  Story to Scene, and Flow Queue.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ThemeLightAndDark>
  );
}

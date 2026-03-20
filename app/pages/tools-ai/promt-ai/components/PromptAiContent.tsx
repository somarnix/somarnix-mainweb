"use client";

import FlowWorkerPage from "../generateflow-ai/FlowWorkerPage";
import ImgToTextPage from "../imgtotext/page";
import TextToImgPage from "../texttoimg/page";
import StoryToScenePage from "../texttoscene/page";
import TextToStoryPage from "../texttostory/page";
import type { PromtAiTab } from "@/app/components/promt/types";

export default function PromptAiContent({
  tab,
  promptAiUnlocked,
  resolvedToolSlug,
  promptAiLicenseKey,
}: {
  tab: PromtAiTab;
  promptAiUnlocked: boolean;
  resolvedToolSlug: string;
  promptAiLicenseKey: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
  );
}

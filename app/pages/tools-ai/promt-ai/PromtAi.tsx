// gstechedukh\app\pages\tools-ai\promt-ai\PromtAi.tsx
"use client";

import { useEffect, useState } from "react";
import ImgToTextPage from "./imgtotext/page";
import TextToImgPage from "./texttoimg/page";
import TextToStoryPage from "./texttostory/page";
import StoryToScenePage from "./texttoscene/page";
import type { PromtAiTab } from "@/app/components/promt/types";

const STORAGE_KEY = "promt-ai-tab";

export default function PromtAiPage() {
  const [tab, setTab] = useState<PromtAiTab>("imgtotext");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as PromtAiTab | null;
    if (saved) setTab(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, tab);
  }, [tab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Prompt AI Tools
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            Image to Text • Text to Image • Text to Story • Story to Scene
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Switch between tools without leaving this page.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setTab("imgtotext")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              tab === "imgtotext"
                ? "bg-emerald-500 text-slate-950"
                : "border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-emerald-400"
            }`}
          >
            Image to Text
          </button>
          <button
            onClick={() => setTab("texttoimg")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              tab === "texttoimg"
                ? "bg-cyan-500 text-slate-950"
                : "border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-cyan-400"
            }`}
          >
            Text to Image
          </button>
          <button
            onClick={() => setTab("texttostory")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              tab === "texttostory"
                ? "bg-purple-500 text-slate-950"
                : "border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-purple-400"
            }`}
          >
            Text to Story
          </button>
          <button
            onClick={() => setTab("texttoscene")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              tab === "texttoscene"
                ? "bg-indigo-500 text-slate-950"
                : "border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-indigo-400"
            }`}
          >
            Story to Scene
          </button>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl">
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
        </div>
      </div>
    </div>
  );
}

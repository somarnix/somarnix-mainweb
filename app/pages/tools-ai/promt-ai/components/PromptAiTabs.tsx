"use client";

import type { PromtAiTab } from "@/app/components/promt/types";

const TAB_CONFIG: Array<{
  key: PromtAiTab;
  label: string;
  activeClassName: string;
}> = [
  { key: "imgtotext", label: "Image to Text", activeClassName: "bg-emerald-500 text-slate-950" },
  { key: "texttoimg", label: "Text to Image", activeClassName: "bg-cyan-500 text-slate-950" },
  { key: "texttostory", label: "Text to Story", activeClassName: "bg-purple-500 text-slate-950" },
  { key: "texttoscene", label: "Story to Scene", activeClassName: "bg-indigo-500 text-slate-950" },
  { key: "generateflow", label: "Flow Queue", activeClassName: "bg-amber-400 text-slate-950" },
];

export default function PromptAiTabs({
  tab,
  onTabChange,
  promptAiUnlocked,
}: {
  tab: PromtAiTab;
  onTabChange: (tab: PromtAiTab) => void;
  promptAiUnlocked: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {TAB_CONFIG.map(({ key, label, activeClassName }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === key
              ? activeClassName
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          {label}
        </button>
      ))}
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
  );
}

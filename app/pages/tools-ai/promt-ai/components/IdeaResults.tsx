// gstechedukh/app/pages/tools-ai/promt-ai/components/IdeaResults.tsx
"use client";

import type { StoryIdea } from "@/app/components/promt/types";

type IdeaResultsProps = {
  ideas: StoryIdea[];
};

export default function IdeaResults({ ideas }: IdeaResultsProps) {
  if (ideas.length === 0) return null;

  return (
    <div className="space-y-3 text-sm text-slate-200">
      {ideas.slice(0, 10).map((scene, idx) => (
        <div
          key={`${scene.title}-${idx}`}
          className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Story title
          </p>
          <p className="mt-2 text-sm font-semibold text-white">{scene.title}</p>
          <p className="mt-1 text-xs text-slate-300">{scene.detail}</p>
        </div>
      ))}
    </div>
  );
}

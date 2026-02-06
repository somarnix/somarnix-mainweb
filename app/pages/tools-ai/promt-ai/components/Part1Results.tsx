// gstechedukh/app/pages/tools-ai/promt-ai/components/Part1Results.tsx
"use client";

import type { HelpAnimalIdea } from "@/app/components/promt/helpAnimal";

type Part1ResultsProps = {
  ideas: HelpAnimalIdea[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
};

export default function Part1Results({
  ideas,
  selectedIndex,
  onSelect,
}: Part1ResultsProps) {
  if (ideas.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        PART 1 - Expanded Story Concept
      </p>
      <div className="mt-3 space-y-2">
        {ideas.map((idea, idx) => (
          <button
            key={`${idea.title}-${idx}`}
            onClick={() => onSelect(idx)}
            className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
              selectedIndex === idx
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-400"
            }`}
          >
            <span className="font-semibold">
              {idx + 1}. {idea.title}
            </span>
            <span className="block text-xs text-slate-300">
              {idea.one_line}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Continue with this improved idea for Part 2.
      </p>
    </div>
  );
}

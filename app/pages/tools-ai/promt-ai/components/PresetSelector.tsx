// gstechedukh/app/pages/tools-ai/promt-ai/components/PresetSelector.tsx
"use client";

import type { StoryPreset } from "@/app/components/storyPresets";

type Preset = { key: StoryPreset; label: string };

type PresetSelectorProps = {
  presets: Preset[];
  selected: StoryPreset;
  onSelect: (preset: StoryPreset) => void;
};

export default function PresetSelector({
  presets,
  selected,
  onSelect,
}: PresetSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <button
          key={preset.key}
          onClick={() => onSelect(preset.key)}
          className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${
            selected === preset.key
              ? "bg-slate-100 text-slate-900"
              : "border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-400"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

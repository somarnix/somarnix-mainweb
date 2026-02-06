// gstechedukh/app/pages/tools-ai/promt-ai/components/Part2AutoDesign.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { HelpAnimalIdea } from "@/app/components/promt/helpAnimal";
import { Pagination } from "@/app/components/Pagination";

type Part2AutoDesignProps = {
  selectedIndex: number | null;
  ideas: HelpAnimalIdea[];
  sceneCount: number;
  onSceneCountChange: (value: number) => void;
  lockAssetsOnly: boolean;
  onLockAssetsOnlyChange: (value: boolean) => void;
  autoAddNewAssets: boolean;
  onAutoAddNewAssetsChange: (value: boolean) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  loading: boolean;
  autoDesignText: string;
  batchStart: number;
  batchEnd: number;
  isFinished: boolean;
  generatedCount: number;
  onAddLocations: () => void;
  onAddHazards: () => void;
  onAddCharacters: () => void;
  onAddObjects: () => void;
  onAddScenes: () => void;
};

export default function Part2AutoDesign({
  selectedIndex,
  ideas,
  sceneCount,
  onSceneCountChange,
  lockAssetsOnly,
  onLockAssetsOnlyChange,
  autoAddNewAssets,
  onAutoAddNewAssetsChange,
  onGenerate,
  onRegenerate,
  loading,
  autoDesignText,
  batchStart,
  batchEnd,
  isFinished,
  generatedCount,
  onAddLocations,
  onAddHazards,
  onAddCharacters,
  onAddObjects,
  onAddScenes,
}: Part2AutoDesignProps) {
  if (selectedIndex === null) return null;
  const selected = ideas[selectedIndex];
  const [scenePage, setScenePage] = useState(1);
  const scenesPerPage = 10;

  const sceneLines = useMemo(() => {
    if (!autoDesignText) return [];
    const lines = autoDesignText.split(/\r?\n/);
    const startIndex = lines.findIndex((line) =>
      /SCENE LIST/i.test(line.replace(/\*\*/g, ""))
    );
    if (startIndex === -1) return [];
    const section = lines.slice(startIndex + 1);
    const items = section.filter((line) =>
      line.trim().match(/^(?:[-*•]\s*)?Scene\s*\d+/i)
    );
    const trimmed = items.map((line) => line.trim());
    return trimmed;
  }, [autoDesignText, sceneCount]);

  useEffect(() => {
    setScenePage(1);
  }, [autoDesignText]);

  const cleanAutoDesignText = useMemo(() => {
    if (!autoDesignText) return "";
    const lines = autoDesignText.split(/\r?\n/);
    const startIndex = lines.findIndex((line) =>
      /SCENE LIST/i.test(line.replace(/\*\*/g, ""))
    );
    if (startIndex === -1) return autoDesignText.trim();
    return lines.slice(0, startIndex).join("\n").trim();
  }, [autoDesignText]);

  const totalPages = Math.ceil(sceneLines.length / scenesPerPage);
  const pagedLines = sceneLines.slice(
    (scenePage - 1) * scenesPerPage,
    scenePage * scenesPerPage
  );

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          PART 2 — Scene Count
        </p>
        <p className="mt-2 text-xs text-slate-300">
          You selected idea #{selectedIndex + 1}:{" "}
          <span className="font-semibold text-white">{selected?.title}</span>
        </p>
        <label className="mt-3 block text-xs uppercase tracking-[0.2em] text-slate-400">
          How many scenes should this movie have?
        </label>
        <select
          value={sceneCount}
          onChange={(e) => onSceneCountChange(Number(e.target.value))}
          className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
        >
          {[20, 40, 60, 80, 100].map((count) => (
            <option key={count} value={count}>
              {count} scenes
            </option>
          ))}
        </select>
        <p className="mt-3 text-xs text-slate-300">
          Lock input assets only:{" "}
          <span className="font-semibold text-emerald-100">
            {lockAssetsOnly ? "ON" : "OFF"}
          </span>
        </p>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={autoAddNewAssets}
            onChange={(e) => onAutoAddNewAssetsChange(e.target.checked)}
            disabled={lockAssetsOnly}
            className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-emerald-400 disabled:opacity-40"
          />
          Auto-add NEW assets from auto-design
        </label>
        {!isFinished && (
          <button
            onClick={onGenerate}
            disabled={loading}
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading
              ? "Designing..."
              : autoDesignText
              ? `Generate Next Batch (Scenes ${batchStart}-${batchEnd})`
              : `Generate auto movie design (Scenes ${batchStart}-${batchEnd})`}
          </button>
        )}
        {autoDesignText && !loading && (
          <button
            onClick={onRegenerate}
            className="mt-2 w-full rounded-2xl border border-red-400/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20"
          >
            Regenerate Last Batch
          </button>
        )}
        {autoDesignText && (
          <p className="mt-2 text-xs text-slate-300">
            Generated {Math.min(generatedCount, sceneCount)} of {sceneCount} scenes.
            {isFinished ? " (Complete!)" : " Click Next to continue."}
          </p>
        )}
      </div>

      {autoDesignText && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-200 whitespace-pre-wrap">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={onAddLocations}
              disabled={lockAssetsOnly}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
            >
              Add locations to list
            </button>
            <button
              onClick={onAddHazards}
              disabled={lockAssetsOnly}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
            >
              Add hazards to list
            </button>
            <button
              onClick={onAddCharacters}
              disabled={lockAssetsOnly}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
            >
              Add characters to list
            </button>
            <button
              onClick={onAddObjects}
              disabled={lockAssetsOnly}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
            >
              Add objects to list
            </button>
            <button
              onClick={onAddScenes}
              disabled={lockAssetsOnly}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
            >
              Add scenes to list
            </button>
          </div>
          {lockAssetsOnly && (
            <p className="mb-3 text-[11px] text-slate-400">
              Lock enabled: auto-design should not introduce new assets.
            </p>
          )}
          {cleanAutoDesignText}
          {sceneLines.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Scene list (paged)
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Showing {sceneLines.length} of {sceneCount} scenes
                {sceneLines.length < sceneCount ? " (short by model)" : ""}
              </p>
              <div className="mt-2 space-y-1">
                {pagedLines.map((line, idx) => (
                  <p key={`${line}-${idx}`}>{line}</p>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-3">
                  <Pagination
                    currentPage={scenePage}
                    totalPages={totalPages}
                    onPageChange={setScenePage}
                    className="border-slate-800 bg-slate-950/80 text-slate-300"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

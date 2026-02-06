// gstechedukh/app/pages/tools-ai/promt-ai/components/HelpAnimalPanel.tsx
"use client";

import type { HelpAnimalIdea } from "@/app/components/promt/helpAnimal";
import Part1Results from "./Part1Results";
import Part2AutoDesign from "./Part2AutoDesign";

type HelpAnimalPanelProps = {
  ideas: HelpAnimalIdea[];
  selectedIndex: number | null;
  onSelectIdea: (index: number) => void;
  sceneCount: number;
  onSceneCountChange: (value: number) => void;
  lockAssetsOnly: boolean;
  onLockAssetsOnlyChange: (value: boolean) => void;
  autoAddNewAssets: boolean;
  onAutoAddNewAssetsChange: (value: boolean) => void;
  onGenerateAutoDesign: () => void;
  onRegenerateAutoDesign: () => void;
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

export default function HelpAnimalPanel({
  ideas,
  selectedIndex,
  onSelectIdea,
  sceneCount,
  onSceneCountChange,
  lockAssetsOnly,
  onLockAssetsOnlyChange,
  autoAddNewAssets,
  onAutoAddNewAssetsChange,
  onGenerateAutoDesign,
  onRegenerateAutoDesign,
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
}: HelpAnimalPanelProps) {
  return (
    <div className="space-y-3 text-sm text-slate-200">
      <Part1Results
        ideas={ideas}
        selectedIndex={selectedIndex}
        onSelect={onSelectIdea}
      />
      <Part2AutoDesign
        selectedIndex={selectedIndex}
        ideas={ideas}
        sceneCount={sceneCount}
        onSceneCountChange={onSceneCountChange}
        lockAssetsOnly={lockAssetsOnly}
        onLockAssetsOnlyChange={onLockAssetsOnlyChange}
        autoAddNewAssets={autoAddNewAssets}
        onAutoAddNewAssetsChange={onAutoAddNewAssetsChange}
        onGenerate={onGenerateAutoDesign}
        onRegenerate={onRegenerateAutoDesign}
        loading={loading}
        autoDesignText={autoDesignText}
        batchStart={batchStart}
        batchEnd={batchEnd}
        isFinished={isFinished}
        generatedCount={generatedCount}
        onAddLocations={onAddLocations}
        onAddHazards={onAddHazards}
        onAddCharacters={onAddCharacters}
        onAddObjects={onAddObjects}
        onAddScenes={onAddScenes}
      />
    </div>
  );
}

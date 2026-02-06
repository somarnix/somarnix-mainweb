// gstechedukh/app/pages/tools-ai/promt-ai/components/AssetEditor.tsx
"use client";

import type {
  CharacterDraft,
  HazardDraft,
  LocationDraft,
  ObjectDraft,
} from "@/app/components/promt/types";
import CharacterList from "./CharacterList";
import GenericAssetList from "./GenericAssetList";
import { Pagination } from "@/app/components/Pagination";

type AssetEditorProps = {
  characters: CharacterDraft[];
  objects: ObjectDraft[];
  locations: LocationDraft[];
  hazards: HazardDraft[];
  scenes: { title: string; summary: string }[];
  storyEditIndex: number | null;
  onToggleEdit: (index: number | null) => void;
  onRemoveCharacter: (index: number) => void;
  onChangeCharacter: (
    index: number,
    field: keyof CharacterDraft,
    value: string
  ) => void;
  onAddCharacter: () => void;
  onCopyCharacters: () => void;
  onCopyAll: () => void;
  pasteCharacterDraft: string;
  onPasteCharacterDraftChange: (value: string) => void;
  onPasteCharacter: () => void;
  copyStatus: string;
  genderOptions: string[];
  typeGenderOptions: string[];
  sizeOptions: string[];
  ageOptionGroups: { label: string; options: string[] }[];
  onAddObject: () => void;
  onCopyObjects: () => void;
  onChangeObject: (index: number, field: "name" | "details", value: string) => void;
  onRemoveObject: (index: number) => void;
  pasteObjectDraft: string;
  onPasteObjectDraftChange: (value: string) => void;
  onPasteObject: () => void;
  onAddLocation: () => void;
  onCopyLocations: () => void;
  onChangeLocation: (
    index: number,
    field: "name" | "details",
    value: string
  ) => void;
  onRemoveLocation: (index: number) => void;
  onAddHazard: () => void;
  onCopyHazards: () => void;
  onChangeHazard: (
    index: number,
    field: "name" | "details",
    value: string
  ) => void;
  onRemoveHazard: (index: number) => void;
  onAddScene: () => void;
  onCopyScenes: () => void;
  onChangeScene: (
    index: number,
    field: "title" | "summary",
    value: string
  ) => void;
  onRemoveScene: (index: number) => void;
  scenePage: number;
  scenesPerPage: number;
  onScenePageChange: (page: number) => void;
};

export default function AssetEditor({
  characters,
  objects,
  locations,
  hazards,
  scenes,
  storyEditIndex,
  onToggleEdit,
  onRemoveCharacter,
  onChangeCharacter,
  onAddCharacter,
  onCopyCharacters,
  onCopyAll,
  pasteCharacterDraft,
  onPasteCharacterDraftChange,
  onPasteCharacter,
  copyStatus,
  genderOptions,
  typeGenderOptions,
  sizeOptions,
  ageOptionGroups,
  onAddObject,
  onCopyObjects,
  onChangeObject,
  onRemoveObject,
  pasteObjectDraft,
  onPasteObjectDraftChange,
  onPasteObject,
  onAddLocation,
  onCopyLocations,
  onChangeLocation,
  onRemoveLocation,
  onAddHazard,
  onCopyHazards,
  onChangeHazard,
  onRemoveHazard,
  onAddScene,
  onCopyScenes,
  onChangeScene,
  onRemoveScene,
  scenePage,
  scenesPerPage,
  onScenePageChange,
}: AssetEditorProps) {
  const totalScenePages = Math.ceil(scenes.length / scenesPerPage);
  const pagedScenes = scenes.slice(
    (scenePage - 1) * scenesPerPage,
    scenePage * scenesPerPage
  );
  return (
    <>
      <CharacterList
        characters={characters}
        editIndex={storyEditIndex}
        onToggleEdit={onToggleEdit}
        onRemove={onRemoveCharacter}
        onChange={onChangeCharacter}
        onAdd={onAddCharacter}
        onCopy={onCopyCharacters}
        onCopyAll={onCopyAll}
        pasteDraft={pasteCharacterDraft}
        onPasteDraftChange={onPasteCharacterDraftChange}
        onPaste={onPasteCharacter}
        copyStatus={copyStatus}
        genderOptions={genderOptions}
        typeGenderOptions={typeGenderOptions}
        sizeOptions={sizeOptions}
        ageOptionGroups={ageOptionGroups}
      />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Objects
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyObjects}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
          >
            Copy objects
          </button>
          <button
            onClick={onAddObject}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
          >
            Add object
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">Paste object block to auto-fill</p>
        <textarea
          value={pasteObjectDraft}
          onChange={(e) => onPasteObjectDraftChange(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-100"
          placeholder={`Object 1\n\nName: Plate of spaghetti\n\nDescription: Plate of spaghetti with tomato sauce and cheese\n\nMaterial: food\n\nCondition: fresh\n\nColors: red, yellow, white, beige`}
        />
        <button
          onClick={onPasteObject}
          className="mt-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
        >
          Add from text
        </button>
      </div>

      <GenericAssetList<ObjectDraft>
        title="Objects"
        copyLabel="Copy objects"
        addLabel="Add object"
        emptyLabel="No objects yet."
        items={objects}
        getName={(item) => item.name}
        getDetails={(item) => item.details}
        onChangeName={(index, value) => onChangeObject(index, "name", value)}
        onChangeDetails={(index, value) =>
          onChangeObject(index, "details", value)
        }
        onRemove={onRemoveObject}
        onAdd={onAddObject}
        onCopy={onCopyObjects}
        namePlaceholder="Object name"
        detailsPlaceholder="Object details"
      />

      <GenericAssetList<LocationDraft>
        title="Locations"
        copyLabel="Copy locations"
        addLabel="Add location"
        emptyLabel="No locations yet."
        items={locations}
        getName={(item) => item.name}
        getDetails={(item) => item.details}
        onChangeName={(index, value) => onChangeLocation(index, "name", value)}
        onChangeDetails={(index, value) =>
          onChangeLocation(index, "details", value)
        }
        onRemove={onRemoveLocation}
        onAdd={onAddLocation}
        onCopy={onCopyLocations}
        namePlaceholder="Location name"
        detailsPlaceholder="Location details"
      />

      <GenericAssetList<HazardDraft>
        title="Hazards & Obstacles"
        copyLabel="Copy hazards"
        addLabel="Add hazard"
        emptyLabel="No hazards yet."
        items={hazards}
        getName={(item) => item.name}
        getDetails={(item) => item.details}
        onChangeName={(index, value) => onChangeHazard(index, "name", value)}
        onChangeDetails={(index, value) =>
          onChangeHazard(index, "details", value)
        }
        onRemove={onRemoveHazard}
        onAdd={onAddHazard}
        onCopy={onCopyHazards}
        namePlaceholder="Hazard name"
        detailsPlaceholder="Hazard details"
      />

      <GenericAssetList<{ title: string; summary: string }>
        title="Scene"
        copyLabel="Copy scenes"
        addLabel="Add Scene"
        emptyLabel="No scenes yet."
        items={pagedScenes}
        getName={(item) => item.title}
        getDetails={(item) => item.summary}
        onChangeName={(index, value) =>
          onChangeScene(
            (scenePage - 1) * scenesPerPage + index,
            "title",
            value
          )
        }
        onChangeDetails={(index, value) =>
          onChangeScene(
            (scenePage - 1) * scenesPerPage + index,
            "summary",
            value
          )
        }
        onRemove={(index) =>
          onRemoveScene((scenePage - 1) * scenesPerPage + index)
        }
        onAdd={onAddScene}
        onCopy={onCopyScenes}
        namePlaceholder="Scene name"
        detailsPlaceholder="Scene details"
      />

      {totalScenePages > 1 && (
        <div className="mt-3">
          <Pagination
            currentPage={scenePage}
            totalPages={totalScenePages}
            onPageChange={onScenePageChange}
            className="border-slate-800 bg-slate-950/80 text-slate-300"
          />
        </div>
      )}
    </>
  );
}

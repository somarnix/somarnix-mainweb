// gstechedukh/app/pages/tools-ai/promt-ai/components/CharacterList.tsx
"use client";

import type { CharacterDraft } from "@/app/components/promt/types";

type CharacterListProps = {
  characters: CharacterDraft[];
  editIndex: number | null;
  onToggleEdit: (index: number | null) => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: keyof CharacterDraft, value: string) => void;
  onAdd: () => void;
  onCopy: () => void;
  onCopyAll: () => void;
  pasteDraft: string;
  onPasteDraftChange: (value: string) => void;
  onPaste: () => void;
  copyStatus: string;
  genderOptions: string[];
  typeGenderOptions: string[];
  sizeOptions: string[];
  ageOptionGroups: { label: string; options: string[] }[];
};

export default function CharacterList({
  characters,
  editIndex,
  onToggleEdit,
  onRemove,
  onChange,
  onAdd,
  onCopy,
  onCopyAll,
  pasteDraft,
  onPasteDraftChange,
  onPaste,
  copyStatus,
  genderOptions,
  typeGenderOptions,
  sizeOptions,
  ageOptionGroups,
}: CharacterListProps) {
  return (
    <>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Characters
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyAll}
            className="rounded-full border border-emerald-400/60 px-3 py-1 text-xs text-emerald-200 hover:border-emerald-300"
          >
            Copy all
          </button>
          <button
            onClick={onCopy}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
          >
            Copy characters
          </button>
          <button
            onClick={onAdd}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
          >
            Add character
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">Paste character block to auto-fill</p>
        <textarea
          value={pasteDraft}
          onChange={(e) => onPasteDraftChange(e.target.value)}
          rows={5}
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-100"
          placeholder={`Character 3\n\nGender: unknown\n\nAge: child\n\nTypeGender: unknown\n\nSize: unknown\n\nRole: swimmer\n\nAppearance: white rabbit with long ears\n\nOutfit: purple swimsuit with light spots\n\nAccessories: pink swim cap, pink goggles, clear glasses\n\nExpression: smiling\n\nColors: white, purple, pink, grey`}
        />
        <button
          onClick={onPaste}
          className="mt-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
        >
          Add from text
        </button>
      </div>
      {copyStatus && (
        <p className="mt-2 text-xs text-slate-400">{copyStatus}</p>
      )}
      <div className="mt-3 space-y-3">
        {characters.length === 0 && (
          <p className="text-xs text-slate-400">No characters found yet.</p>
        )}
        {characters.map((char, idx) => (
          <div
            key={`${char.name}-${idx}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                Character {idx + 1}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggleEdit(editIndex === idx ? null : idx)}
                  className="text-xs text-slate-200 hover:text-white"
                >
                  {editIndex === idx ? "Done" : "Edit"}
                </button>
                <button
                  onClick={() => onRemove(idx)}
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
            </div>

            {editIndex === idx ? (
              <>
                <input
                  value={char.name}
                  onChange={(e) => onChange(idx, "name", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                  placeholder="Character name"
                />
                <textarea
                  value={char.appearance}
                  onChange={(e) => onChange(idx, "appearance", e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                  placeholder="Appearance / details"
                />
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <select
                    value={char.gender || "unknown"}
                    onChange={(e) => onChange(idx, "gender", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                  >
                    {genderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={char.typegender || "unknown"}
                    onChange={(e) => onChange(idx, "typegender", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                  >
                    {typeGenderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={char.size || "unknown"}
                    onChange={(e) => onChange(idx, "size", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                  >
                    {sizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={char.age || ""}
                    onChange={(e) => onChange(idx, "age", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="">Select age</option>
                    <option value="unknown">unknown</option>
                    {ageOptionGroups.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input
                    value={char.role || ""}
                    onChange={(e) => onChange(idx, "role", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                    placeholder="Role"
                  />
                  <input
                    value={char.outfit || ""}
                    onChange={(e) => onChange(idx, "outfit", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                    placeholder="Outfit"
                  />
                  <input
                    value={char.accessories || ""}
                    onChange={(e) => onChange(idx, "accessories", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                    placeholder="Accessories"
                  />
                  <input
                    value={char.expression || ""}
                    onChange={(e) => onChange(idx, "expression", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                    placeholder="Expression"
                  />
                  <input
                    value={char.colors || ""}
                    onChange={(e) => onChange(idx, "colors", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 md:col-span-2"
                    placeholder="Colors"
                  />
                </div>
              </>
            ) : (
              <div className="mt-2 grid gap-1 text-xs text-slate-300">
                <p>Name: {char.name || "unknown"}</p>
                {char.appearance && <p>Appearance: {char.appearance}</p>}
                {char.gender && <p>Gender: {char.gender}</p>}
                {char.age && <p>Age: {char.age}</p>}
                {char.typegender && <p>TypeGender: {char.typegender}</p>}
                {char.size && <p>Size: {char.size}</p>}
                {char.role && <p>Role: {char.role}</p>}
                {char.outfit && <p>Outfit: {char.outfit}</p>}
                {char.accessories && <p>Accessories: {char.accessories}</p>}
                {char.expression && <p>Expression: {char.expression}</p>}
                {char.colors && <p>Colors: {char.colors}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

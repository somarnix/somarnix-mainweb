// gstechedukh\app\pages\tools-ai\promt-ai\imgtotext\page.tsx
"use client";

import { useState } from "react";
import { GENDER_OPTIONS, TYPE_GENDER_OPTIONS } from "@/app/components/promt/types";
import { STORY_PRESETS, StoryPreset, getStoryPresetLabel } from "@/app/components/storyPresets";
import type { CharacterItem, ObjectItem, VisionModel } from "@/app/components/promt/types";
import { extractJsonPayload } from "@/app/components/promt/promptUtils";

export default function ImgToTextPage() {
  const [visionModel, setVisionModel] = useState<VisionModel>("4.1-mini");
  const [visionFile, setVisionFile] = useState<File | null>(null);
  const [visionUrl, setVisionUrl] = useState("");
  const [visionPrompt, setVisionPrompt] = useState("Describe this image.");
  const [visionResult, setVisionResult] = useState("");
  const [visionCharacters, setVisionCharacters] = useState<CharacterItem[]>([]);
  const [visionObjects, setVisionObjects] = useState<ObjectItem[]>([]);
  const [visionSummary, setVisionSummary] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [visionCharacterMode, setVisionCharacterMode] = useState(true);
  const [visionObjectMode, setVisionObjectMode] = useState(true);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState("");
  const [ideaPreset, setIdeaPreset] = useState<StoryPreset>("help-animal");
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [ideaError, setIdeaError] = useState("");
  const [ideaResults, setIdeaResults] = useState<{ title: string; story: string }[]>([]);

  const parseVisionJson = (text: string) => extractJsonPayload(text);
  const parseIdeaJson = (text: string) => extractJsonPayload(text);

  const handleVisionSubmit = async () => {
    setVisionError("");
    setVisionResult("");
    setVisionCharacters([]);
    setVisionObjects([]);
    setVisionSummary("");
    if (!visionFile && !visionUrl.trim()) {
      setVisionError("Choose an image file or paste an image URL.");
      return;
    }

    setVisionLoading(true);
    try {
      const fd = new FormData();
      if (visionFile) fd.append("image", visionFile);
      if (visionUrl.trim()) fd.append("imageUrl", visionUrl.trim());
      const basePrompt = visionPrompt || [
        "Analyze this image as a pivotal scene from a movie.",
        "1. VISUALS: Describe the characters and objects clearly.",
        "2. THE CAUSE (The 'Why'): Invent a specific reason for this situation. (Example: Did a tire blow out? Was there a chase? Did an animal cross the road?)",
        "3. THE CONTEXT: Explain what these characters were doing 5 minutes BEFORE this image.",
        "4. THE OUTCOME: Explain what happens NEXT.",
        "Combine this into a cohesive movie summary."
      ].join(" ");
      const characterInstruction = visionCharacterMode || visionObjectMode
        ? [
            "Return STRICT JSON only.",
            "Keys: character_count (number), object_count (number), summary (string), characters (array), objects (array).",
            "First count visible characters and set character_count.",
            "Then count visible objects (non-living, main items) and set object_count.",
            "List exactly that many characters and objects.",
            "Each character must include: name, gender, age_range, typegender, size, role, appearance, outfit, accessories, expression, colors.",
            "Each object must include: name, description, material, condition, colors.",
            "If no characters, set character_count = 0 and characters = [].",
            "If no objects, set object_count = 0 and objects = [].",
            "Use Character 1/2/3 if unknown. Use Object 1/2/3 if unknown.",
            "Do NOT guess details that are not clearly visible. If unsure, use \"unknown\".",
            "Do NOT add extra characters or objects.",
            "IMPORTANT: For each character/object, describe ONLY that item. Do NOT mention other characters or positions (left/right/center) in any field.",
          ].join(" ")
        : "";
      fd.append("prompt", `${basePrompt}${characterInstruction}`);
      fd.append("model", visionModel);

      const res = await fetch("/api/tools/openai/vision", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Vision request failed");
      }
      const text = String(data?.text || "");
      setVisionResult(text);
      if (visionCharacterMode || visionObjectMode) {
        const parsed = parseVisionJson(text);
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.summary === "string") {
            setVisionSummary(parsed.summary);
          }
          const scrub = (value: string) =>
            value
              .replace(/Character\s*\d+/gi, "another character")
              .replace(/Object\s*\d+/gi, "another object")
              .replace(/left|right|center|centre/gi, "unknown")
              .replace(/another character/gi, "another character")
              .replace(/another object/gi, "another object")
              .trim();
            const normalizeUnknown = (value: string) => {
              const cleaned = scrub(value).trim();
              if (!cleaned) return "";
              const lowered = cleaned.toLowerCase();

              // Keep "unknown" so UI shows it
              if (["n/a", "none", "not specified", "unspecified"].includes(lowered)) return "unknown";
              if (lowered === "unknown") return "unknown";

              return cleaned;
            };

          if (visionCharacterMode && Array.isArray(parsed.characters)) {
            const declaredCount =
              typeof parsed.character_count === "number" && parsed.character_count >= 0
                ? Math.floor(parsed.character_count)
                : parsed.characters.length;
            const genderSet = new Set(GENDER_OPTIONS.map((v) => v.toLowerCase()));
            const typeGenderSet = new Set(TYPE_GENDER_OPTIONS.map((v) => v.toLowerCase()));
            const speciesHints = new Set([
              "cat",
              "dog",
              "wolf",
              "fox",
              "rabbit",
              "bear",
              "lion",
              "tiger",
              "mouse",
              "rat",
              "bird",
              "eagle",
              "hawk",
              "owl",
              "horse",
              "cow",
              "goat",
              "sheep",
              "pig",
              "deer",
              "duck",
              "chicken",
              "fish",
              "shark",
              "whale",
              "dolphin",
              "otter",
              "seal",
              "monkey",
              "gorilla",
              "elephant",
              "giraffe",
              "zebra",
            ]);
            setVisionCharacters(
              parsed.characters
                .map((item: Record<string, unknown>, index: number) => {
                  // Gender (validated against allowed options)
                  const rawGender = normalizeUnknown(String(item?.gender || "unknown"));
                  const genderKey = rawGender.toLowerCase();
                  const gender = genderSet.has(genderKey) ? rawGender : "unknown";

                  // TypeGender (orientation OR animal species)
                  const rawTypeGender = normalizeUnknown(String(item?.typegender || ""));
                  const typeGenderKey = rawTypeGender.toLowerCase();
                  const typegender =
                    typeGenderSet.has(typeGenderKey) || speciesHints.has(typeGenderKey)
                      ? rawTypeGender
                      : "unknown";
                  // Role (infer from species if missing)
                  const rawRole = normalizeUnknown(String(item?.role || ""));
                  const inferredRole =
                    !rawRole && speciesHints.has(typeGenderKey) ? rawTypeGender : rawRole;

                  return {
                    name: String(item?.name || `Character ${index + 1}`),
                    description: normalizeUnknown(
                      String(item?.appearance || item?.description || "")
                    ),
                    gender, // ✅ validated gender
                    ageRange: normalizeUnknown(String(item?.age_range || "")),
                    typegender, // ✅ validated + used
                    size: normalizeUnknown(String(item?.size || "")),
                    role: inferredRole, // ✅ no unused vars
                    outfit: normalizeUnknown(String(item?.outfit || "")),
                    accessories: normalizeUnknown(String(item?.accessories || "")),
                    expression: normalizeUnknown(String(item?.expression || "")),
                    colors: normalizeUnknown(String(item?.colors || "")),
                  };
                })
                .filter((item: CharacterItem) => item.description.trim().length > 0)
                .slice(0, declaredCount)
            );
          }

          if (visionObjectMode && Array.isArray(parsed.objects)) {
            const declaredCount =
              typeof parsed.object_count === "number" && parsed.object_count >= 0
                ? Math.floor(parsed.object_count)
                : parsed.objects.length;
            setVisionObjects(
              parsed.objects
                .map((item: Record<string, unknown>, index: number) => ({
                  name: String(item?.name || `Object ${index + 1}`),
                  description: scrub(String(item?.description || "")),
                  material: scrub(String(item?.material || "")),
                  condition: scrub(String(item?.condition || "")),
                  colors: scrub(String(item?.colors || "")),
                }))
                .filter((item: ObjectItem) => item.description.trim().length > 0)
                .slice(0, declaredCount)
            );
          }
        }
      }
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : String(err));
    } finally {
      setVisionLoading(false);
    }
  };

  const handleCopyVision = async () => {
    const lines: string[] = [];
    if (visionSummary) {
      lines.push("Summary");
      lines.push(visionSummary);
      lines.push("");
    }
    if (visionObjects.length > 0) {
      lines.push("Objects");
      visionObjects.forEach((obj, idx) => {
        lines.push(`Object ${idx + 1}`);
        lines.push(`Name: ${obj.name}`);
        if (obj.description) lines.push(`Description: ${obj.description}`);
        if (obj.material) lines.push(`Material: ${obj.material}`);
        if (obj.condition) lines.push(`Condition: ${obj.condition}`);
        if (obj.colors) lines.push(`Colors: ${obj.colors}`);
        lines.push("");
      });
    }
    if (visionCharacters.length > 0) {
      lines.push("Characters");
      visionCharacters.forEach((char, idx) => {
        lines.push(`Character ${idx + 1}`);
        lines.push(`Name: ${char.name}`);
        if (char.gender) lines.push(`Gender: ${char.gender}`);
        if (char.ageRange) lines.push(`Age: ${char.ageRange}`);
        if (char.typegender) lines.push(`TypeGender: ${char.typegender}`);
        if (char.size) lines.push(`Size: ${char.size}`);
        if (char.role) lines.push(`Role: ${char.role}`);
        if (char.description) lines.push(`Appearance: ${char.description}`);
        if (char.outfit) lines.push(`Outfit: ${char.outfit}`);
        if (char.accessories) lines.push(`Accessories: ${char.accessories}`);
        if (char.expression) lines.push(`Expression: ${char.expression}`);
        if (char.colors) lines.push(`Colors: ${char.colors}`);
        lines.push("");
      });
    }

    const text = lines.join("\n").trim();
    if (!text) {
      setCopyStatus("Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied!");
    } catch {
      setCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setCopyStatus(""), 2000);
    }
  };

  const handleVisionReset = () => {
    setVisionFile(null);
    setVisionUrl("");
    setVisionPrompt("Describe this image.");
    setVisionResult("");
    setVisionCharacters([]);
    setVisionObjects([]);
    setVisionSummary("");
    setCopyStatus("");
    setVisionError("");
    setIdeaResults([]);
    setIdeaError("");
  };

  const handleGenerateIdeas = async () => {
    setIdeaError("");
    setIdeaResults([]);

    if (!visionSummary.trim()) {
      setIdeaError("Run Image to Text first to get a summary.");
      return;
    }

    // Build a compact "asset list" to prevent new stuff
    const characterList = visionCharacters
      .map((c) => `${c.name} (${c.typegender || "unknown"} | role: ${c.role || "unknown"})`)
      .join("; ");

    const objectList = visionObjects
      .map((o) => `${o.name}`)
      .join("; ");

    setIdeaLoading(true);
    try {
      const presetLabel = getStoryPresetLabel(ideaPreset);

      const isHelpAnimal = ideaPreset === "help-animal";
      const presetRule = isHelpAnimal
        ? "HELP ANIMAL RULE: Every idea MUST be a clear animal rescue/care story with danger, effort, and safe resolution."
        : `GENRE RULE: Follow the selected preset style: ${presetLabel}.`;

      const prompt = [
        "You are a movie idea generator.",
        `Preset: ${presetLabel}.`,
        presetRule,
        "",
        "CRITICAL RULES:",
        "- Use ONLY the provided summary + the provided character list + the provided object list.",
        "- DO NOT invent new characters, objects, locations, tools, mentors, or backstory.",
        "- Keep ideas grounded in the image context.",
        "",
        "OUTPUT STRICT JSON ONLY with this shape (no markdown):",
        '{ "ideas": [ { "title": "...", "story": "..." } ] }',
        "",
        "Generate exactly 5 ideas.",
        "Each story must be 2-4 sentences, clear and cinematic.",
        "",
        "Use ONLY the exact names provided in the CHARACTERS list.",
        "If a character has no name (e.g. 'Character 1'), refer to them by their Role (e.g. 'The Officer', 'The Dog').",
        "DO NOT invent names like Felix, Buddy, or Lyly.",
        "",
        "IMAGE SUMMARY:",
        visionSummary.trim(),
        "",
        "CHARACTERS (MUST USE ONLY THESE):",
        characterList || "(none)",
        "",
        "OBJECTS (MUST USE ONLY THESE):",
        objectList || "(none)",
      ].join("\n");

      const res = await fetch("/api/tools/gemini/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: "instant" }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Idea request failed");

      const text = String(data?.text || "");
      const parsed = parseIdeaJson(text);

      if (parsed && Array.isArray(parsed.ideas)) {
        setIdeaResults(
          parsed.ideas
            .map((item: Record<string, unknown>) => ({
              title: String(item?.title || "").trim(),
              story: String(item?.story || "").trim(),
            }))
            .filter((item: { title: string; story: string }) => item.title || item.story)
            .slice(0, 5)
        );
      } else {
        setIdeaError("No ideas returned.");
      }
    } catch (err) {
      setIdeaError(err instanceof Error ? err.message : String(err));
    } finally {
      setIdeaLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Image to Text
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            ChatGPT Vision Demo
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            Upload an image or paste a URL, then extract summary + characters + objects.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <div className="space-y-4 text-sm text-slate-200">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setVisionFile(e.target.files?.[0] || null)}
                className="mt-2 w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-emerald-200 hover:file:bg-emerald-500/20"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Or paste image URL
              </label>
              <input
                value={visionUrl}
                onChange={(e) => setVisionUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              />
              <p className="mt-2 text-xs text-slate-400">
                Public URLs work best. Private links may fail.
              </p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Prompt
              </label>
              <input
                value={visionPrompt}
                onChange={(e) => setVisionPrompt(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Movie Idea
              </label>
              <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto]">
                <select
                  value={ideaPreset}
                  onChange={(e) => setIdeaPreset(e.target.value as StoryPreset)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                >
                  {STORY_PRESETS.map((preset) => (
                    <option key={preset.key} value={preset.key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleGenerateIdeas}
                  disabled={ideaLoading}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {ideaLoading ? "Generating..." : "Generate 5 Movie Ideas"}
                </button>
              </div>
              {ideaError && (
                <p className="mt-2 text-xs text-rose-300">{ideaError}</p>
              )}
              {ideaResults.length > 0 && (
                <div className="mt-4 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100">
                  {ideaResults.map((idea, idx) => (
                    <div
                      key={`${idea.title}-${idx}`}
                      className="border-b border-slate-800 pb-4 last:border-none last:pb-0"
                    >
                      <p className="text-sm font-semibold text-white">
                        MOVIE IDEA {idx + 1} - {idea.title || "Untitled"}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                        {idea.story}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Model
              </label>
              <select
                value={visionModel}
                onChange={(e) => setVisionModel(e.target.value as VisionModel)}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              >
                <option value="4.1-mini">GPT-4.1 mini</option>
                <option value="4.1">GPT-4.1</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={visionCharacterMode}
                onChange={(e) => setVisionCharacterMode(e.target.checked)}
              />
              Extract characters (summary + character list)
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={visionObjectMode}
                onChange={(e) => setVisionObjectMode(e.target.checked)}
              />
              Extract objects (summary + object list)
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleVisionSubmit}
                disabled={visionLoading}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 disabled:opacity-50"
              >
                {visionLoading ? "Running Vision..." : "Run Vision"}
              </button>
              <button
                onClick={handleVisionReset}
                disabled={visionLoading}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-50"
              >
                New
              </button>
            </div>
            {visionError && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {visionError}
              </div>
            )}
            {visionSummary && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                    Summary
                  </p>
                  <button
                    onClick={handleCopyVision}
                    className="rounded-full border border-emerald-400/60 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/20"
                  >
                    Copy all
                  </button>
                </div>
                <p className="mt-2">{visionSummary}</p>
                {copyStatus && (
                  <p className="mt-2 text-xs text-emerald-200">{copyStatus}</p>
                )}
              </div>
            )}
            {visionObjects.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Objects
                </p>
                <div className="mt-3 space-y-3">
                  {visionObjects.map((obj, idx) => (
                    <div
                      key={`${obj.name}-${idx}`}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-white">{obj.name}</p>
                      <div className="mt-2 grid gap-1 text-xs text-slate-300">
                        {obj.description && <p>Description: {obj.description}</p>}
                        {obj.material && <p>Material: {obj.material}</p>}
                        {obj.condition && <p>Condition: {obj.condition}</p>}
                        {obj.colors && <p>Colors: {obj.colors}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {visionCharacters.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Characters
                </p>
                <div className="mt-3 space-y-3">
                  {visionCharacters.map((char, idx) => (
                    <div
                      key={`${char.name}-${idx}`}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-white">{char.name}</p>
                      <div className="mt-2 grid gap-1 text-xs text-slate-300">
                        {char.gender && <p>Gender: {char.gender}</p>}
                        {char.ageRange && <p>Age: {char.ageRange}</p>}
                        {char.typegender && <p>TypeGender: {char.typegender}</p>}
                        {char.size && <p>Size: {char.size}</p>}
                        {char.role && <p>Role: {char.role}</p>}
                        {char.description && <p>Appearance: {char.description}</p>}
                        {char.outfit && <p>Outfit: {char.outfit}</p>}
                        {char.accessories && <p>Accessories: {char.accessories}</p>}
                        {char.expression && <p>Expression: {char.expression}</p>}
                        {char.colors && <p>Colors: {char.colors}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {visionResult && !visionSummary && visionCharacters.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100">
                {visionResult}
              </div>
            )}
            {visionResult && visionSummary && (
              <details className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-300">
                <summary className="cursor-pointer text-sm text-slate-200">
                  Raw output
                </summary>
                <pre className="mt-2 whitespace-pre-wrap">{visionResult}</pre>
              </details>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

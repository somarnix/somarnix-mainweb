// gstechedukh\app\pages\tools-ai\promt-ai\texttostory\page.tsx
"use client";

import { useState } from "react";
import { STORY_PRESETS, StoryPreset, getStoryPresetLabel } from "@/app/components/storyPresets";
import type { CharacterDraft, HazardDraft, LocationDraft, ObjectDraft, StoryIdea } from "@/app/components/promt/types";
import {
  AGE_OPTION_GROUPS,
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  TYPE_GENDER_OPTIONS,
} from "@/app/components/promt/types";
import {
  buildHelpAnimalAutoDesignPrompt,
  buildHelpAnimalIdeaPrompt,
  HELP_ANIMAL_SYSTEM_PROMPT,
  type HelpAnimalIdea,
} from "@/app/components/promt/helpAnimal";
import {
  extractJsonPayload,
  parseNameDetailsLine,
  parseSingleCharacter,
  parseSingleObject,
} from "@/app/components/promt/promptUtils";
import PresetSelector from "@/app/pages/tools-ai/promt-ai/components/PresetSelector";
import PromptInput from "@/app/pages/tools-ai/promt-ai/components/PromptInput";
import SummaryEditor from "@/app/pages/tools-ai/promt-ai/components/SummaryEditor";
import AssetEditor from "@/app/pages/tools-ai/promt-ai/components/AssetEditor";
import HelpAnimalPanel from "@/app/pages/tools-ai/promt-ai/components/HelpAnimalPanel";
import IdeaResults from "@/app/pages/tools-ai/promt-ai/components/IdeaResults";


export default function TextToStoryPage() {
  const [storyPrompt, setStoryPrompt] = useState("");
  const [storySelected, setStorySelected] = useState<StoryPreset>("animation");
  const [storyResults, setStoryResults] = useState<StoryIdea[]>([]);
  const [storyMeta, setStoryMeta] = useState({
    summary: "",
    characters: [] as CharacterDraft[],
  });
  const [storySummaryDraft, setStorySummaryDraft] = useState("");
  const [storyIdeaDraft, setStoryIdeaDraft] = useState("");
  const [storyCharactersDraft, setStoryCharactersDraft] = useState<CharacterDraft[]>([]);
  const [storyObjectsDraft, setStoryObjectsDraft] = useState<ObjectDraft[]>([]);
  const [storyLocationsDraft, setStoryLocationsDraft] = useState<LocationDraft[]>([]);
  const [storyHazardsDraft, setStoryHazardsDraft] = useState<HazardDraft[]>([]);
  const [storyScenesDraft, setStoryScenesDraft] = useState<{ title: string; summary: string }[]>([]);
  const [scenePage, setScenePage] = useState(1);
  const scenesPerPage = 10;
  const [storyParsedOnce, setStoryParsedOnce] = useState(false);
  const [storyCopyStatus, setStoryCopyStatus] = useState("");
  const [storyEditIndex, setStoryEditIndex] = useState<number | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState("");
  const [pasteCharacterDraft, setPasteCharacterDraft] = useState("");
  const [pasteObjectDraft, setPasteObjectDraft] = useState("");
  const [helpIdeas, setHelpIdeas] = useState<HelpAnimalIdea[]>([]);
  const [helpSelectedIndex, setHelpSelectedIndex] = useState<number | null>(null);
  const [helpSceneCount, setHelpSceneCount] = useState(40);
  const [helpPart1SceneCount, setHelpPart1SceneCount] = useState(40);
  const [helpAutoDesign, setHelpAutoDesign] = useState("");
  const [helpAutoDesignBase, setHelpAutoDesignBase] = useState("");
  const [helpAutoDesignScenes, setHelpAutoDesignScenes] = useState<string[]>([]);
  const helpAutoDesignBatchSize = 15;
  const [helpLockAssetsOnly, setHelpLockAssetsOnly] = useState(false);
  const [helpAutoAddNewAssets, setHelpAutoAddNewAssets] = useState(false);


  const parseStoryInput = (text: string) => {
    const summaryPart =
      text.split(/^\s*(Characters|Objects|Locations|Hazards\s*&\s*Obstacles|Hazards)\s*$/im)[0] ||
      "";
    const summary = summaryPart.replace(/^\s*Summary\s*/i, "").trim() || "";
    const characterCountMatch = text.match(/Character\s*count\s*:\s*(\d+)/i);
    const declaredCount = characterCountMatch ? Number(characterCountMatch[1]) : null;
    const characterBlocks = text.split(/(?:^|\n)Character\s+\d+/i).slice(1);
    const characters = characterBlocks
      .map((block, idx) => {
        const nameMatch = block.match(/Name:\s*(.*)/i);
        const appearanceMatch = block.match(/Appearance:\s*(.*)/i);
        const genderMatch = block.match(/Gender:\s*(.*)/i);
        const ageMatch = block.match(/Age:\s*(.*)/i);
        const typegenderMatch = block.match(/TypeGender:\s*(.*)/i);
        const sizeMatch = block.match(/Size:\s*(.*)/i);
        const roleMatch = block.match(/Role:\s*(.*)/i);
        const outfitMatch = block.match(/Outfit:\s*(.*)/i);
        const accessoriesMatch = block.match(/Accessories:\s*(.*)/i);
        const expressionMatch = block.match(/Expression:\s*(.*)/i);
        const colorsMatch = block.match(/Colors:\s*(.*)/i);
        return {
          name: nameMatch?.[1]?.trim() || `Character ${idx + 1}`,
          appearance: appearanceMatch?.[1]?.trim() || "",
          gender: genderMatch?.[1]?.trim() || "",
          age: ageMatch?.[1]?.trim() || "",
          typegender: typegenderMatch?.[1]?.trim() || "",
          size: sizeMatch?.[1]?.trim() || "",
          role: roleMatch?.[1]?.trim() || "",
          outfit: outfitMatch?.[1]?.trim() || "",
          accessories: accessoriesMatch?.[1]?.trim() || "",
          expression: expressionMatch?.[1]?.trim() || "",
          colors: colorsMatch?.[1]?.trim() || "",
        };
      })
      .filter((char) => char.name || char.appearance);
    const inferredCount =
      declaredCount && declaredCount > 0
        ? declaredCount
        : text.match(/(?:^|\n)Character\s+\d+/gi)?.length || characters.length;
    const trimmed = characters.slice(0, inferredCount);

    const objectBlocks = text.split(/(?:^|\n)Object\s+\d+/i).slice(1);
    const objects = objectBlocks
      .map((block, idx) => {
        const nameMatch = block.match(/Name:\s*(.*)/i);
        const descriptionMatch = block.match(/Description:\s*(.*)/i);
        const materialMatch = block.match(/Material:\s*(.*)/i);
        const conditionMatch = block.match(/Condition:\s*(.*)/i);
        const colorsMatch = block.match(/Colors:\s*(.*)/i);
        const looseLines = block
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .filter(
            (line) =>
              !/^(name|description|material|condition|colors)\s*:/i.test(line)
          );
        const fallbackDescription =
          !descriptionMatch && looseLines.length > 0 ? looseLines[0] : "";
        const details = [
          descriptionMatch?.[1]?.trim()
            ? `Description: ${descriptionMatch[1].trim()}`
            : fallbackDescription
            ? `Description: ${fallbackDescription}`
            : "",
          materialMatch?.[1]?.trim() ? `Material: ${materialMatch[1].trim()}` : "",
          conditionMatch?.[1]?.trim() ? `Condition: ${conditionMatch[1].trim()}` : "",
          colorsMatch?.[1]?.trim() ? `Colors: ${colorsMatch[1].trim()}` : "",
        ]
          .filter(Boolean)
          .join(" | ");
        return {
          name: nameMatch?.[1]?.trim() || `Object ${idx + 1}`,
          details,
        };
      })
      .filter((obj) => obj.name || obj.details);

    const sectionStopRegex =
      /^\s*(\*\*)?\s*(Hazards\s*&\s*Obstacles|Hazards|Objects|Characters|Locations)\s*(\*\*)?\s*$/i;
    const trimBlockToSection = (block: string) => {
      const lines = block.split(/\r?\n/);
      const cutoff = lines.findIndex((line, idx) => {
        if (idx === 0) return false;
        const cleaned = line.replace(/\*\*/g, "").trim();
        return sectionStopRegex.test(cleaned);
      });
      return cutoff >= 0 ? lines.slice(0, cutoff).join("\n") : block;
    };

    const locationBlocks = text
      .split(/(?:^|\n)Location\s+\d+/i)
      .slice(1)
      .map((block) => trimBlockToSection(block));
    const locations = locationBlocks
      .map((block, idx) => {
        const nameMatch = block.match(/Name:\s*(.*)/i);
        const detailsMatch = block.match(/Details?:\s*(.*)/i);
        const looseLines = block
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .filter((line) => !/^(name|details?)\s*:/i.test(line));
        const fallbackLine = !detailsMatch && looseLines.length > 0 ? looseLines[0] : "";
        const parsedFallback = fallbackLine ? parseNameDetailsLine(fallbackLine) : null;
        const nameLine = nameMatch?.[1]?.trim() || parsedFallback?.name || "";
        const nextDetailLine =
          !detailsMatch && nameLine
            ? looseLines.find((line) => line !== fallbackLine && line !== nameLine) || ""
            : "";
        const name = nameLine || `Location ${idx + 1}`;
        const leftoverLines = looseLines.filter(
          (line) => line !== fallbackLine && line !== parsedFallback?.name
        );
        const details =
          detailsMatch?.[1]?.trim() ||
          parsedFallback?.details ||
          nextDetailLine ||
          (parsedFallback?.name ? "" : fallbackLine) ||
          leftoverLines.join(" ");
        return { name, details };
      })
      .filter((loc) => loc.name || loc.details);

    const hazardBlocks = text
      .split(/(?:^|\n)Hazard\s+\d+/i)
      .slice(1)
      .map((block) => trimBlockToSection(block));
    const hazards = hazardBlocks
      .map((block, idx) => {
        const nameMatch = block.match(/Name:\s*(.*)/i);
        const detailsMatch = block.match(/Details?:\s*(.*)/i);
        const looseLines = block
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .filter((line) => !/^(name|details?)\s*:/i.test(line));
        const fallbackLine = !detailsMatch && looseLines.length > 0 ? looseLines[0] : "";
        const parsedFallback = fallbackLine ? parseNameDetailsLine(fallbackLine) : null;
        const nameLine = nameMatch?.[1]?.trim() || parsedFallback?.name || "";
        const nextDetailLine =
          !detailsMatch && nameLine
            ? looseLines.find((line) => line !== fallbackLine && line !== nameLine) || ""
            : "";
        const name = nameLine || `Hazard ${idx + 1}`;
        const leftoverLines = looseLines.filter(
          (line) => line !== fallbackLine && line !== parsedFallback?.name
        );
        const details =
          detailsMatch?.[1]?.trim() ||
          parsedFallback?.details ||
          nextDetailLine ||
          (parsedFallback?.name ? "" : fallbackLine) ||
          leftoverLines.join(" ");
        return { name, details };
      })
      .filter((haz) => haz.name || haz.details);

    return { summary, characters: trimmed, objects, locations, hazards };
  };



  const parseStoryJson = (text: string) => extractJsonPayload(text);

  const parseStoryIdeasText = (text: string) => {
    const blocks = text.split(/(?:^|\n)\s*Story Title\s*:\s*/i).slice(1);
    if (blocks.length === 0) return [];
    return blocks.map((block, idx) => {
      const lines = block.trim().split("\n");
      const title = lines[0]?.trim() || `Idea ${idx + 1}`;
      const detail = lines.slice(1).join("\n").trim();
      return { title, detail };
    });
  };
  
  const normalizeHelpAnimalCharacters = (chars: CharacterDraft[]) => {
    // Helper to clean up "upunknown" artifacts from parsing
    const cleanValue = (value?: string) =>
      value ? value.replace(/\bupunknown\b/gi, "unknown").trim() : "";

    return chars.map((char, idx) => {
      // 1. Get the name the USER typed
      let rawName = cleanValue(char.name);

      // 2. If name is missing, empty, or literally "unknown", default to generic "Character X"
      // This prevents the code from injecting "Lyly", "Luna", or "Bob".
      if (!rawName || rawName.toLowerCase() === "unknown" || rawName.toLowerCase().startsWith("character")) {
        rawName = `Character ${idx + 1}`; 
      }

      // 3. Keep exactly what the user typed for everything else.
      // We do NOT guess species or roles anymore.
      return {
        ...char,
        name: rawName, 
        appearance: cleanValue(char.appearance),
        age: cleanValue(char.age),
        gender: cleanValue(char.gender),
        typegender: cleanValue(char.typegender),
        role: cleanValue(char.role),
        outfit: cleanValue(char.outfit),
        accessories: cleanValue(char.accessories),
        expression: cleanValue(char.expression),
        colors: cleanValue(char.colors),
      };
    });
  };

  const handleParseStory = () => {
    const parsed = parseStoryInput(storyPrompt);
    const characters =
      storySelected === "help-animal"
        ? normalizeHelpAnimalCharacters(parsed.characters)
        : parsed.characters;
    const mergeCharacters = (
      existing: CharacterDraft[],
      incoming: CharacterDraft[]
    ) => {
      if (existing.length === 0) return incoming;
      const keyFor = (char: CharacterDraft) =>
        `${char.name || ""}|${char.appearance || ""}`.toLowerCase();
      const existingKeys = new Set(existing.map(keyFor));
      const next = [...existing];
      incoming.forEach((char) => {
        const key = keyFor(char);
        if (!existingKeys.has(key)) {
          next.push(char);
          existingKeys.add(key);
        }
      });
      return next;
    };
    const mergeObjects = (existing: ObjectDraft[], incoming: ObjectDraft[]) => {
      if (existing.length === 0) return incoming;
      const keyFor = (obj: ObjectDraft) =>
        `${obj.name || ""}|${obj.details || ""}`.toLowerCase();
      const existingKeys = new Set(existing.map(keyFor));
      const next = [...existing];
      incoming.forEach((obj) => {
        const key = keyFor(obj);
        if (!existingKeys.has(key)) {
          next.push(obj);
          existingKeys.add(key);
        }
      });
      return next;
    };
    const mergeLocations = (existing: LocationDraft[], incoming: LocationDraft[]) => {
      if (existing.length === 0) return incoming;
      const keyFor = (loc: LocationDraft) =>
        `${loc.name || ""}|${loc.details || ""}`.toLowerCase();
      const existingKeys = new Set(existing.map(keyFor));
      const next = [...existing];
      incoming.forEach((loc) => {
        const key = keyFor(loc);
        if (!existingKeys.has(key)) {
          next.push(loc);
          existingKeys.add(key);
        }
      });
      return next;
    };
    const mergeHazards = (existing: HazardDraft[], incoming: HazardDraft[]) => {
      if (existing.length === 0) return incoming;
      const keyFor = (haz: HazardDraft) =>
        `${haz.name || ""}|${haz.details || ""}`.toLowerCase();
      const existingKeys = new Set(existing.map(keyFor));
      const next = [...existing];
      incoming.forEach((haz) => {
        const key = keyFor(haz);
        if (!existingKeys.has(key)) {
          next.push(haz);
          existingKeys.add(key);
        }
      });
      return next;
    };
    const mergedCharacters = mergeCharacters(storyCharactersDraft, characters);
    const mergedObjects = mergeObjects(storyObjectsDraft, parsed.objects);
    const mergedLocations = mergeLocations(storyLocationsDraft, parsed.locations);
    const mergedHazards = mergeHazards(storyHazardsDraft, parsed.hazards);
    setStoryMeta({ summary: parsed.summary, characters: mergedCharacters });
    if (parsed.summary) {
      setStorySummaryDraft(parsed.summary);
    }
    setStoryCharactersDraft(mergedCharacters);
    setStoryObjectsDraft(mergedObjects);
    setStoryLocationsDraft(mergedLocations);
    setStoryHazardsDraft(mergedHazards);
    setStoryParsedOnce(true);
  };

  const handleStoryCharacterChange = (
    index: number,
    field:
      | "name"
      | "appearance"
      | "gender"
      | "typegender"
      | "size"
      | "age"
      | "role"
      | "outfit"
      | "accessories"
      | "expression"
      | "colors",
    value: string
  ) => {
    setStoryCharactersDraft((prev) =>
      prev.map((char, idx) => (idx === index ? { ...char, [field]: value } : char))
    );
  };

  const handleAddStoryCharacter = () => {
    setStoryCharactersDraft((prev) => [
      ...prev,
      { name: `Character ${prev.length + 1}`, appearance: "" },
    ]);
  };

  const handlePasteCharacter = () => {
    if (!pasteCharacterDraft.trim()) return;
    const parsed = parseSingleCharacter(pasteCharacterDraft);
    const next =
      storySelected === "help-animal"
        ? normalizeHelpAnimalCharacters([parsed])[0]
        : parsed;
    setStoryCharactersDraft((prev) => [...prev, next]);
    setPasteCharacterDraft("");
  };

  const handleRemoveStoryCharacter = (index: number) => {
    setStoryCharactersDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddStoryObject = () => {
    setStoryObjectsDraft((prev) => [
      ...prev,
      { name: `Object ${prev.length + 1}`, details: "" },
    ]);
  };

  const handleRemoveStoryObject = (index: number) => {
    setStoryObjectsDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStoryObjectChange = (index: number, field: "name" | "details", value: string) => {
    setStoryObjectsDraft((prev) =>
      prev.map((obj, idx) => (idx === index ? { ...obj, [field]: value } : obj))
    );
  };

  const handleAddStoryLocation = () => {
    setStoryLocationsDraft((prev) => [
      ...prev,
      { name: `Location ${prev.length + 1}`, details: "" },
    ]);
  };

  const handleRemoveStoryLocation = (index: number) => {
    setStoryLocationsDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStoryLocationChange = (index: number, field: "name" | "details", value: string) => {
    setStoryLocationsDraft((prev) =>
      prev.map((loc, idx) => (idx === index ? { ...loc, [field]: value } : loc))
    );
  };

  const handleAddStoryHazard = () => {
    setStoryHazardsDraft((prev) => [
      ...prev,
      { name: `Hazard ${prev.length + 1}`, details: "" },
    ]);
  };

  const handleRemoveStoryHazard = (index: number) => {
    setStoryHazardsDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStoryHazardChange = (index: number, field: "name" | "details", value: string) => {
    setStoryHazardsDraft((prev) =>
      prev.map((hazard, idx) => (idx === index ? { ...hazard, [field]: value } : hazard))
    );
  };
// Add a new empty scene manually
  const handleAddStoryScene = () => {
    setStoryScenesDraft((prev) => [
      ...prev,
      { title: `Scene ${prev.length + 1}`, summary: "" },
    ]);
    setScenePage(1);
  };

  // Remove a scene from the list
  const handleRemoveStoryScene = (index: number) => {
    setStoryScenesDraft((prev) => prev.filter((_, idx) => idx !== index));
    setScenePage((prev) => Math.max(1, prev));
  };

  // Handle changes to scene fields
  const handleStorySceneChange = (index: number, field: "title" | "summary", value: string) => {
    setStoryScenesDraft((prev) =>
      prev.map((scene, idx) => (idx === index ? { ...scene, [field]: value } : scene))
    );
  };

  // Copy scenes to clipboard
  const handleCopyStoryScenes = async () => {
    const text = storyScenesDraft
      .map((s, idx) => `${s.title}: ${s.summary}`)
      .join("\n");
    
    if (!text) {
      setStoryCopyStatus("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStoryCopyStatus("Scenes Copied!");
    } catch {
      setStoryCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setStoryCopyStatus(""), 2000);
    }
  };

  const buildStoryResults = async () => {
    setStoryError("");
    setStoryResults([]);

    if (!storyIdeaDraft.trim()) {
      setStoryError("Please enter a story idea before generating.");
      return;
    }

    const characterLines = storyCharactersDraft
      .map((char, idx) => {
        const bits = [
          `Character ${idx + 1}: ${char.name || "Unknown"}`,
          char.appearance ? `Appearance: ${char.appearance}` : "",
          char.role ? `Role: ${char.role}` : "",
          char.gender ? `Gender: ${char.gender}` : "",
          char.age ? `Age: ${char.age}` : "",
          char.typegender ? `TypeGender: ${char.typegender}` : "",
          char.size ? `Size: ${char.size}` : "",
          char.outfit ? `Outfit: ${char.outfit}` : "",
          char.accessories ? `Accessories: ${char.accessories}` : "",
          char.expression ? `Expression: ${char.expression}` : "",
          char.colors ? `Colors: ${char.colors}` : "",
        ].filter(Boolean);
        return bits.join(" | ");
      })
      .join("\n");

    const objectLines = storyObjectsDraft
      .map((obj, idx) => {
        const bits = [
          `Object ${idx + 1}: ${obj.name || "Unknown"}`,
          obj.details || "",
        ].filter(Boolean);
        return bits.join(" | ");
      })
      .join("\n");

    const locationLines = storyLocationsDraft
      .map((loc, idx) => {
        const bits = [
          `Location ${idx + 1}: ${loc.name || "Unknown"}`,
          loc.details || "",
        ].filter(Boolean);
        return bits.join(" | ");
      })
      .join("\n");

    const hazardLines = storyHazardsDraft
      .map((haz, idx) => {
        const bits = [
          `Hazard ${idx + 1}: ${haz.name || "Unknown"}`,
          haz.details || "",
        ].filter(Boolean);
        return bits.join(" | ");
      })
      .join("\n");

    setStoryLoading(true);
    try {
      if (storySelected === "help-animal") {
        const basePrompt = buildHelpAnimalIdeaPrompt(
          storySummaryDraft.trim(),
          characterLines,
          objectLines,
          storyIdeaDraft.trim(),
          helpPart1SceneCount,
          helpLockAssetsOnly
        );

        const res = await fetch("/api/tools/gemini/story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "instant",
            count: 1,
            prompt: [HELP_ANIMAL_SYSTEM_PROMPT, basePrompt]
              .filter(Boolean)
              .join("\n\n"),
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Idea request failed");
        }

        const text = String(data?.text || "");
        const parsed = parseStoryJson(text);
        const ideas = Array.isArray(parsed?.ideas) ? parsed.ideas : [];
        const normalized = ideas
          .map((item: Record<string, unknown>) => ({
            title: String(item?.title || "").trim(),
            one_line: String(item?.one_line || "").trim(),
          }))
          .filter((item: { title: string; one_line: string }) => item.title || item.one_line)
          .slice(0, 1);

        if (normalized.length === 0) {
          throw new Error("No ideas returned.");
        }

        setHelpIdeas(normalized);
        setHelpSelectedIndex(0);
        setHelpAutoDesign("");
        setHelpAutoDesignBase("");
        setHelpAutoDesignScenes([]);
        setStoryResults([]);
        return;
      }

      const presetLabel = getStoryPresetLabel(storySelected);
      const prompt = [
        "You are a movie idea generator.",
        `Preset: ${presetLabel}.`,
        "",
        "CRITICAL RULES:",
        "- Use ONLY the provided summary, story idea direction, and asset lists.",
        "- Do NOT invent new characters, objects, locations, or hazards.",
        "- Use ONLY the exact names provided in the CHARACTERS list.",
        "- If a character has no name, refer to them by their Role (e.g. 'The Officer').",
        "",
        "OUTPUT STRICT JSON ONLY with this shape (no markdown):",
        '{ "ideas": [ { "title": "...", "detail": "..." } ] }',
        "",
        "Generate exactly 5 ideas.",
        "Each detail must be 2-4 sentences, clear and cinematic.",
        "",
        "STORY IDEA DIRECTION:",
        storyIdeaDraft.trim(),
        "",
        "SUMMARY:",
        storySummaryDraft.trim() || "(none)",
        "",
        "CHARACTERS (ONLY THESE):",
        characterLines || "(none)",
        "",
        "OBJECTS (ONLY THESE):",
        objectLines || "(none)",
        "",
        "LOCATIONS (ONLY THESE):",
        locationLines || "(none)",
        "",
        "HAZARDS (ONLY THESE):",
        hazardLines || "(none)",
      ].join("\n");

      const res = await fetch("/api/tools/gemini/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: "instant" }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Idea request failed");
      }

      const text = String(data?.text || "");
      const parsed = parseStoryJson(text);
      let ideas: StoryIdea[] = [];
      if (parsed && Array.isArray(parsed.ideas)) {
        ideas = parsed.ideas
          .map((item: Record<string, unknown>) => ({
            title: String(item?.title || "").trim(),
            detail: String(item?.detail || item?.story || "").trim(),
          }))
          .filter((item) => item.title || item.detail)
          .slice(0, 5);
      } else {
        ideas = parseStoryIdeasText(text).slice(0, 5);
      }

      if (ideas.length === 0) {
        throw new Error("No ideas returned.");
      }

      setHelpIdeas([]);
      setHelpSelectedIndex(null);
      setStoryResults(ideas);
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : String(err));
    } finally {
      setStoryLoading(false);
    }
  };

  const handleResetStory = () => {
    setStoryPrompt("");
    setStorySelected("animation");
    setStoryResults([]);
    setStoryMeta({ summary: "", characters: [] });
    setStorySummaryDraft("");
    setStoryIdeaDraft("");
    setStoryCharactersDraft([]);
    setStoryObjectsDraft([]);
    setStoryLocationsDraft([]);
    setStoryHazardsDraft([]);
    setStoryScenesDraft([]);
    setScenePage(1);
    setStoryParsedOnce(false);
    setStoryCopyStatus("");
    setStoryEditIndex(null);
    setStoryError("");
    setPasteCharacterDraft("");
    setPasteObjectDraft("");
    setHelpIdeas([]);
    setHelpSelectedIndex(null);
    setHelpSceneCount(40);
    setHelpPart1SceneCount(40);
    setHelpAutoDesign("");
    setHelpAutoDesignBase("");
    setHelpAutoDesignScenes([]);
    setHelpLockAssetsOnly(false);
    setHelpAutoAddNewAssets(false);
  };

  const sliceHelpAutoDesignSection = (text: string, headingKey: string) => {
    const lines = text.split(/\r?\n/);

    const headingLower = headingKey.toLowerCase();

    // headings that start a section (any of these means "stop" if we are capturing)
    const sectionHeadingRegex =
      /(movie\s*concept|character\s*design|location\s*design|hazards?\s*&?\s*obstacles?|object\s*design)/i;

    const output: string[] = [];
    let capture = false;

    for (let i = 0; i < lines.length; i += 1) {
      const rawLine = lines[i];
      const line = rawLine.trim();
      if (!line) continue;

      if (!capture) {
        // start when current line contains the heading key (handles ## Character Design)
        if (line.toLowerCase().includes(headingLower)) {
          capture = true;
        }
        continue;
      }

      // once capturing, stop when we hit another section heading (but NOT the same one)
      const clean = line.replace(/^#+\s*/, "").trim(); // remove ### markers
      if (sectionHeadingRegex.test(clean) && !clean.toLowerCase().includes(headingLower)) {
        break;
      }

      output.push(rawLine);
    }

    return output;
  };

  // Helper function to remove leading bullets/numbers for cleaner parsing
  const cleanLineStart = (line: string) => line.replace(/^[-*•\d\.\)\s]+/, "").trim();

  const extractCharactersFromAutoDesign = (text: string) => {
      const lines = sliceHelpAutoDesignSection(text, "Character Design");
      const items: CharacterDraft[] = [];

      lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        const cleanNoStars = line.replace(/\*\*/g, "").trim();
        if (/^new\s*:\s*(none|null|n\/a)?$/i.test(cleanNoStars)) return;

        const normalized = cleanLineStart(line);
        const { name, details } = parseNameDetailsLine(normalized);

        const cleanName = (name || "")
          .replace(/\*\*/g, "")
          .replace(/^NEW\s*/i, "")
          .trim();

        const cleanDetails = (details || "").replace(/\*\*/g, "").trim();

        if (!cleanName) return;
        if (/^(new|none|null|n\/a)$/i.test(cleanName)) return;
        if (/^(none|null|n\/a)$/i.test(cleanDetails)) return;

        // --- NEW LOGIC START ---
        let role = "";
        let appearance = cleanDetails;

        // Split by "|" to separate Role from Appearance
        if (cleanDetails.includes("|")) {
          const parts = cleanDetails.split("|");
          role = parts[0].trim();
          appearance = parts.slice(1).join("|").trim();
        }
        // --- NEW LOGIC END ---

        // Push Role and Appearance to the draft object
        items.push({ 
          name: cleanName, 
          role: role, 
          appearance: appearance 
        });
      });

      return items;
  };

  const handleCopyStoryCharacters = async () => {
    const lines: string[] = [];
    if (storyCharactersDraft.length > 0) {
      lines.push("Characters");
      storyCharactersDraft.forEach((char, idx) => {
        lines.push(`Character ${idx + 1}`);
        lines.push(`Name: ${char.name}`);
        if (char.gender) lines.push(`Gender: ${char.gender}`);
        if (char.age) lines.push(`Age: ${char.age}`);
        if (char.typegender) lines.push(`TypeGender: ${char.typegender}`);
        if (char.size) lines.push(`Size: ${char.size}`);
        if (char.role) lines.push(`Role: ${char.role}`);
        if (char.appearance) lines.push(`Appearance: ${char.appearance}`);
        if (char.outfit) lines.push(`Outfit: ${char.outfit}`);
        if (char.accessories) lines.push(`Accessories: ${char.accessories}`);
        if (char.expression) lines.push(`Expression: ${char.expression}`);
        if (char.colors) lines.push(`Colors: ${char.colors}`);
        lines.push("");
      });
    }
    const text = lines.join("\n").trim();
    if (!text) {
      setStoryCopyStatus("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStoryCopyStatus("Copied!");
    } catch {
      setStoryCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setStoryCopyStatus(""), 2000);
    }
  };

  const handleAddCharactersFromAutoDesign = (sourceText: string | any = helpAutoDesign) => {
      if (helpLockAssetsOnly) return;
      
      // 1. Determine which text to use (argument string OR state string)
      const textToUse = typeof sourceText === "string" ? sourceText : helpAutoDesign;
      
      if (!textToUse.trim()) return;

      // 2. FIX: Pass 'textToUse' instead of 'sourceText'
      const items = extractCharactersFromAutoDesign(textToUse);
      
      if (items.length === 0) return;

      setStoryCharactersDraft((prev) => {
        const existing = new Set(prev.map((char) => (char.name || "").toLowerCase()));
        const next = [...prev];

        items.forEach((item) => {
          const name = (item.name || "").trim() || `Character ${next.length + 1}`;
          if (/^(new|none|null|n\/a)$/i.test(name)) return;

          if (!existing.has(name.toLowerCase())) {
            next.push({
              name,
              role: item.role || "",
              appearance: item.appearance || "",
            });
            existing.add(name.toLowerCase());
          }
        });

        return next;
      });
  };

  const extractObjectsFromAutoDesign = (text: string) => {
    const lines = sliceHelpAutoDesignSection(text, "Object Design");
    const items: ObjectDraft[] = [];

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      const normalized = cleanLineStart(line);
      const parsed = parseNameDetailsLine(normalized);

      const name = (parsed.name || "")
        .replace(/^NEW\s*/i, "")
        .replace(/\(.*\)/, "")
        .trim();

      const details = (parsed.details || "").trim();

      if (!name) return;
      if (/^(new|none|null|n\/a)$/i.test(name)) return;
      if (/^(none|null|n\/a)$/i.test(details)) return;

      items.push({ name, details });
    });

    return items;
  };

  const handleAddObjectsFromAutoDesign = (sourceText: string = helpAutoDesign) => {
    const textToUse = typeof sourceText === "string" ? sourceText : helpAutoDesign;
    if (!textToUse.trim()) return;
    const items = extractObjectsFromAutoDesign(textToUse);
    if (items.length === 0) return;
    setStoryObjectsDraft((prev) => {
      const existing = new Set(prev.map((obj) => obj.name.toLowerCase()));
      const next = [...prev];
      items.forEach((item) => {
        const name = item.name.trim() || `Object ${next.length + 1}`;
        if (!existing.has(name.toLowerCase())) {
          next.push({
            name,
            details: item.details || "",
          });
          existing.add(name.toLowerCase());
        }
      });
      return next;
    });
  };

  const handleCopyStoryObjects = async () => {
    const lines: string[] = [];
    if (storyObjectsDraft.length > 0) {
      lines.push("Objects");
      storyObjectsDraft.forEach((obj, idx) => {
        lines.push(`Object ${idx + 1}`);
        lines.push(`Name: ${obj.name}`);
        if (obj.details) lines.push(obj.details.replace(/\s*\|\s*/g, "\n"));
        lines.push("");
      });
    }
    const text = lines.join("\n").trim();
    if (!text) {
      setStoryCopyStatus("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStoryCopyStatus("Copied!");
    } catch {
      setStoryCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setStoryCopyStatus(""), 2000);
    }
  };

  const handleCopyAllAssets = async () => {
    const sections: string[] = [];
    if (storyCharactersDraft.length > 0) {
      sections.push("Characters");
      storyCharactersDraft.forEach((char, idx) => {
        sections.push(`Character ${idx + 1}`);
        sections.push(`Name: ${char.name || `Character ${idx + 1}`}`);
        if (char.gender) sections.push(`Gender: ${char.gender}`);
        if (char.age) sections.push(`Age: ${char.age}`);
        if (char.typegender) sections.push(`TypeGender: ${char.typegender}`);
        if (char.size) sections.push(`Size: ${char.size}`);
        if (char.role) sections.push(`Role: ${char.role}`);
        if (char.appearance) sections.push(`Appearance: ${char.appearance}`);
        if (char.outfit) sections.push(`Outfit: ${char.outfit}`);
        if (char.accessories) sections.push(`Accessories: ${char.accessories}`);
        if (char.expression) sections.push(`Expression: ${char.expression}`);
        if (char.colors) sections.push(`Colors: ${char.colors}`);
        sections.push("");
      });
    }
    if (storyObjectsDraft.length > 0) {
      sections.push("Objects");
      storyObjectsDraft.forEach((obj, idx) => {
        sections.push(`Object ${idx + 1}`);
        sections.push(`Name: ${obj.name || `Object ${idx + 1}`}`);
        if (obj.details) sections.push(obj.details.replace(/\s*\|\s*/g, "\n"));
        sections.push("");
      });
    }
    if (storyLocationsDraft.length > 0) {
      sections.push("Locations");
      storyLocationsDraft.forEach((loc, idx) => {
        sections.push(`Location ${idx + 1}`);
        sections.push(`Name: ${loc.name || `Location ${idx + 1}`}`);
        if (loc.details) sections.push(`Details: ${loc.details}`);
        sections.push("");
      });
    }
    if (storyHazardsDraft.length > 0) {
      sections.push("Hazards & Obstacles");
      storyHazardsDraft.forEach((haz, idx) => {
        sections.push(`Hazard ${idx + 1}`);
        sections.push(`Name: ${haz.name || `Hazard ${idx + 1}`}`);
        if (haz.details) sections.push(`Details: ${haz.details}`);
        sections.push("");
      });
    }

    const text = sections.join("\n").trim();
    if (!text) {
      setStoryCopyStatus("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStoryCopyStatus("Copied!");
    } catch {
      setStoryCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setStoryCopyStatus(""), 2000);
    }
  };

  const handlePasteObject = () => {
    if (!pasteObjectDraft.trim()) return;
    const parsed = parseSingleObject(pasteObjectDraft);
    setStoryObjectsDraft((prev) => [...prev, parsed]);
    setPasteObjectDraft("");
  };

  const extractLocationsFromAutoDesign = (text: string) => {
    const lines = sliceHelpAutoDesignSection(text, "LOCATION DESIGN");
    return lines
      .map((rawLine) => rawLine.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#")) // Permissive filter: just ensure it's not empty or a header
      .map((line) => {
        const normalized = cleanLineStart(line);
        const parsed = parseNameDetailsLine(normalized);
        return {
          name: parsed.name.replace(/^NEW\s*/i, "").trim(),
          details: parsed.details,
        };
      })
      .filter((item) => item.name);
  };

  const handleAddLocationsFromAutoDesign = (sourceText: string = helpAutoDesign) => {
    const textToUse = typeof sourceText === "string" ? sourceText : helpAutoDesign;
    if (!textToUse.trim()) return;
    const items = extractLocationsFromAutoDesign(textToUse);
    if (items.length === 0) return;
    setStoryLocationsDraft((prev) => {
      const existing = new Set(prev.map((loc) => loc.name.toLowerCase()));
      const next = [...prev];
      items.forEach((item) => {
        const name = item.name.replace(/^\*\*|\*\*$/g, "").trim();
        if (!existing.has(name.toLowerCase())) {
          next.push({ name, details: item.details || "" });
          existing.add(name.toLowerCase());
        }
      });
      return next;
    });
  };

  const handleCopyStoryLocations = async () => {
    const lines: string[] = [];
    if (storyLocationsDraft.length > 0) {
      lines.push("Locations");
      storyLocationsDraft.forEach((loc, idx) => {
        lines.push(`Location ${idx + 1}`);
        lines.push(`Name: ${loc.name}`);
        if (loc.details) lines.push(`Details: ${loc.details}`);
        lines.push("");
      });
    }
    const text = lines.join("\n").trim();
    if (!text) {
      setStoryCopyStatus("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStoryCopyStatus("Copied!");
    } catch {
      setStoryCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setStoryCopyStatus(""), 2000);
    }
  };

  const extractHazardsFromAutoDesign = (text: string) => {
    const lines = sliceHelpAutoDesignSection(text, "HAZARDS & OBSTACLES");
    return lines
      .map((rawLine) => rawLine.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#")) // Permissive filter
      .map((line) => {
        const normalized = cleanLineStart(line);
        const parsed = parseNameDetailsLine(normalized);
        return {
          name: parsed.name.replace(/^NEW\s*/i, "").trim(),
          details: parsed.details,
        };
      })
      .filter((item) => item.name);
  };

  const handleAddHazardsFromAutoDesign = (sourceText: string = helpAutoDesign) => {
    const textToUse = typeof sourceText === "string" ? sourceText : helpAutoDesign;
    if (!textToUse.trim()) return;
    const items = extractHazardsFromAutoDesign(textToUse);
    if (items.length === 0) return;
    setStoryHazardsDraft((prev) => {
      const existing = new Set(prev.map((haz) => haz.name.toLowerCase()));
      const next = [...prev];
      items.forEach((item) => {
        const name = item.name.replace(/^\*\*|\*\*$/g, "").trim();
        if (!existing.has(name.toLowerCase())) {
          next.push({ name, details: item.details || "" });
          existing.add(name.toLowerCase());
        }
      });
      return next;
    });
  };

  const handleCopyStoryHazards = async () => {
    const lines: string[] = [];
    if (storyHazardsDraft.length > 0) {
      lines.push("Hazards & Obstacles");
      storyHazardsDraft.forEach((haz, idx) => {
        lines.push(`Hazard ${idx + 1}`);
        lines.push(`Name: ${haz.name}`);
        if (haz.details) lines.push(`Details: ${haz.details}`);
        lines.push("");
      });
    }
    const text = lines.join("\n").trim();
    if (!text) {
      setStoryCopyStatus("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStoryCopyStatus("Copied!");
    } catch {
      setStoryCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setStoryCopyStatus(""), 2000);
    }
  };

  const extractScenesFromAutoDesign = (text: string) => {
    let lines = sliceHelpAutoDesignSection(text, "SCENE LIST");
    if (lines.length === 0) {
      lines = sliceHelpAutoDesignSection(text, "SCENES");
    }

    if (lines.length === 0) {
      const match = text.match(/(?:^|\n)\**Scenes:?\**\s*(?:\n|$)/i);
      if (match && match.index !== undefined) {
        const contentAfter = text.substring(match.index + match[0].length);
        lines = contentAfter.split(/\r?\n/);
      }
    }

    const scenes: { title: string; summary: string }[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const sceneMatch =
        trimmed.match(
          /^(?:[-*•]\s*)?(?:\*\*)?Scene\s+(\d+)(?:\*\*)?\s*[:\.\)\-\u2013\u2014]\s*(.*)/i
        ) ||
        trimmed.match(/^(?:[-*•]\s*)?Scene\s+(\d+)\s+(.*)/i);

      if (sceneMatch) {
        scenes.push({
          title: `Scene ${sceneMatch[1]}`,
          summary: sceneMatch[2].trim(),
        });
      } else if (scenes.length > 0) {
        // If a line doesn't have a number but we are in a scene list, 
        // append it to the previous scene (handles multiline scene descriptions)
        scenes[scenes.length - 1].summary += " " + trimmed;
      }
    });

    return scenes;
  };

  const handleAddScenesFromAutoDesign = (sourceText: string = helpAutoDesign) => {
    const textToUse = typeof sourceText === "string" ? sourceText : helpAutoDesign;
    if (!textToUse.trim()) return;
    const items = extractScenesFromAutoDesign(textToUse);
    if (items.length === 0) return;

    const targetCount = Math.max(0, helpSceneCount);
    const nextItems = [...items];
    if (targetCount > nextItems.length) {
      for (let i = nextItems.length; i < targetCount; i += 1) {
        nextItems.push({
          title: `Scene ${i + 1}`,
          summary: "",
        });
      }
    }

    setStoryScenesDraft((prev) => {
      const keyFor = (scene: { title: string; summary: string }) =>
        (scene.summary || scene.title).toLowerCase();
      const existingKeys = new Set(prev.map(keyFor));
      const next = [...prev];
      nextItems.forEach((item) => {
        const key = keyFor(item);
        if (!existingKeys.has(key)) {
          next.push(item);
          existingKeys.add(key);
        }
      });
      return next;
    });
    setScenePage(1);
    setStoryCopyStatus(`Added ${nextItems.length} scenes!`);
    setTimeout(() => setStoryCopyStatus(""), 2000);
  };

  const splitAutoDesignText = (text: string) => {
    if (!text) return { base: "", scenes: [] as string[] };
    const lines = text.split("\n");
    const startIndex = lines.findIndex((line) =>
      /SCENE LIST/i.test(line.replace(/\*\*/g, ""))
    );
    if (startIndex === -1) {
      return { base: text.trim(), scenes: [] as string[] };
    }
    const base = lines.slice(0, startIndex).join("\n").trim();
    const sceneLines = lines
      .slice(startIndex + 1)
      .map((line) => line.trim())
      .filter(Boolean);
    return { base, scenes: sceneLines };
  };

  const composeAutoDesignText = (base: string, scenes: string[]) => {
    const trimmedBase = base.trim();
    if (scenes.length === 0) return trimmedBase;
    return [trimmedBase, "", "## 5) SCENE LIST", ...scenes]
      .filter(Boolean)
      .join("\n");
  };

  const buildHelpAutoDesignContext = (sceneLines: string[]) =>
    sceneLines
      .slice(-3)
      .map((line) => line.replace(/^[-*\s]+/, "").trim())
      .join("\n");

  const helpAutoDesignGeneratedCount = Math.min(
    helpAutoDesignScenes.length,
    helpSceneCount
  );
  const helpAutoDesignStartScene = Math.min(
    helpAutoDesignGeneratedCount + 1,
    helpSceneCount
  );
  const helpAutoDesignEndScene = Math.min(
    helpAutoDesignGeneratedCount + helpAutoDesignBatchSize,
    helpSceneCount
  );
  const helpAutoDesignFinished = helpAutoDesignGeneratedCount >= helpSceneCount;

  const requestHelpAutoDesignBatch = async (
      startScene: number,
      endScene: number,
      includeBlueprint: boolean,
      previousContext: string
    ) => {
      // ... (lines 1007-1033 omitted - no changes to prompt building) ...
      if (helpSelectedIndex === null || !helpIdeas[helpSelectedIndex]) {
        throw new Error("Select a Help Animal idea first.");
      }
      const idea = helpIdeas[helpSelectedIndex];
      const basePrompt = buildHelpAnimalAutoDesignPrompt(
        idea.title,
        idea.one_line,
        helpSceneCount,
        storySummaryDraft,
        storyCharactersDraft.map(c => c.name).join(", "),
        storyObjectsDraft.map(o => o.name).join(", "),
        helpLockAssetsOnly,
        startScene,
        endScene,
        includeBlueprint,
        previousContext
      );

      const res = await fetch("/api/tools/gemini/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "instant",
          count: 1,
          prompt: [HELP_ANIMAL_SYSTEM_PROMPT, basePrompt]
            .filter(Boolean)
            .join("\n\n"),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Auto design failed");
      }

      // --- CLEANING LOGIC START ---
      let rawText = String(data?.text || "");

      // 1. Remove JSON blocks (This removes the Part 1 output)
      rawText = rawText.replace(/```json[\s\S]*?```/gi, "");

      // 2. Remove "Part 1" text headers if present
      if (rawText.includes("Part 2")) {
        const parts = rawText.split(/##\s*Part\s*2/i);
        rawText = parts[parts.length - 1]; // Keep everything AFTER "Part 2"
      } 
      else if (rawText.includes("MOVIE BLUEPRINT")) {
        const parts = rawText.split(/MOVIE\s*BLUEPRINT/i);
        rawText = parts[parts.length - 1];
      }

      const finalText = rawText.trim();
      // --- CLEANING LOGIC END ---

      const split = splitAutoDesignText(finalText);
      
      // --- STRICT SCENE FILTERING ---
      const allFoundScenes = extractScenesFromAutoDesign(finalText);
      
      // Strictly keep ONLY scenes asked for in this batch (e.g., 1-15).
      // This ignores scenes 16-40 if the AI hallucinated them as empty lines.
      const validBatchScenes = allFoundScenes.filter((s) => {
        const match = s.title.match(/Scene\s+(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          return num >= startScene && num <= endScene;
        }
        return false;
      });

      const validSceneLines = validBatchScenes.map(
        (s) => `- ${s.title}: ${s.summary}`
      );

      return {
        base: split.base,
        scenes: validSceneLines,
      };
  };
  
  const handleGenerateHelpAutoDesign = async () => {
    if (helpAutoDesignFinished) return;
    setStoryError("");
    setStoryLoading(true);
    try {
      const includeBlueprint = helpAutoDesignBase.trim().length === 0;
      const previousContext = buildHelpAutoDesignContext(helpAutoDesignScenes);
      const { base, scenes } = await requestHelpAutoDesignBatch(
        helpAutoDesignStartScene,
        helpAutoDesignEndScene,
        includeBlueprint,
        previousContext
      );

      const nextBase = includeBlueprint && base ? base : helpAutoDesignBase;
      const nextScenes = [...helpAutoDesignScenes, ...scenes].slice(
        0,
        helpSceneCount
      );

      setHelpAutoDesignBase(nextBase);
      setHelpAutoDesignScenes(nextScenes);
      const nextAutoDesignText = composeAutoDesignText(nextBase, nextScenes);
      setHelpAutoDesign(nextAutoDesignText);

      if (helpAutoAddNewAssets && !helpLockAssetsOnly) {
        handleAddCharactersFromAutoDesign(nextAutoDesignText);
        handleAddObjectsFromAutoDesign(nextAutoDesignText);
        handleAddLocationsFromAutoDesign(nextAutoDesignText);
        handleAddHazardsFromAutoDesign(nextAutoDesignText);
        handleAddScenesFromAutoDesign(nextAutoDesignText);
      }
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : String(err));
    } finally {
      setStoryLoading(false);
    }
  };

  const handleRegenerateHelpAutoDesignBatch = async () => {
      if (helpAutoDesignScenes.length === 0 || storyLoading) return;
      setStoryError("");
      setStoryLoading(true);
      try {
        const generatedCount = helpAutoDesignScenes.length;
        
        // Calculate the start of the current/last batch correctly
        const lastBatchStart =
          Math.floor((Math.max(generatedCount, 1) - 1) / helpAutoDesignBatchSize) *
            helpAutoDesignBatchSize + 1;
        
        const startScene = lastBatchStart;
        const endScene = Math.min(
          lastBatchStart + helpAutoDesignBatchSize - 1,
          helpSceneCount
        );

        const keepCount = startScene - 1;
        const baseScenes = helpAutoDesignScenes.slice(0, keepCount);
        const includeBlueprint = helpAutoDesignBase.trim().length === 0;
        const previousContext = buildHelpAutoDesignContext(baseScenes);

        // 1. Request the batch
        const { base, scenes } = await requestHelpAutoDesignBatch(
          startScene,
          endScene,
          includeBlueprint,
          previousContext
        );

        // 2. Format logic: If the response looks like JSON, we need to flatten it 
        // so your 'extractScenesFromAutoDesign' can read it later.
        const nextBase = includeBlueprint && base ? base : helpAutoDesignBase;
        const nextScenes = [...baseScenes, ...scenes].slice(0, helpSceneCount);

        setHelpAutoDesignBase(nextBase);
        setHelpAutoDesignScenes(nextScenes);
        
        // Update the text area with formatted text, not raw JSON
        setHelpAutoDesign(composeAutoDesignText(nextBase, nextScenes));
        
      } catch (err) {
        setStoryError(err instanceof Error ? err.message : String(err));
      } finally {
        setStoryLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-300">
            Text to Story
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            Story Ideas Generator
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            {storySelected === "help-animal"
              ? "Parse summary + characters/objects, then generate Help‑Animal movie ideas."
              : "Paste summary + characters/objects, edit them, then generate story ideas."}
          </p>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <PresetSelector
            presets={STORY_PRESETS}
            selected={storySelected}
            onSelect={setStorySelected}
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 text-sm text-slate-200">
              <PromptInput
                value={storyPrompt}
                onChange={setStoryPrompt}
                onParse={handleParseStory}
              />


              {storyParsedOnce && (
                <div className="space-y-4">
                  <SummaryEditor
                    summary={storySummaryDraft}
                    onSummaryChange={setStorySummaryDraft}
                    idea={storyIdeaDraft}
                    onIdeaChange={setStoryIdeaDraft}
                  />
                  <AssetEditor
                    characters={storyCharactersDraft}
                    objects={storyObjectsDraft}
                    locations={storyLocationsDraft}
                    hazards={storyHazardsDraft}
                    scenes={storyScenesDraft}
                    storyEditIndex={storyEditIndex}
                    onToggleEdit={setStoryEditIndex}
                    onRemoveCharacter={handleRemoveStoryCharacter}
                    onChangeCharacter={handleStoryCharacterChange}
                    onAddCharacter={handleAddStoryCharacter}
                    onCopyCharacters={handleCopyStoryCharacters}
                    onCopyAll={handleCopyAllAssets}
                    pasteCharacterDraft={pasteCharacterDraft}
                    onPasteCharacterDraftChange={setPasteCharacterDraft}
                    onPasteCharacter={handlePasteCharacter}
                    copyStatus={storyCopyStatus}
                    genderOptions={GENDER_OPTIONS}
                    typeGenderOptions={TYPE_GENDER_OPTIONS}
                    sizeOptions={SIZE_OPTIONS}
                    ageOptionGroups={AGE_OPTION_GROUPS}
                    onAddObject={handleAddStoryObject}
                    onCopyObjects={handleCopyStoryObjects}
                    onChangeObject={handleStoryObjectChange}
                    onRemoveObject={handleRemoveStoryObject}
                    pasteObjectDraft={pasteObjectDraft}
                    onPasteObjectDraftChange={setPasteObjectDraft}
                    onPasteObject={handlePasteObject}
                    onAddLocation={handleAddStoryLocation}
                    onCopyLocations={handleCopyStoryLocations}
                    onChangeLocation={handleStoryLocationChange}
                    onRemoveLocation={handleRemoveStoryLocation}
                    onAddHazard={handleAddStoryHazard}
                    onCopyHazards={handleCopyStoryHazards}
                    onChangeHazard={handleStoryHazardChange}
                    onRemoveHazard={handleRemoveStoryHazard}
                    onAddScene={handleAddStoryScene}
                    onCopyScenes={handleCopyStoryScenes}
                    onChangeScene={handleStorySceneChange}
                    onRemoveScene={handleRemoveStoryScene}
                    scenePage={scenePage}
                    scenesPerPage={scenesPerPage}
                    onScenePageChange={setScenePage}
                  />
                </div>
              )}

              {storySelected === "help-animal" && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="w-full sm:max-w-[180px]">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/80">
                      Part 1 scene count
                    </label>
                    <select
                      value={helpPart1SceneCount}
                      onChange={(event) =>
                        setHelpPart1SceneCount(Number(event.target.value))
                      }
                      className="mt-2 w-full rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-50"
                    >
                      {[20, 40, 60, 80, 100].map((count) => (
                        <option key={count} value={count}>
                          {count} scenes
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-100">
                    <input
                      type="checkbox"
                      checked={helpLockAssetsOnly}
                      onChange={(event) =>
                        setHelpLockAssetsOnly(event.target.checked)
                      }
                      className="h-4 w-4 rounded border-emerald-200/60 bg-slate-900 text-emerald-400"
                    />
                    Lock input assets only (no new characters/objects/locations/hazards)
                  </label>
                  <button
                    onClick={buildStoryResults}
                    disabled={storyLoading}
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/40 disabled:opacity-50"
                  >
                    {storyLoading
                      ? "Generating..."
                      : "Run Part 1 Normalize & Controlled Expansion"}
                  </button>
                  <button
                    onClick={handleResetStory}
                    disabled={storyLoading}
                    className="w-full rounded-2xl border border-emerald-200/40 bg-white/10 px-4 py-3 text-sm font-semibold text-emerald-100 hover:border-emerald-200/70 disabled:opacity-50"
                  >
                    New
                  </button>
                </div>
              )}
              {storySelected !== "help-animal" && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={buildStoryResults}
                    disabled={storyLoading}
                    className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-purple-500/30 disabled:opacity-50"
                  >
                    {storyLoading ? "Generating..." : "Generate 5 story ideas"}
                  </button>
                  <button
                    onClick={handleResetStory}
                    disabled={storyLoading}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-50"
                  >
                    New
                  </button>
                </div>
              )}
              {storyError && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {storyError}
                </div>
              )}
            </div>

            {storySelected === "help-animal" ? (
                      <HelpAnimalPanel
                ideas={helpIdeas}
                selectedIndex={helpSelectedIndex}
                onSelectIdea={setHelpSelectedIndex}
                sceneCount={helpSceneCount}
                onSceneCountChange={setHelpSceneCount}
                lockAssetsOnly={helpLockAssetsOnly}
                onLockAssetsOnlyChange={setHelpLockAssetsOnly}
                autoAddNewAssets={helpAutoAddNewAssets}
                onAutoAddNewAssetsChange={setHelpAutoAddNewAssets}
                onGenerateAutoDesign={handleGenerateHelpAutoDesign}
                onRegenerateAutoDesign={handleRegenerateHelpAutoDesignBatch}
                loading={storyLoading}
                autoDesignText={helpAutoDesign}
                batchStart={helpAutoDesignStartScene}
                batchEnd={helpAutoDesignEndScene}
                isFinished={helpAutoDesignFinished}
                generatedCount={helpAutoDesignGeneratedCount}
                onAddLocations={handleAddLocationsFromAutoDesign}
                onAddHazards={handleAddHazardsFromAutoDesign}
                onAddCharacters={handleAddCharactersFromAutoDesign}
                onAddObjects={handleAddObjectsFromAutoDesign}
                onAddScenes={handleAddScenesFromAutoDesign}
              />
            ) : (
              <IdeaResults ideas={storyResults} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

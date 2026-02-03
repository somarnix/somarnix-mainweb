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
  const [helpAutoDesign, setHelpAutoDesign] = useState("");
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
    const cleanValue = (value?: string) =>
      value ? value.replace(/\bupunknown\b/gi, "unknown").trim() : "";
    const namePools: Record<string, string[]> = {
      cat: ["Felix", "Luna", "Milo", "Nala", "Whiskers", "Willow"],
      dog: ["Buddy", "Max", "Daisy", "Scout", "Ruby", "Rocky"],
      rabbit: ["Clover", "Pip", "Hazel", "Snow"],
      fox: ["Rusty", "Sable", "Ember"],
      bear: ["Bruno", "Maple", "Otto"],
      wolf: ["Shadow", "Ash", "Raven"],
      bird: ["Skye", "Ava", "Piper"],
      deer: ["Willow", "Fawn", "Maple"],
      otter: ["River", "Otis", "Mara"],
      beaver: ["Timber", "Nora", "Chip"],
      mouse: ["Pip", "Moss", "Bean"],
    };
    const speciesOrder = Object.keys(namePools);
    const usedNames = new Set<string>();
    const getSpecies = (role: string, appearance: string) => {
      const text = `${role} ${appearance}`.toLowerCase();
      if (text.includes("cat")) return "cat";
      if (text.includes("dog")) return "dog";
      if (text.includes("rabbit")) return "rabbit";
      if (text.includes("fox")) return "fox";
      if (text.includes("bear")) return "bear";
      if (text.includes("wolf")) return "wolf";
      if (text.includes("bird")) return "bird";
      if (text.includes("deer")) return "deer";
      if (text.includes("otter")) return "otter";
      if (text.includes("beaver")) return "beaver";
      if (text.includes("mouse") || text.includes("mice")) return "mouse";
      return "";
    };
    const pickName = (species: string, fallbackIndex: number) => {
      const pool = namePools[species] || ["Willow", "Felix", "Luna", "Milo"];
      for (let i = 0; i < pool.length; i += 1) {
        const candidate = pool[i];
        if (!usedNames.has(candidate)) {
          usedNames.add(candidate);
          return candidate;
        }
      }
      const fallback = pool[fallbackIndex % pool.length];
      usedNames.add(fallback);
      return fallback;
    };
    return chars.map((char, idx) => {
      const cleaned = {
        ...char,
        name: cleanValue(char.name),
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
      const nameLower = cleaned.name.toLowerCase();
      const isGenericName =
        !nameLower || /^character\s*\d+$/i.test(nameLower) || nameLower === "unknown";
      const species = getSpecies(cleaned.role || "", cleaned.appearance || "");
      const inferredRole =
        cleaned.role && cleaned.role.toLowerCase() !== "unknown"
          ? cleaned.role
          : species
          ? species
          : cleaned.role;
      const ageLower = cleaned.age?.toLowerCase() || "";
      const appearanceLower = cleaned.appearance?.toLowerCase() || "";
      const inferredAge =
        ageLower && ageLower !== "unknown"
          ? cleaned.age
          : /kitten|puppy|cub|baby|child|small/.test(appearanceLower)
          ? "child"
          : /adult/.test(appearanceLower)
          ? "adult"
          : cleaned.age;
      const nextName = isGenericName
        ? pickName(species || speciesOrder[idx % speciesOrder.length], idx)
        : cleaned.name;
      return {
        ...cleaned,
        name: nextName,
        role: inferredRole || "",
        age: inferredAge || "",
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
  };

  // Remove a scene from the list
  const handleRemoveStoryScene = (index: number) => {
    setStoryScenesDraft((prev) => prev.filter((_, idx) => idx !== index));
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

  // Regex to match bullet points (e.g., "- " or "* ")
  const BULLET_REGEX = /^\s*[-*]\s*/;

  const extractCharactersFromAutoDesign = (text: string) => {
    const lines = sliceHelpAutoDesignSection(text, "Character Design");
    const items: CharacterDraft[] = [];

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      const cleanNoStars = line.replace(/\*\*/g, "").trim();
      if (/^new\s*:\s*(none|null|n\/a)?$/i.test(cleanNoStars)) return;

      if (!BULLET_REGEX.test(line)) return;

      const normalized = line.replace(BULLET_REGEX, "- ").trim();
      const { name, details } = parseNameDetailsLine(normalized);

      const cleanName = (name || "")
        .replace(/\*\*/g, "")
        .replace(/^NEW\s*/i, "")
        .trim();

      const cleanDetails = (details || "").replace(/\*\*/g, "").trim();

      if (!cleanName) return;
      if (/^(new|none|null|n\/a)$/i.test(cleanName)) return;
      if (/^(none|null|n\/a)$/i.test(cleanDetails)) return;

      items.push({ name: cleanName, appearance: cleanDetails });
    });

    return items;
  };

  const extractObjectsFromAutoDesign = (text: string) => {
    const lines = sliceHelpAutoDesignSection(text, "Object Design");
    const items: ObjectDraft[] = [];

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      if (!BULLET_REGEX.test(line)) return;

      const normalized = line.replace(BULLET_REGEX, "- ").trim();
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

  const extractLocationsFromAutoDesign = (text: string) => {
    const lines = sliceHelpAutoDesignSection(text, "LOCATION DESIGN");
    return lines
      .map((rawLine) => rawLine.trim())
      .filter((line) => /^[-*]\s*/.test(line))
      .map((line) => {
        const parsed = parseNameDetailsLine(line);
        return {
          name: parsed.name.replace(/^NEW\s*/i, "").trim(),
          details: parsed.details,
        };
      })
      .filter((item) => item.name);
  };

  const extractHazardsFromAutoDesign = (text: string) => {
    const lines = sliceHelpAutoDesignSection(text, "HAZARDS & OBSTACLES");
    return lines
      .map((rawLine) => rawLine.trim())
      .filter((line) => /^[-*]\s*/.test(line))
      .map((line) => {
        const parsed = parseNameDetailsLine(line);
        return {
          name: parsed.name.replace(/^NEW\s*/i, "").trim(),
          details: parsed.details,
        };
      })
      .filter((item) => item.name);
  };

  const handleAddLocationsFromAutoDesign = () => {
    if (!helpAutoDesign.trim()) return;
    const items = extractLocationsFromAutoDesign(helpAutoDesign);
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

  const handleAddHazardsFromAutoDesign = () => {
    if (!helpAutoDesign.trim()) return;
    const items = extractHazardsFromAutoDesign(helpAutoDesign);
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
const extractScenesFromAutoDesign = (text: string) => {
    // Look for "Scenes:" or "SCENES" followed by numbered lines
    const scenesStartRegex = /(?:^|\n)\**Scenes:?\**\s*(?:\n|$)/i;
    const match = text.match(scenesStartRegex);
    if (!match || match.index === undefined) return [];

    const contentAfter = text.substring(match.index + match[0].length);
    const lines = contentAfter.split(/\r?\n/);
    const scenes: { title: string; summary: string }[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      // Match lines starting with "1. ", "2. ", etc.
      const sceneMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (sceneMatch) {
        scenes.push({
          title: `Scene ${sceneMatch[1]}`,
          summary: sceneMatch[2].trim(),
        });
      }
    });

    return scenes;
  };

  const handleAddScenesFromAutoDesign = () => {
    if (!helpAutoDesign.trim()) return;
    const items = extractScenesFromAutoDesign(helpAutoDesign);
    if (items.length === 0) return;

    setStoryScenesDraft((prev) => {
      // Avoid duplicates based on summary
      const existingSummaries = new Set(prev.map((s) => s.summary.toLowerCase()));
      const next = [...prev];
      items.forEach((item) => {
        if (!existingSummaries.has(item.summary.toLowerCase())) {
          next.push(item);
          existingSummaries.add(item.summary.toLowerCase());
        }
      });
      return next;
    });
    // Optional: Give feedback that scenes were added
    setStoryCopyStatus(`Added ${items.length} scenes!`);
    setTimeout(() => setStoryCopyStatus(""), 2000);
  };

  const handleAddCharactersFromAutoDesign = () => {
    if (helpLockAssetsOnly) return; // ✅ extra hard guard (optional but good)
    if (!helpAutoDesign.trim()) return;

    const items = extractCharactersFromAutoDesign(helpAutoDesign);
    if (items.length === 0) return;

    setStoryCharactersDraft((prev) => {
      const existing = new Set(prev.map((char) => (char.name || "").toLowerCase()));
      const next = [...prev];

      items.forEach((item) => {
        const name = (item.name || "").trim() || `Character ${next.length + 1}`;

        // ✅ EXTRA SAFETY: skip fake entries
        if (/^(new|none|null|n\/a)$/i.test(name)) return;

        if (!existing.has(name.toLowerCase())) {
          next.push({
            name,
            appearance: item.appearance || "",
          });
          existing.add(name.toLowerCase());
        }
      });

      return next;
    });
  };

  const handleAddObjectsFromAutoDesign = () => {
    if (!helpAutoDesign.trim()) return;
    const items = extractObjectsFromAutoDesign(helpAutoDesign);
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

  const handlePasteObject = () => {
    if (!pasteObjectDraft.trim()) return;
    const parsed = parseSingleObject(pasteObjectDraft);
    setStoryObjectsDraft((prev) => [...prev, parsed]);
    setPasteObjectDraft("");
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

  const handleCopyAllAssets = async () => {
    const sections: string[] = [];
    if (storyCharactersDraft.length > 0) {
      sections.push("Characters");
      storyCharactersDraft.forEach((char, idx) => {
        sections.push(`Character ${idx + 1}`);
        sections.push(`Name: ${char.name}`);
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
        sections.push(`Name: ${obj.name}`);
        if (obj.details) sections.push(obj.details.replace(/\s*\|\s*/g, "\n"));
        sections.push("");
      });
    }
    if (storyLocationsDraft.length > 0) {
      sections.push("Locations");
      storyLocationsDraft.forEach((loc, idx) => {
        sections.push(`Location ${idx + 1}`);
        sections.push(`Name: ${loc.name}`);
        if (loc.details) sections.push(`Details: ${loc.details}`);
        sections.push("");
      });
    }
    if (storyHazardsDraft.length > 0) {
      sections.push("Hazards & Obstacles");
      storyHazardsDraft.forEach((haz, idx) => {
        sections.push(`Hazard ${idx + 1}`);
        sections.push(`Name: ${haz.name}`);
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


  const handleResetStory = () => {
    setStoryPrompt("");
    setStoryResults([]);
    setStoryMeta({ summary: "", characters: [] });
    setStorySummaryDraft("");
    setStoryIdeaDraft("");
    setStoryCharactersDraft([]);
    setStoryObjectsDraft([]);
    setStoryLocationsDraft([]);
    setStoryHazardsDraft([]);
    setStoryParsedOnce(false);
    setStoryCopyStatus("");
    setStoryEditIndex(null);
    setStoryError("");
    setHelpIdeas([]);
    setHelpSelectedIndex(null);
    setHelpSceneCount(40);
    setHelpAutoDesign("");
    setHelpLockAssetsOnly(false);
    setHelpAutoAddNewAssets(false);
  };

  const buildStoryResults = async () => {
    setStoryError("");
    setStoryLoading(true);
    const parsedRaw = storyParsedOnce
      ? { summary: storySummaryDraft, characters: storyCharactersDraft, objects: storyObjectsDraft }
      : parseStoryInput(storyPrompt);
    const parsed =
      storySelected === "help-animal"
        ? { ...parsedRaw, characters: normalizeHelpAnimalCharacters(parsedRaw.characters) }
        : parsedRaw;

    setStoryMeta({ summary: parsed.summary, characters: parsed.characters });
    if (!storyParsedOnce) {
      setStorySummaryDraft(parsed.summary);
      setStoryCharactersDraft(parsed.characters);
      setStoryObjectsDraft(parsed.objects);
      setStoryLocationsDraft(parsed.locations);
      setStoryHazardsDraft(parsed.hazards);
      setStoryParsedOnce(true);
    }

    const names =
      parsed.characters.length > 0
        ? parsed.characters.map((c) => c.name).join(", ")
        : "";
    const objectText =
      parsed.objects.length > 0
        ? parsed.objects.map((o) => `${o.name}${o.details ? ` (${o.details})` : ""}`).join(", ")
        : "";
    const baseSummary = parsed.summary || "Create vivid story ideas.";
    const storyIdeaHint = storyIdeaDraft.trim();
    if (!storyIdeaHint) {
      setStoryError("Story idea is required.");
      setStoryLoading(false);
      return;
    }

    const isEatAsmr = storySelected === "eat-asmr";
    const isCutAsmr = storySelected === "cut-asmr";
    const isCookingAsmr = storySelected === "cooking-asmr";
    const isHelpAnimal = storySelected === "help-animal";

    try {
      const res = await fetch("/api/tools/gemini/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "instant",
          count: 5,
          prompt: isHelpAnimal
            ? [
                HELP_ANIMAL_SYSTEM_PROMPT,
                buildHelpAnimalIdeaPrompt(baseSummary, names, objectText, storyIdeaHint),
              ]
                .filter(Boolean)
                .join("\n\n")
            : [
                `Story type: ${getStoryPresetLabel(storySelected)}.`,
                isEatAsmr
                  ? "EAT ASMR RULE: The story MUST be about eating. Focus on bites, chewing sounds, crunchy/soft textures, and edible items. Do not describe non-edible objects as food."
                  : "",
                isCutAsmr
                  ? "CUT ASMR RULE: The story MUST be about cutting/slicing. Focus on blades, clean cuts, crisp slice sounds, and cut textures."
                  : "",
                isCookingAsmr
                  ? "COOKING ASMR RULE: The story MUST be about cooking. Focus on prep, mixing, sizzling, plating, and cooking textures/sounds."
                  : "",
                isHelpAnimal
                  ? [
                      "HELP ANIMAL RULE: Every idea MUST be a clear animal rescue/care story.",
                      "Keep realism and compassion. Avoid graphic violence.",
                      "Include: danger/problem -> rescue action -> safe outcome.",
                      "Use ONLY the provided characters/objects/summary; do NOT add new animals or random food unless listed.",
                      "Keep the setting consistent with the summary (no random kitchens/forests unless mentioned).",
                      "Make it heart-warming, family-friendly, and focused on helping the animal.",
                  "Write the idea so it can expand into a long-form movie with micro-beats.",
                ].join(" ")
              : "",
                `Summary: ${baseSummary}`,
                storyIdeaHint ? `User story idea: ${storyIdeaHint}` : "",
                names ? `Characters: ${names}` : "",
                objectText ? `Objects: ${objectText}` : "",
            "OUTPUT STRICT JSON ONLY: { \"ideas\": [ { \"title\": string, \"one_line\": string } ] }",
            "Use one_line only (do NOT use story).",
            "Generate exactly 5 unique ideas in ideas[].",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Story generation failed");
      }
      const parsedJson = parseStoryJson(String(data?.text || ""));
      const ideas = Array.isArray(parsedJson?.ideas)
        ? parsedJson.ideas
        : Array.isArray(parsedJson)
        ? parsedJson
        : [];
      const parsedTextIdeas = ideas.length === 0 ? parseStoryIdeasText(String(data?.text || "")) : [];
      const results = (ideas.length > 0 ? ideas : parsedTextIdeas).map(
        (idea: { title?: string; story?: string; detail?: string; one_line?: string }, idx: number) => ({
          title: String(idea?.title || `Idea ${idx + 1}`),
          detail: String(idea?.one_line || idea?.story || idea?.detail || ""),
        })
      );
      if (results.length === 0) {
        throw new Error("No ideas returned");
      }
      setStoryResults(results);
      if (isHelpAnimal) {
        setHelpIdeas(
          results.map((idea, idx) => ({
            title: idea.title || `Idea ${idx + 1}`,
            one_line: idea.detail || "",
          }))
        );
        setHelpSelectedIndex(null);
        setHelpAutoDesign("");
      }
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : String(err));
    } finally {
      setStoryLoading(false);
    }
  };

  const handleGenerateHelpAutoDesign = async () => {
    if (helpSelectedIndex === null || !helpIdeas[helpSelectedIndex]) return;
    setStoryError("");
    setStoryLoading(true);
    try {
      const idea = helpIdeas[helpSelectedIndex];
      const res = await fetch("/api/tools/gemini/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "instant",
          count: 1,
          prompt: [
            HELP_ANIMAL_SYSTEM_PROMPT,
            buildHelpAnimalAutoDesignPrompt(
              idea.title,
              idea.one_line,
              helpSceneCount,
              storySummaryDraft,
              storyCharactersDraft
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
                .join("\n"),
              storyObjectsDraft
                .map((obj, idx) => {
                  const bits = [
                    `Object ${idx + 1}: ${obj.name || "Unknown"}`,
                    obj.details || "",
                  ].filter(Boolean);
                  return bits.join(" | ");
                })
                .join("\n"),
              helpLockAssetsOnly
            ),
          ]
            .filter(Boolean)
            .join("\n\n"),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Auto design failed");
      }
      setHelpAutoDesign(String(data?.text || ""));
      if (helpAutoAddNewAssets && !helpLockAssetsOnly) {
        handleAddCharactersFromAutoDesign();
        handleAddObjectsFromAutoDesign();
        handleAddLocationsFromAutoDesign();
        handleAddHazardsFromAutoDesign();
        handleAddScenesFromAutoDesign();
      }
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
          <div className="flex flex-wrap gap-2">
            {STORY_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => setStorySelected(preset.key)}
                className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                  storySelected === preset.key
                    ? "bg-slate-100 text-slate-900"
                    : "border border-slate-700 bg-slate-950/60 text-slate-200 hover:border-slate-400"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 text-sm text-slate-200">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Paste prompt
                </label>
                <textarea
                  value={storyPrompt}
                  onChange={(e) => setStoryPrompt(e.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  placeholder="Paste your image description prompt here..."
                />
              </div>
              <button
                onClick={handleParseStory}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400"
              >
                Parse summary + characters
              </button>


              {storyParsedOnce && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Edit summary
                  </p>
                  <textarea
                    value={storySummaryDraft}
                    onChange={(e) => setStorySummaryDraft(e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
                  />
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Story idea
                      </p>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                        Required
                      </span>
                    </div>
                    <textarea
                      value={storyIdeaDraft}
                      onChange={(e) => setStoryIdeaDraft(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
                      placeholder="Describe your movie idea or plot direction (required)..."
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Characters
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyAllAssets}
                        className="rounded-full border border-emerald-400/60 px-3 py-1 text-xs text-emerald-200 hover:border-emerald-300"
                      >
                        Copy all
                      </button>
                      <button
                        onClick={handleCopyStoryCharacters}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Copy characters
                      </button>
                      <button
                        onClick={handleAddStoryCharacter}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Add character
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-xs text-slate-400">
                      Paste character block to auto-fill
                    </p>
                    <textarea
                      value={pasteCharacterDraft}
                      onChange={(e) => setPasteCharacterDraft(e.target.value)}
                      rows={5}
                      className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-100"
                      placeholder={`Character 3\n\nGender: unknown\n\nAge: child\n\nTypeGender: unknown\n\nSize: unknown\n\n  Role: swimmer\n\nAppearance: white rabbit with long ears\n\nOutfit: purple swimsuit with light spots\n\nAccessories: pink swim cap, pink goggles, clear glasses\n\nExpression: smiling\n\nColors: white, purple, pink, grey`}
                    />
                    <button
                      onClick={handlePasteCharacter}
                      className="mt-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                    >
                      Add from text
                    </button>
                  </div>
                  {storyCopyStatus && (
                    <p className="mt-2 text-xs text-slate-400">{storyCopyStatus}</p>
                  )}
                  <div className="mt-3 space-y-3">
                    {storyCharactersDraft.length === 0 && (
                      <p className="text-xs text-slate-400">No characters found yet.</p>
                    )}
                    {storyCharactersDraft.map((char, idx) => (
                      <div
                        key={`${char.name}-${idx}`}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Character {idx + 1}</p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                setStoryEditIndex(storyEditIndex === idx ? null : idx)
                              }
                              className="text-xs text-slate-200 hover:text-white"
                            >
                              {storyEditIndex === idx ? "Done" : "Edit"}
                            </button>
                            <button
                              onClick={() => handleRemoveStoryCharacter(idx)}
                              className="text-xs text-red-300 hover:text-red-200"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {storyEditIndex === idx ? (
                          <>
                            <input
                              value={char.name}
                              onChange={(e) =>
                                handleStoryCharacterChange(idx, "name", e.target.value)
                              }
                              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                              placeholder="Character name"
                            />
                            <textarea
                              value={char.appearance}
                              onChange={(e) =>
                                handleStoryCharacterChange(
                                  idx,
                                  "appearance",
                                  e.target.value
                                )
                              }
                              rows={2}
                              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                              placeholder="Appearance / details"
                            />
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              <select
                                value={char.gender || "unknown"}
                                onChange={(e) =>
                                  handleStoryCharacterChange(idx, "gender", e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                              >
                                {GENDER_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={char.typegender || "unknown"}
                                onChange={(e) =>
                                  handleStoryCharacterChange(idx, "typegender", e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                              >
                                {TYPE_GENDER_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={char.size || "unknown"}
                                onChange={(e) =>
                                  handleStoryCharacterChange(idx, "size", e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                              >
                                {SIZE_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={char.age || ""}
                                onChange={(e) =>
                                  handleStoryCharacterChange(idx, "age", e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                              >
                                <option value="">Select age</option>
                                <option value="unknown">unknown</option>
                                {AGE_OPTION_GROUPS.map((group) => (
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
                                onChange={(e) =>
                                  handleStoryCharacterChange(idx, "role", e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                                placeholder="Role"
                              />
                              <input
                                value={char.outfit || ""}
                                onChange={(e) =>
                                  handleStoryCharacterChange(idx, "outfit", e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                                placeholder="Outfit"
                              />
                              <input
                                value={char.accessories || ""}
                                onChange={(e) =>
                                  handleStoryCharacterChange(
                                    idx,
                                    "accessories",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                                placeholder="Accessories"
                              />
                              <input
                                value={char.expression || ""}
                                onChange={(e) =>
                                  handleStoryCharacterChange(
                                    idx,
                                    "expression",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                                placeholder="Expression"
                              />
                              <input
                                value={char.colors || ""}
                                onChange={(e) =>
                                  handleStoryCharacterChange(idx, "colors", e.target.value)
                                }
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

                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Objects
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyStoryObjects}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Copy objects
                      </button>
                      <button
                        onClick={handleAddStoryObject}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Add object
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-xs text-slate-400">
                      Paste object block to auto-fill
                    </p>
                    <textarea
                      value={pasteObjectDraft}
                      onChange={(e) => setPasteObjectDraft(e.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-100"
                      placeholder={`Object 1\n\nName: Plate of spaghetti\n\nDescription: Plate of spaghetti with tomato sauce and cheese\n\nMaterial: food\n\nCondition: fresh\n\nColors: red, yellow, white, beige`}
                    />
                    <button
                      onClick={handlePasteObject}
                      className="mt-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                    >
                      Add from text
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {storyObjectsDraft.length === 0 && (
                      <p className="text-xs text-slate-400">No objects found yet.</p>
                    )}
                    {storyObjectsDraft.map((obj, idx) => (
                      <div
                        key={`${obj.name}-${idx}`}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Object {idx + 1}</p>
                          <button
                            onClick={() => handleRemoveStoryObject(idx)}
                            className="text-xs text-red-300 hover:text-red-200"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          value={obj.name}
                          onChange={(e) => handleStoryObjectChange(idx, "name", e.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                          placeholder="Object name"
                        />
                        <textarea
                          value={obj.details}
                          onChange={(e) => handleStoryObjectChange(idx, "details", e.target.value)}
                          rows={2}
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                          placeholder="Object details"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Locations
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyStoryLocations}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Copy locations
                      </button>
                      <button
                        onClick={handleAddStoryLocation}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Add location
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {storyLocationsDraft.length === 0 && (
                      <p className="text-xs text-slate-400">No locations yet.</p>
                    )}
                    {storyLocationsDraft.map((loc, idx) => (
                      <div
                        key={`${loc.name}-${idx}`}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Location {idx + 1}</p>
                          <button
                            onClick={() => handleRemoveStoryLocation(idx)}
                            className="text-xs text-red-300 hover:text-red-200"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          value={loc.name}
                          onChange={(e) => handleStoryLocationChange(idx, "name", e.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                          placeholder="Location name"
                        />
                        <textarea
                          value={loc.details}
                          onChange={(e) =>
                            handleStoryLocationChange(idx, "details", e.target.value)
                          }
                          rows={2}
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                          placeholder="Location details"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Hazards & Obstacles
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyStoryHazards}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Copy hazards
                      </button>
                      <button
                        onClick={handleAddStoryHazard}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Add hazard
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {storyHazardsDraft.length === 0 && (
                      <p className="text-xs text-slate-400">No hazards yet.</p>
                    )}
                    {storyHazardsDraft.map((hazard, idx) => (
                      <div
                        key={`${hazard.name}-${idx}`}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Hazard {idx + 1}</p>
                          <button
                            onClick={() => handleRemoveStoryHazard(idx)}
                            className="text-xs text-red-300 hover:text-red-200"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          value={hazard.name}
                          onChange={(e) =>
                            handleStoryHazardChange(idx, "name", e.target.value)
                          }
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                          placeholder="Hazard name"
                        />
                        <textarea
                          value={hazard.details}
                          onChange={(e) =>
                            handleStoryHazardChange(idx, "details", e.target.value)
                          }
                          rows={2}
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                          placeholder="Hazard details"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                     Scene
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyStoryScenes}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Copy scenes
                      </button>
                      <button
                        onClick={handleAddStoryScene}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Add Scene
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {storyScenesDraft.length === 0 && (
                      <p className="text-xs text-slate-400">No scenes yet.</p>
                    )}
                    {storyScenesDraft.map((scene, idx) => (
                      <div
                        key={`${scene.name}-${idx}`}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Scene {idx + 1}</p>
                          <button
                            onClick={() => handleRemoveStoryScene(idx)}
                            className="text-xs text-red-300 hover:text-red-200"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          value={scene.name}
                          onChange={(e) =>
                            handleStorySceneChange(idx, "name", e.target.value)
                          }
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                          placeholder="Scene name"
                        />
                        <textarea
                          value={scene .details}
                          onChange={(e) =>
                            handleStorySceneChange(idx, "details", e.target.value)
                          }
                          rows={2}
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
                          placeholder="Scene details"
                        />
                      </div>
                    ))}
                  </div>                  
                </div>
              )}

              

              {storySelected === "help-animal" && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={buildStoryResults}
                    disabled={storyLoading}
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/40 disabled:opacity-50"
                  >
                    {storyLoading ? "Generating..." : "Generate 5 movie ideas"}
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

            {storySelected === "help-animal" && (
              <div className="space-y-3 text-sm text-slate-200">
                {helpIdeas.length > 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      PART 1 - Movie Idea Generation
                    </p>
                    <div className="mt-3 space-y-2">
                      {helpIdeas.map((idea, idx) => (
                        <button
                          key={`${idea.title}-${idx}`}
                          onClick={() => setHelpSelectedIndex(idx)}
                          className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                            helpSelectedIndex === idx
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
                      Which movie idea number would you like to continue with?
                    </p>
                  </div>
                )}

                {helpSelectedIndex !== null && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      PART 2 — Scene Count
                    </p>
                    <p className="mt-2 text-xs text-slate-300">
                      You selected idea #{helpSelectedIndex + 1}:{" "}
                      <span className="font-semibold text-white">
                        {helpIdeas[helpSelectedIndex]?.title}
                      </span>
                    </p>
                  <label className="mt-3 block text-xs uppercase tracking-[0.2em] text-slate-400">
                    How many scenes should this movie have?
                  </label>
                  <select
                    value={helpSceneCount}
                    onChange={(e) => setHelpSceneCount(Number(e.target.value))}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
                  >
                    {[20, 40, 60, 80, 100].map((count) => (
                      <option key={count} value={count}>
                        {count} scenes
                      </option>
                    ))}
                  </select>
                  <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={helpLockAssetsOnly}
                      onChange={(e) => setHelpLockAssetsOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-emerald-400"
                    />
                    Lock input assets only (no new characters/objects/locations/hazards)
                  </label>
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={helpAutoAddNewAssets}
                      onChange={(e) => setHelpAutoAddNewAssets(e.target.checked)}
                      disabled={helpLockAssetsOnly}
                      className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-emerald-400 disabled:opacity-40"
                    />
                    Auto‑add NEW assets from auto‑design
                  </label>
                  <button
                    onClick={handleGenerateHelpAutoDesign}
                    disabled={storyLoading}
                    className="mt-3 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {storyLoading ? "Designing..." : "Generate auto movie design"}
                  </button>
                </div>
              )}

              {helpAutoDesign && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-200 whitespace-pre-wrap">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      onClick={handleAddLocationsFromAutoDesign}
                      disabled={helpLockAssetsOnly}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
                    >
                      Add locations to list
                    </button>
                    <button
                      onClick={handleAddHazardsFromAutoDesign}
                      disabled={helpLockAssetsOnly}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
                    >
                      Add hazards to list
                    </button>
                    <button
                      onClick={handleAddCharactersFromAutoDesign}
                      disabled={helpLockAssetsOnly}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
                    >
                      Add characters to list
                    </button>
                    <button
                      onClick={handleAddObjectsFromAutoDesign}
                      disabled={helpLockAssetsOnly}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
                    >
                      Add objects to list
                    </button>
                    <button
                      onClick={handleAddScenesFromAutoDesign}
                      disabled={helpLockAssetsOnly}
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400 disabled:opacity-40"
                    >
                      Add scenes to list
                    </button>
                  </div>
                  {helpLockAssetsOnly && (
                    <p className="mb-3 text-[11px] text-slate-400">
                      Lock enabled: auto-design should not introduce new assets.
                    </p>
                  )}
                  {helpAutoDesign}
                </div>
              )}
              </div>
            )}
            {storySelected !== "help-animal" && (
              <div className="space-y-3 text-sm text-slate-200">
                {(storyResults.length > 0 ? storyResults : [])
                  .slice(0, 10)
                  .map((scene, idx) => (
                    <div
                      key={`${scene.title}-${idx}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Story title
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {scene.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">{scene.detail}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

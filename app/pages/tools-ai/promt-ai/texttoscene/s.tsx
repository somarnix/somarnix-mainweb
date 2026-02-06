"use client";

import { useState } from "react";
import {
  STORY_PRESETS,
  StoryPreset,
  getStoryPresetLabel,
  STORY_PRESET_RULES,
} from "@/app/components/storyPresets";
import { Pagination } from "@/app/components/Pagination";
import type {
  CharacterDraft,
  CharacterSheetItem,
  HazardDraft,
  LocationDraft,
  ObjectDraft,
  SceneItem,
} from "@/app/components/promt/types";
import {
  AGE_OPTION_GROUPS,
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  TYPE_GENDER_OPTIONS,
} from "@/app/components/promt/types";
import {
  extractJsonPayload,
  parseNameDetailsLine,
  parseSceneBlocks,
  parseSingleCharacter,
} from "@/app/components/promt/promptUtils";
import PresetSelector from "@/app/pages/tools-ai/promt-ai/components/PresetSelector";
import CharacterList from "@/app/pages/tools-ai/promt-ai/components/CharacterList";
import GenericAssetList from "@/app/pages/tools-ai/promt-ai/components/GenericAssetList";

const parseStoryJson = (text: string) => extractJsonPayload(text);

export default function StoryToScenePage() {
  const [storyIdea, setStoryIdea] = useState("");
  const [sceneOutlineIdea, setSceneOutlineIdea] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [storyPaste, setStoryPaste] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [storySelected, setStorySelected] = useState<StoryPreset>("animation");
  const [visualStyle, setVisualStyle] = useState("real");
  const [emotionStyle, setEmotionStyle] = useState("emotional");
  const [cinematicStyle, setCinematicStyle] = useState("cinematic");
  const [audioStyle, setAudioStyle] = useState("both");
  const [materialStyle, setMaterialStyle] = useState("original");
  const [sameCharacter, setSameCharacter] = useState(true);
  const [changeCharacter, setChangeCharacter] = useState(false);
  const [sameObject, setSameObject] = useState(true);
  const [changeObject, setChangeObject] = useState(false);
  const [changeBackground, setChangeBackground] = useState(true);
  const [sameBackground, setSameBackground] = useState(false);
  const [includeCharacterDetails, setIncludeCharacterDetails] = useState(false);
  const [sceneCount, setSceneCount] = useState(10);
  const [characters, setCharacters] = useState<CharacterDraft[]>([
    { name: "Character 1", appearance: "" },
  ]);
  const [characterEditIndex, setCharacterEditIndex] = useState<number | null>(
    null
  );
  const [pasteCharacterDraft, setPasteCharacterDraft] = useState("");
  const [objects, setObjects] = useState<ObjectDraft[]>([]);
  const [locations, setLocations] = useState<LocationDraft[]>([]);
  const [hazards, setHazards] = useState<HazardDraft[]>([]);
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [characterSheet, setCharacterSheet] = useState<CharacterSheetItem[]>([]);
  const [scenePage, setScenePage] = useState(1);
  const scenesPerPage = 10;
  const [sceneCopyStatus, setSceneCopyStatus] = useState("");
  const [headerCopyStatus, setHeaderCopyStatus] = useState("");
  const [assetCopyStatus, setAssetCopyStatus] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");
  const [youtubeResult, setYoutubeResult] = useState<{
    title: string;
    thumbnailText: string;
    thumbnailIdea: string;
  } | null>(null);
  const [youtubeCopyStatus, setYoutubeCopyStatus] = useState("");


  const handleCharacterChange = (
    index: number,
    field: keyof CharacterDraft,
    value: string
  ) => {
    setCharacters((prev) =>
      prev.map((char, idx) => (idx === index ? { ...char, [field]: value } : char))
    );
  };

  const handleAddCharacter = () => {
    setCharacters((prev) => [
      ...prev,
      { name: `Character ${prev.length + 1}`, appearance: "" },
    ]);
  };

  const handleRemoveCharacter = (index: number) => {
    setCharacters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePasteCharacter = () => {
    if (!pasteCharacterDraft.trim()) return;
    const parsed = parseSingleCharacter(pasteCharacterDraft);
    const rawName = parsed.name?.trim() || "";
    const safeName =
      rawName.toLowerCase() === "unknown" || /^character\s*\d+$/i.test(rawName)
        ? `Character ${characters.length + 1}`
        : rawName;
    setCharacters((prev) => [...prev, { ...parsed, name: safeName }]);
    setPasteCharacterDraft("");
  };

  const handleAddObject = () => {
    setObjects((prev) => [...prev, { name: `Object ${prev.length + 1}`, details: "" }]);
  };

  const handleRemoveObject = (index: number) => {
    setObjects((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleObjectChange = (index: number, field: "name" | "details", value: string) => {
    setObjects((prev) =>
      prev.map((obj, idx) => (idx === index ? { ...obj, [field]: value } : obj))
    );
  };

  const handleAddLocation = () => {
    setLocations((prev) => [...prev, { name: `Location ${prev.length + 1}`, details: "" }]);
  };

  const handleRemoveLocation = (index: number) => {
    setLocations((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleLocationChange = (index: number, field: "name" | "details", value: string) => {
    setLocations((prev) =>
      prev.map((loc, idx) => (idx === index ? { ...loc, [field]: value } : loc))
    );
  };

  const handleAddHazard = () => {
    setHazards((prev) => [...prev, { name: `Hazard ${prev.length + 1}`, details: "" }]);
  };

  const handleRemoveHazard = (index: number) => {
    setHazards((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleHazardChange = (index: number, field: "name" | "details", value: string) => {
    setHazards((prev) =>
      prev.map((haz, idx) => (idx === index ? { ...haz, [field]: value } : haz))
    );
  };

  const buildCharacterDetails = (char: CharacterDraft) => {
    const parts = [
      char.appearance ? `Appearance: ${char.appearance}` : "",
      char.gender ? `Gender: ${char.gender}` : "",
      char.age ? `Age: ${char.age}` : "",
      char.typegender ? `TypeGender: ${char.typegender}` : "",
      char.size ? `Size: ${char.size}` : "",
      char.role ? `Role: ${char.role}` : "",
      char.outfit ? `Outfit: ${char.outfit}` : "",
      char.accessories ? `Accessories: ${char.accessories}` : "",
      char.expression ? `Expression: ${char.expression}` : "",
      char.colors ? `Colors: ${char.colors}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    if (parts) return parts;
    return char.details ? char.details : "";
  };

  const buildCharacterCopyText = () => {
    const lines: string[] = ["Characters"];
    characters.forEach((char, idx) => {
      lines.push(`Character ${idx + 1}`);
      lines.push(`Name: ${char.name || `Character ${idx + 1}`}`);
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
      if (char.details && !buildCharacterDetails(char))
        lines.push(char.details);
      lines.push("");
    });
    return lines.join("\n").trim();
  };

  const buildAssetCopyText = () => {
    const sections: string[] = [];
    if (characters.length > 0) sections.push(buildCharacterCopyText(), "");
    if (objects.length > 0) {
      sections.push("Objects");
      objects.forEach((obj, idx) => {
        sections.push(`Object ${idx + 1}`);
        sections.push(`Name: ${obj.name || `Object ${idx + 1}`}`);
        if (obj.details) sections.push(obj.details.replace(/\s*\|\s*/g, "\n"));
        sections.push("");
      });
    }
    if (locations.length > 0) {
      sections.push("Locations");
      locations.forEach((loc, idx) => {
        sections.push(`Location ${idx + 1}`);
        sections.push(`Name: ${loc.name || `Location ${idx + 1}`}`);
        if (loc.details) sections.push(`Details: ${loc.details}`);
        sections.push("");
      });
    }
    if (hazards.length > 0) {
      sections.push("Hazards & Obstacles");
      hazards.forEach((haz, idx) => {
        sections.push(`Hazard ${idx + 1}`);
        sections.push(`Name: ${haz.name || `Hazard ${idx + 1}`}`);
        if (haz.details) sections.push(`Details: ${haz.details}`);
        sections.push("");
      });
    }
    return sections.join("\n").trim();
  };

  const handleCopyCharacters = async () => {
    const text = buildCharacterCopyText();
    if (!text) {
      setAssetCopyStatus("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setAssetCopyStatus("Copied!");
    } catch {
      setAssetCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setAssetCopyStatus(""), 2000);
    }
  };

  const handleCopyAllAssets = async () => {
    const text = buildAssetCopyText();
    if (!text) {
      setAssetCopyStatus("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setAssetCopyStatus("Copied!");
    } catch {
      setAssetCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setAssetCopyStatus(""), 2000);
    }
  };

  const handleCopyObjects = async () => {
    if (objects.length === 0) return;
    const sections: string[] = ["Objects"];
    objects.forEach((obj, idx) => {
      sections.push(`Object ${idx + 1}`);
      sections.push(`Name: ${obj.name || `Object ${idx + 1}`}`);
      if (obj.details) sections.push(obj.details.replace(/\s*\|\s*/g, "\n"));
      sections.push("");
    });
    await navigator.clipboard.writeText(sections.join("\n").trim());
  };

  const handleCopyLocations = async () => {
    if (locations.length === 0) return;
    const sections: string[] = ["Locations"];
    locations.forEach((loc, idx) => {
      sections.push(`Location ${idx + 1}`);
      sections.push(`Name: ${loc.name || `Location ${idx + 1}`}`);
      if (loc.details) sections.push(`Details: ${loc.details}`);
      sections.push("");
    });
    await navigator.clipboard.writeText(sections.join("\n").trim());
  };

  const handleCopyHazards = async () => {
    if (hazards.length === 0) return;
    const sections: string[] = ["Hazards & Obstacles"];
    hazards.forEach((haz, idx) => {
      sections.push(`Hazard ${idx + 1}`);
      sections.push(`Name: ${haz.name || `Hazard ${idx + 1}`}`);
      if (haz.details) sections.push(`Details: ${haz.details}`);
      sections.push("");
    });
    await navigator.clipboard.writeText(sections.join("\n").trim());
  };

  const extractSectionText = (text: string, start: RegExp, ends: RegExp[]) => {
    const startMatch = text.match(start);
    if (!startMatch || startMatch.index === undefined) return "";
    const sliceStart = startMatch.index + startMatch[0].length;
    const remaining = text.slice(sliceStart);
    let endIndex = remaining.length;
    for (const end of ends) {
      const m = remaining.match(end);
      if (m && m.index !== undefined) {
        endIndex = Math.min(endIndex, m.index);
      }
    }
    return remaining.slice(0, endIndex).trim();
  };

  const extractBulletedItems = (section: string) => {
    const lines = section
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const items: string[] = [];
    lines.forEach((line) => {
      const bulletMatch = line.match(/^[-*]\s*(.+)$/);
      if (bulletMatch) {
        items.push(bulletMatch[1].trim());
      }
    });
    return items;
  };

  const parseStoryInput = (text: string) => {
    const summaryPart =
      text.split(/^\s*(Characters|Objects|Locations|Hazards\s*&\s*Obstacles|Hazards)\s*$/im)[0] ||
      "";
    const summary = summaryPart.replace(/^\s*Summary\s*/i, "").trim() || "";
    const characterCountMatch = text.match(/Character\s*count\s*:\s*(\d+)/i);
    const declaredCount = characterCountMatch ? Number(characterCountMatch[1]) : null;
    const characterBlocks = text.split(/(?:^|\n)Character\s+\d+/i).slice(1);
    const parsedCharacters = characterBlocks
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
        : text.match(/(?:^|\n)Character\s+\d+/gi)?.length || parsedCharacters.length;
    const objectBlocks = text
      .split(/(?:^|\n)Object\s+\d+/i)
      .slice(1);
    const parsedObjects = objectBlocks
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
    const parsedLocationsFromBlocks = locationBlocks
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
        const name =
          nameLine ||
          `Location ${idx + 1}`;
        const leftoverLines = looseLines.filter(
          (line) => line !== fallbackLine && line !== parsedFallback?.name
        );
        const details =
          detailsMatch?.[1]?.trim() ||
          parsedFallback?.details ||
          nextDetailLine ||
          (parsedFallback?.name ? "" : fallbackLine) ||
          leftoverLines.join(" ");
        return {
          name,
          details,
        };
      })
      .filter((loc) => loc.name || loc.details);

    const hazardBlocks = text
      .split(/(?:^|\n)Hazard\s+\d+/i)
      .slice(1)
      .map((block) => trimBlockToSection(block));
    const parsedHazardsFromBlocks = hazardBlocks
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
        const name =
          nameLine ||
          `Hazard ${idx + 1}`;
        const leftoverLines = looseLines.filter(
          (line) => line !== fallbackLine && line !== parsedFallback?.name
        );
        const details =
          detailsMatch?.[1]?.trim() ||
          parsedFallback?.details ||
          nextDetailLine ||
          (parsedFallback?.name ? "" : fallbackLine) ||
          leftoverLines.join(" ");
        return {
          name,
          details,
        };
      })
      .filter((haz) => haz.name || haz.details);

    const locationsSection = extractSectionText(text, /LOCATION DESIGN|LOCATIONS/i, [
      /HAZARDS & OBSTACLES|HAZARDS/i,
      /OBJECT DESIGN|OBJECTS/i,
      /CHARACTER DESIGN|CHARACTERS/i,
    ]);
    const hazardsSection = extractSectionText(text, /HAZARDS & OBSTACLES|HAZARDS/i, [
      /OBJECT DESIGN|OBJECTS/i,
      /CHARACTER DESIGN|CHARACTERS/i,
      /LOCATION DESIGN|LOCATIONS/i,
    ]);
    const parsedLocationsFromBullets = extractBulletedItems(locationsSection)
      .map((item) => parseNameDetailsLine(item))
      .map((item) => ({
        name: item.name,
        details: item.details,
      }))
      .filter((item) => item.name);
    const parsedHazardsFromBullets = extractBulletedItems(hazardsSection)
      .map((item) => parseNameDetailsLine(item))
      .map((item) => ({
        name: item.name,
        details: item.details,
      }))
      .filter((item) => item.name);
    const parsedLocations =
      parsedLocationsFromBlocks.length > 0
        ? parsedLocationsFromBlocks
        : parsedLocationsFromBullets;
    const parsedHazards =
      parsedHazardsFromBlocks.length > 0
        ? parsedHazardsFromBlocks
        : parsedHazardsFromBullets;
    const parsedScenes = parseSceneBlocks(text);
    return {
      summary,
      characters: parsedCharacters.slice(0, inferredCount),
      objects: parsedObjects,
      locations: parsedLocations,
      hazards: parsedHazards,
      scenes: parsedScenes,
    };
  };

  const handleParseFromStory = () => {
      const parsed = parseStoryInput(storyPaste);

      if (parsed.summary) setStoryIdea(parsed.summary);

      if (parsed.characters.length > 0) {
        setCharacters(
          parsed.characters.map((char, idx) => {
            const rawName = char.name?.trim() || "";
            const normalized = rawName.toLowerCase();
            const safeName =
              normalized === "unknown" || /^character\s*\d+$/i.test(rawName)
                ? `Main character ${idx + 1}`
                : rawName;
            return { ...char, name: safeName };
          })
        );
        setLocked(true);
      }

      if (parsed.objects.length > 0) {
        setObjects(parsed.objects);
        setLocked(true);
      }
      
      if (parsed.locations.length > 0) {
        setLocations(parsed.locations);
      }
      
      if (parsed.hazards.length > 0) {
        setHazards(parsed.hazards);
      }

      // NEW: Load extracted scenes into state
      if (parsed.scenes && parsed.scenes.length > 0) {
        setScenes(parsed.scenes);
        setSceneCount(parsed.scenes.length); // Auto-update scene count number
        setScenePage(1); // Reset pagination to start
      }
  };
  
  const buildPrompt = () => {
      const globalStyleDetail = [
        `${getStoryPresetLabel(storySelected)}`,
        STORY_PRESET_RULES[storySelected] ? STORY_PRESET_RULES[storySelected] : "",
        visualStyle === "real" ? "Realistic, grounded visuals" : `Visual style: ${visualStyle}`,
        emotionStyle === "emotional" ? "Emotional, heart-warming tone" : `Emotion: ${emotionStyle}`,
        cinematicStyle === "cinematic"
          ? "Cinematic framing, smooth camera movement"
          : `Cinematic: ${cinematicStyle}`,
        audioStyle === "both"
          ? "Audio: voice + background"
          : audioStyle === "background"
          ? "Audio: background only"
          : audioStyle === "voice-only"
          ? "Audio: voice only"
          : "Audio: ASMR",
        `Aspect ratio ${aspectRatio}`,
      ]
        .filter(Boolean)
        .join(", ");

      const characterMappings = characters
        .map((char, idx) => {
          // We build the full visual string here
          const details = buildCharacterDetails(char); 
          // We create a strict rule for the AI
          return `TARGET: "Character ${idx + 1}" -> REPLACEMENT: "${details}"`;
        })
        .join("\n");

      const objectText = objects
        .map((obj, idx) => {
          const name = obj.name && obj.name.toLowerCase() !== "unknown"
            ? obj.name
            : `Object ${idx + 1}`;
          const header = `Object: ${name}`;
          const detail = obj.details ? `Details: ${obj.details}` : "Details: unknown";
          return `${header}\n${detail}`;
        })
        .join("\n\n");

      const locationText = locations
        .map((loc, idx) => {
          const name = loc.name && loc.name.toLowerCase() !== "unknown"
            ? loc.name
            : `Location ${idx + 1}`;
          const detail = loc.details ? `Details: ${loc.details}` : "";
          return detail ? `${name} — ${detail}` : name;
        })
        .join("\n");

      const hazardText = hazards
        .map((haz, idx) => {
          const name = haz.name && haz.name.toLowerCase() !== "unknown"
            ? haz.name
            : `Hazard ${idx + 1}`;
          const detail = haz.details ? `Details: ${haz.details}` : "";
          return detail ? `${name} — ${detail}` : name;
        })
        .join("\n");

      const allowObjectTransform = storySelected === "unreal-furniture-asmr"
        ? "You may reshape/transform listed objects into furniture-like forms, but do NOT introduce any new objects. Change furniture material/style each scene."
        : "";
      const allowEatAsmr = storySelected === "eat-asmr"
        ? "EAT ASMR RULE: You may introduce new edible items (food only) for variety. Keep the same character(s) with identical appearance and details across all scenes. Focus on eating actions and textures."
        : "";
      const allowCutAsmr = storySelected === "cut-asmr"
        ? "CUT ASMR RULE: Every scene must involve cutting or slicing. Focus on blades, clean cuts, crisp sounds, and cut textures. Keep objects consistent."
        : "";
      const allowCookingAsmr = storySelected === "cooking-asmr"
        ? "COOKING ASMR RULE: Every scene must involve cooking actions (prep, chopping, mixing, sizzling, plating). Keep the same character(s) if selected. Focus on cooking sounds and textures."
        : "";
      const allowHelpAnimal = storySelected === "help-animal"
        ? "HELP ANIMAL THEME: The overall story is about helping an animal. Focus on realistic actions."
        : "";

      const materialRule =
        materialStyle && materialStyle !== "original"
          ? `Material focus: ${materialStyle}.`
          : "Material focus: original.";

      const continuityRule = [
        sameCharacter
          ? "Same characters in all scenes with identical appearance, outfits, accessories, and colors."
          : "",
        changeCharacter ? "Change character across scenes." : "",
        sameObject ? "Same objects in all scenes." : "",
        changeObject ? "Change objects across scenes." : "",
        changeBackground ? "Change background each scene." : "",
        sameBackground ? "Use the same background each scene." : "",
      ]
        .filter(Boolean)
        .join(" ");

      return [
            "You are a Video Prompt Generator API.",
            "Generate a long-form scene outline based on the story below.",
            `Total scenes: ${sceneCount}.`,

            // 🔴 STRICT JSON OUTPUT
            "OUTPUT FORMAT: STRICT JSON ONLY.",
            `JSON SCHEMA: { "scenes": [ { "title": "Scene 1", "summary": "Full video prompt", "action": "Action description", "visual": "Visual details" } ] }`,

            // 🔴 THE "NO ID" RULE (FIXED)
            "*** CRITICAL SEARCH & REPLACE INSTRUCTION ***:",
            "1. You are FORBIDDEN from using ID labels like: 'Character 1', 'Character 2', 'Main Character', 'The Cat'.",
            "2. You MUST replace every reference with the FULL VISUAL REPLACEMENT string provided below.",
            "3. CHECK EVERY SENTENCE: Does it say 'Character 1'? -> DELETE IT -> WRITE the full Replacement String.",
            "4. Do this for the 'summary', 'action', and 'visual' fields.",
            
            "   BAD OUTPUT: '16:9 Medium shot of Character 1 running.'",
            "   GOOD OUTPUT: '16:9 Medium shot of a small orange tabby cat with a yellow hat running.'",

            // 🟢 LOGIC FOR OUTFITS/INJURIES
            locked
              ? [
                  "*** ADAPTIVE APPEARANCE LOGIC ***:",
                  "1. BASE APPEARANCE: Use the provided Species/Fur/Face details always.",
                  "2. CONTEXTUAL CLOTHES: Use the listed Outfit (Hat/Diaper/etc) by default.",
                  "   - EXCEPTION: If the scene is a HOSPITAL -> Remove outfit, add 'white bandages' or 'medical cone'.",
                  "   - EXCEPTION: If the scene is SWIMMING -> Remove heavy clothes.",
                  "   - EXCEPTION: If sleeping -> Remove hat.",
                  "3. INJURY TRACKING: If they get hurt, ADD 'limping' or 'blood' to the description in all future scenes.",
                  "4. NEVER be lazy. Always write the full description."
                ].join("\n")
              : "Characters can evolve freely.",

            // 🟢 WRITING STYLE
            "WRITING STYLE:",
            "- Start with the Aspect Ratio (e.g., 16:9).",
            "- Describe lighting, texture, camera movement.",
            "- No narrative fluff ('He felt sad'). Visuals only ('His ears drooped').",

            `GLOBAL STYLE: ${globalStyleDetail}.`,
            `Story type: ${getStoryPresetLabel(storySelected)}.`,
            materialRule,
            continuityRule,

            "STORY INPUT DATA:",
            `Story Idea: ${storyIdea || "None"}`,
            `Scene Outline Ideas: ${sceneOutlineIdea || "None"}`,
            
            "*** CHARACTER REPLACEMENT LIST (USE THIS TO SWAP IDs FOR VISUALS) ***:",
            characterMappings, // <--- This is now strictly defined at the top
            
            "OBJECTS:", objectText,
            "LOCATIONS:", locationText,
            "HAZARDS:", hazardText,
            
            allowObjectTransform,
            allowEatAsmr,
            allowCutAsmr,
            allowCookingAsmr,
            allowHelpAnimal,
      ].join("\n");
    };

  const handleGenerateScenes = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tools/gemini/story-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "instant",
          sceneCount,
          prompt: buildPrompt(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Scene generation failed");
      }
      const parsed = parseStoryJson(String(data?.text || ""));
      const parsedScenes = Array.isArray(parsed?.scenes)
        ? parsed.scenes
        : Array.isArray(parsed)
        ? parsed
        : [];
      const parsedSheet = Array.isArray(parsed?.character_sheet)
        ? parsed.character_sheet
        : Array.isArray(parsed?.characterSheet)
        ? parsed.characterSheet
        : [];
      const fallbackScenes =
        parsedScenes.length === 0 ? parseSceneBlocks(String(data?.text || "")) : [];
      if (parsedScenes.length === 0 && fallbackScenes.length === 0) {
        throw new Error("No scenes returned");
      }
      setScenes(
        (parsedScenes.length > 0 ? parsedScenes : fallbackScenes).map(
          (scene: SceneItem, idx: number) => ({
          title: String(scene?.title || `Scene ${idx + 1}`),
          summary: String(scene?.summary || ""),
          visual: String(scene?.visual || ""),
          actions: String(scene?.actions || ""),
          camera: String(scene?.camera || ""),
          audio: String(scene?.audio || ""),
        })
        )
      );
      setCharacterSheet(
        parsedSheet
          .map((item: { name?: string; details?: string }, idx: number) => ({
            name: String(item?.name || `Character ${idx + 1}`),
            details: String(item?.details || ""),
          }))
          .filter((item: CharacterSheetItem) => item.name || item.details)
      );
      setScenePage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetScenes = () => {
    setStoryIdea("");
    setStoryTitle("");
    setStoryPaste("");
    setAspectRatio("16:9");
    setStorySelected("animation");
    setVisualStyle("real");
    setEmotionStyle("emotional");
    setCinematicStyle("cinematic");
    setAudioStyle("both");
    setMaterialStyle("original");
    setSameCharacter(true);
    setChangeCharacter(false);
    setSameObject(true);
    setChangeObject(false);
    setChangeBackground(true);
    setSameBackground(false);
    setIncludeCharacterDetails(false);
    setSceneCount(10);
    setCharacters([{ name: "Character 1", appearance: "" }]);
    setCharacterEditIndex(null);
    setPasteCharacterDraft("");
    setObjects([]);
    setLocked(true);
    setError("");
    setScenes([]);
    setCharacterSheet([]);
    setScenePage(1);
    setSceneCopyStatus("");
    setAssetCopyStatus("");
  };

  const formatSceneText = (scene: SceneItem, index: number) => {
    const number = index + 1;
    const paragraph =
      scene.summary ||
      [scene.visual, scene.actions, scene.camera, scene.audio]
        .filter(Boolean)
        .join(" ");
    return [
      `Scene ${number} – ${scene.title || `Scene ${number}`}`,
      "",
      paragraph,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const buildHeaderText = () => {
    const title = storyTitle.trim() || "Story Title";
    const globalStyle = [
      `${getStoryPresetLabel(storySelected)}`,
      STORY_PRESET_RULES[storySelected] ? STORY_PRESET_RULES[storySelected] : "",
      visualStyle === "real" ? "Realistic visuals" : `Visual: ${visualStyle}`,
      emotionStyle === "emotional" ? "Emotional tone" : `Emotion: ${emotionStyle}`,
      cinematicStyle === "cinematic"
        ? "Cinematic framing, smooth camera moves"
        : `Cinematic: ${cinematicStyle}`,
      audioStyle === "both"
        ? "Audio: voice + background"
        : audioStyle === "background"
        ? "Audio: background only"
        : audioStyle === "voice-only"
        ? "Audio: voice only"
        : "Audio: ASMR",
      `Aspect: ${aspectRatio}`,
      materialStyle !== "original" ? `Material: ${materialStyle}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const characterLines = (characterSheet.length > 0 ? characterSheet : characters).map(
      (char, idx) => {
        const name = char.name?.trim() || `Character ${idx + 1}`;
        if ("details" in char && char.details) {
          return `* **${name}**: Details: ${char.details}`;
        }
        const detailText = buildCharacterDetails(char as CharacterDraft);
        return `* **${name}**: ${detailText ? `Details: ${detailText}` : "Details: unknown"}`;
      }
    );

    const locationLines = locations.map((loc, idx) => {
      const name = loc.name?.trim() || `Location ${idx + 1}`;
      const details = loc.details?.trim();
      return details ? `* **${name}**: ${details}` : `* **${name}**`;
    });

    const hazardLines = hazards.map((haz, idx) => {
      const name = haz.name?.trim() || `Hazard ${idx + 1}`;
      const details = haz.details?.trim();
      return details ? `* **${name}**: ${details}` : `* **${name}**`;
    });

    const objectLines = objects.map((obj, idx) => {
      const name = obj.name?.trim() || `Object ${idx + 1}`;
      const details = obj.details?.trim();
      return details ? `* **${name}**: ${details}` : `* **${name}**`;
    });

    return [
      "STORY TITLE",
      title,
      "",
      "GLOBAL STYLE (USE FOR ALL SCENES)",
      globalStyle,
      "",
      "1️⃣ MOVIE CONCEPT",
      storyIdea.trim() || "No concept provided.",
      "",
      `2️⃣ CHARACTER DESIGN (${locked ? "LOCKED" : "EDITABLE"})`,
      characterLines.join("\n") || "* None",
      "",
      "3️⃣ LOCATION DESIGN",
      locationLines.join("\n") || "* None",
      "",
      "4️⃣ HAZARDS & OBSTACLES",
      hazardLines.join("\n") || "* None",
      "",
      "5️⃣ OBJECT DESIGN",
      objectLines.join("\n") || "* None",
      "",
      `🎬 ${title.toUpperCase()} — ${sceneCount} SCENE STORY`,
    ].join("\n");
  };

  const handleCopyAllScenes = async () => {
    if (scenes.length === 0) return;
    const text = [
      buildHeaderText(),
      "",
      scenes.map((scene, idx) => formatSceneText(scene, idx)).join("\n\n"),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setSceneCopyStatus("Copied all scenes!");
    } catch {
      setSceneCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setSceneCopyStatus(""), 2000);
    }
  };

  const handleCopyScene = async (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    try {
      await navigator.clipboard.writeText(formatSceneText(scene, sceneIndex));
      setSceneCopyStatus(`Copied scene ${sceneIndex + 1}!`);
    } catch {
      setSceneCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setSceneCopyStatus(""), 2000);
    }
  };

  const handleCopyHeader = async () => {
    try {
      await navigator.clipboard.writeText(buildHeaderText());
      setHeaderCopyStatus("Copied header!");
    } catch {
      setHeaderCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setHeaderCopyStatus(""), 2000);
    }
  };

  const handleDownloadScenes = () => {
    if (scenes.length === 0) return;
    const text = [
      buildHeaderText(),
      "",
      scenes.map((scene, idx) => formatSceneText(scene, idx)).join("\n\n"),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scenes.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerateYoutubeIdea = async () => {
    setYoutubeError("");
    setYoutubeResult(null);
    const baseSummary = storyIdea.trim();
    const title = storyTitle.trim();
    const sceneSnippets = scenes
      .slice(0, 5)
      .map((scene, idx) => `Scene ${idx + 1}: ${scene.title} - ${scene.summary}`)
      .join("\n");
    if (!baseSummary && scenes.length === 0) {
      setYoutubeError("Provide a story idea or generate scenes first.");
      return;
    }
    setYoutubeLoading(true);
    try {
      const prompt = [
        "You are a YouTube marketing assistant for animated story videos.",
        "Generate a viral YouTube title and thumbnail concept based on the story.",
        "Return STRICT JSON only with this shape:",
        '{ "title": "...", "thumbnail_text": "...", "thumbnail_idea": "..." }',
        "Rules:",
        "- Title must be under 60 characters.",
        "- Thumbnail text must be under 6 words.",
        "- Thumbnail idea should describe a single striking frame.",
        "- Do NOT use emojis.",
        "",
        title ? `STORY TITLE: ${title}` : "",
        baseSummary ? `STORY IDEA: ${baseSummary}` : "",
        sceneSnippets ? `SCENES:\n${sceneSnippets}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const res = await fetch("/api/tools/gemini/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: "instant" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "YouTube idea request failed");
      const text = String(data?.text || "");
      const parsed = parseStoryJson(text);
      const titleValue = String(parsed?.title || "").trim();
      const thumbnailTextValue = String(parsed?.thumbnail_text || "").trim();
      const thumbnailIdeaValue = String(parsed?.thumbnail_idea || "").trim();
      if (!titleValue && !thumbnailTextValue && !thumbnailIdeaValue) {
        setYoutubeError("No YouTube idea returned.");
        return;
      }
      setYoutubeResult({
        title: titleValue,
        thumbnailText: thumbnailTextValue,
        thumbnailIdea: thumbnailIdeaValue,
      });
    } catch (err) {
      setYoutubeError(err instanceof Error ? err.message : String(err));
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleCopyYoutubeIdea = async () => {
    if (!youtubeResult) return;
    const text = [
      `Title: ${youtubeResult.title || "Untitled"}`,
      `Thumbnail Text: ${youtubeResult.thumbnailText || ""}`,
      `Thumbnail Idea: ${youtubeResult.thumbnailIdea || ""}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setYoutubeCopyStatus("Copied!");
    } catch {
      setYoutubeCopyStatus("Copy failed.");
    } finally {
      window.setTimeout(() => setYoutubeCopyStatus(""), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
            Story to Scene
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            Story to Scene Generator
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            Paste your story idea, lock characters, and generate scene-by-scene output.
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
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Paste Characters + Objects + Locations + Hazards (from Text to Story)
                </label>
                <textarea
                  value={storyPaste}
                  onChange={(e) => setStoryPaste(e.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  placeholder="Paste Characters + Objects + Locations + Hazards here..."
                />
                <button
                  onClick={handleParseFromStory}
                  className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400"
                >
                  Use pasted assets (characters / objects / locations / hazards)
                </button>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Story idea
                </label>
                <textarea
                  value={storyIdea}
                  onChange={(e) => setStoryIdea(e.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Scene outline ideas (paste here)
                </label>
                <textarea
                  value={sceneOutlineIdea}
                  onChange={(e) => setSceneOutlineIdea(e.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  placeholder="Scene 1 - ...&#10;Scene 2 - ..."
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Story title
                </label>
                <input
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  placeholder="The Kindest Rescue"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Aspect ratio
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="1:1">1:1</option>
                    <option value="4:3">4:3</option>
                    <option value="3:4">3:4</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Scene count
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={200}
                    value={sceneCount}
                    onChange={(e) => setSceneCount(Number(e.target.value || 10))}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={locked}
                      onChange={(e) => setLocked(e.target.checked)}
                    />
                    Lock characters
                  </label>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Visual style
                  </label>
                  <select
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="real">Real</option>
                    <option value="realistic">Realistic</option>
                    <option value="real-life">Real-life</option>
                    <option value="3d">3D</option>
                    <option value="2d">2D Animation</option>
                    <option value="anime">Anime</option>
                    <option value="cartoon">Cartoon</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Emotion
                  </label>
                  <select
                    value={emotionStyle}
                    onChange={(e) => setEmotionStyle(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="emotional">Emotional Story</option>
                    <option value="family">Family Story</option>
                    <option value="friendship">Friendship</option>
                    <option value="romance">Romance</option>
                    <option value="sad-ending">Sad Ending</option>
                    <option value="happy-ending">Happy Ending</option>
                    <option value="inspirational">Inspirational</option>
                    <option value="life-lesson">Life Lesson</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Cinematic
                  </label>
                  <select
                    value={cinematicStyle}
                    onChange={(e) => setCinematicStyle(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="cinematic">Cinematic Story</option>
                    <option value="documentary">Documentary Style</option>
                    <option value="biography">Biography</option>
                    <option value="historical">Historical Story</option>
                    <option value="mythology">Mythology</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Audio
                  </label>
                  <select
                    value={audioStyle}
                    onChange={(e) => setAudioStyle(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="background-only">Background music only</option>
                    <option value="voice-only">Voice only</option>
                    <option value="both">Voice + background</option>
                    <option value="asmr">ASMR</option>
                  </select>
                </div>
              </div>

              {(storySelected === "eat-asmr" ||
                storySelected === "cut-asmr" ||
                storySelected === "cooking-asmr") && (
                <div className="mt-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Material
                  </label>
                  <select
                    value={materialStyle}
                    onChange={(e) => setMaterialStyle(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="original">Original</option>
                    <optgroup label="Transparent / Glass-like">
                      <option value="glass">Glass</option>
                      <option value="crystal">Crystal</option>
                      <option value="ice">Ice</option>
                      <option value="frosted-glass">Frosted glass</option>
                      <option value="liquid-glass">Liquid glass</option>
                      <option value="acrylic">Acrylic (clear)</option>
                      <option value="resin">Resin (transparent)</option>
                      <option value="prism-glass">Prism glass</option>
                      <option value="optical-glass">Optical glass</option>
                      <option value="gel-glass">Gel glass</option>
                      <option value="water-crystal">Water crystal</option>
                      <option value="clear-silicone">Clear silicone</option>
                      <option value="transparent-polymer">Transparent polymer</option>
                    </optgroup>
                    <optgroup label="Soft / Melting / Flowing">
                      <option value="wax">Wax</option>
                      <option value="liquid-wax">Liquid wax</option>
                      <option value="gel">Gel</option>
                      <option value="jelly">Jelly</option>
                      <option value="slime">Slime</option>
                      <option value="gummy">Gummy</option>
                      <option value="syrup">Syrup</option>
                      <option value="honey">Honey</option>
                      <option value="caramel">Caramel</option>
                      <option value="chocolate-melt">Chocolate melt</option>
                      <option value="cream">Cream</option>
                      <option value="custard">Custard</option>
                      <option value="yogurt">Yogurt</option>
                      <option value="butter-melt">Butter melt</option>
                      <option value="soap-melt">Soap melt</option>
                    </optgroup>
                    <optgroup label="Soft & Bouncy">
                      <option value="foam">Foam</option>
                      <option value="memory-foam">Memory foam</option>
                      <option value="marshmallow">Marshmallow</option>
                      <option value="sponge">Sponge</option>
                      <option value="silicone-rubber">Silicone rubber</option>
                      <option value="latex">Latex</option>
                      <option value="soft-plastic">Soft plastic</option>
                      <option value="gel-foam">Gel foam</option>
                      <option value="air-filled">Air-filled material</option>
                    </optgroup>
                    <optgroup label="Hard & Smooth">
                      <option value="marble">Marble</option>
                      <option value="ceramic">Ceramic</option>
                      <option value="porcelain">Porcelain</option>
                      <option value="stone">Stone</option>
                      <option value="polished-rock">Polished rock</option>
                      <option value="granite">Granite</option>
                      <option value="obsidian">Obsidian</option>
                      <option value="metal-polished">Metal (polished)</option>
                      <option value="chrome">Chrome</option>
                      <option value="stainless-steel">Stainless steel</option>
                      <option value="aluminum">Aluminum</option>
                    </optgroup>
                    <optgroup label="Cold / Frozen">
                      <option value="ice-crystal">Ice crystal</option>
                      <option value="frozen-gel">Frozen gel</option>
                      <option value="snow">Snow</option>
                      <option value="frost">Frost</option>
                      <option value="ice-glass">Ice glass</option>
                      <option value="frozen-wax">Frozen wax</option>
                      <option value="cryo-surface">Cryo surface</option>
                    </optgroup>
                    <optgroup label="Fantasy / Unreal">
                      <option value="energy-crystal">Energy crystal</option>
                      <option value="light-material">Light-based material</option>
                      <option value="plasma-glass">Plasma glass</option>
                      <option value="holographic-surface">Holographic surface</option>
                      <option value="liquid-light">Liquid light</option>
                      <option value="magical-resin">Magical resin</option>
                      <option value="glow-gel">Glow gel</option>
                      <option value="cosmic-glass">Cosmic glass</option>
                      <option value="nebula-texture">Nebula texture</option>
                      <option value="aurora-material">Aurora material</option>
                    </optgroup>
                    <optgroup label="Liquid / Fluid">
                      <option value="water">Water</option>
                      <option value="milk">Milk</option>
                      <option value="oil">Oil</option>
                      <option value="ink">Ink</option>
                      <option value="paint">Paint</option>
                      <option value="lava">Lava (stylized)</option>
                      <option value="mercury-like">Mercury-like liquid</option>
                      <option value="pearl-liquid">Pearl liquid</option>
                      <option value="neon-fluid">Neon fluid</option>
                    </optgroup>
                    <optgroup label="Luxury / Aesthetic">
                      <option value="silk-glass">Silk glass</option>
                      <option value="satin-resin">Satin resin</option>
                      <option value="gold-infused-glass">Gold-infused glass</option>
                      <option value="pearl-surface">Pearl surface</option>
                      <option value="velvet-gel">Velvet gel</option>
                      <option value="mirror-chrome">Mirror chrome</option>
                      <option value="crystal-marble">Crystal marble</option>
                    </optgroup>
                  </select>
                </div>
              )}

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={sameCharacter}
                    onChange={(e) => setSameCharacter(e.target.checked)}
                  />
                  Same character
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={changeCharacter}
                    onChange={(e) => setChangeCharacter(e.target.checked)}
                  />
                  Change character
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={sameObject}
                    onChange={(e) => setSameObject(e.target.checked)}
                  />
                  Same object
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={changeObject}
                    onChange={(e) => setChangeObject(e.target.checked)}
                  />
                  Change object
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={changeBackground}
                    onChange={(e) => setChangeBackground(e.target.checked)}
                  />
                  Change background
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={sameBackground}
                    onChange={(e) => setSameBackground(e.target.checked)}
                  />
                  Same background
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeCharacterDetails}
                    onChange={(e) => setIncludeCharacterDetails(e.target.checked)}
                  />
                  Show full character details in scenes
                </label>
              </div>

              <CharacterList
                characters={characters}
                editIndex={characterEditIndex}
                onToggleEdit={setCharacterEditIndex}
                onRemove={handleRemoveCharacter}
                onChange={handleCharacterChange}
                onAdd={handleAddCharacter}
                onCopy={handleCopyCharacters}
                onCopyAll={handleCopyAllAssets}
                pasteDraft={pasteCharacterDraft}
                onPasteDraftChange={setPasteCharacterDraft}
                onPaste={handlePasteCharacter}
                copyStatus={assetCopyStatus}
                genderOptions={GENDER_OPTIONS}
                typeGenderOptions={TYPE_GENDER_OPTIONS}
                sizeOptions={SIZE_OPTIONS}
                ageOptionGroups={AGE_OPTION_GROUPS}
              />

              <GenericAssetList
                title="Objects"
                copyLabel="Copy objects"
                addLabel="Add object"
                emptyLabel="No objects found yet."
                items={objects}
                getName={(item) => item.name}
                getDetails={(item) => item.details}
                onChangeName={(index, value) => handleObjectChange(index, "name", value)}
                onChangeDetails={(index, value) =>
                  handleObjectChange(index, "details", value)
                }
                onRemove={handleRemoveObject}
                onAdd={handleAddObject}
                onCopy={handleCopyObjects}
                namePlaceholder="Object name"
                detailsPlaceholder="Object details"
              />

              <GenericAssetList
                title="Locations"
                copyLabel="Copy locations"
                addLabel="Add location"
                emptyLabel="No locations found yet."
                items={locations}
                getName={(item) => item.name}
                getDetails={(item) => item.details}
                onChangeName={(index, value) => handleLocationChange(index, "name", value)}
                onChangeDetails={(index, value) =>
                  handleLocationChange(index, "details", value)
                }
                onRemove={handleRemoveLocation}
                onAdd={handleAddLocation}
                onCopy={handleCopyLocations}
                namePlaceholder="Location name"
                detailsPlaceholder="Location details"
              />

              <GenericAssetList
                title="Hazards & Obstacles"
                copyLabel="Copy hazards"
                addLabel="Add hazard"
                emptyLabel="No hazards found yet."
                items={hazards}
                getName={(item) => item.name}
                getDetails={(item) => item.details}
                onChangeName={(index, value) => handleHazardChange(index, "name", value)}
                onChangeDetails={(index, value) =>
                  handleHazardChange(index, "details", value)
                }
                onRemove={handleRemoveHazard}
                onAdd={handleAddHazard}
                onCopy={handleCopyHazards}
                namePlaceholder="Hazard name"
                detailsPlaceholder="Hazard details"
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleGenerateScenes}
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-indigo-500/30 disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate scenes"}
                </button>
                <button
                  onClick={handleResetScenes}
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-50"
                >
                  New
                </button>
              </div>
              <button
                onClick={handleGenerateYoutubeIdea}
                disabled={loading || youtubeLoading}
                className="w-full rounded-2xl border border-emerald-400/60 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 hover:border-emerald-300 disabled:opacity-50"
              >
                {youtubeLoading
                  ? "Generating..."
                  : "Generate YouTube Title + Thumbnail"}
              </button>
              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}
              {youtubeError && (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  {youtubeError}
                </div>
              )}
              {youtubeResult && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                      YouTube Title + Thumbnail
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyYoutubeIdea}
                        className="rounded-full border border-emerald-400/60 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/20"
                      >
                        Copy all
                      </button>
                      {youtubeCopyStatus && (
                        <span className="text-xs text-emerald-200">
                          {youtubeCopyStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-emerald-100">
                    <p>
                      <span className="text-emerald-300">Title:</span>{" "}
                      {youtubeResult.title || "Untitled"}
                    </p>
                    <p>
                      <span className="text-emerald-300">Thumbnail Text:</span>{" "}
                      {youtubeResult.thumbnailText || "-"}
                    </p>
                    <p>
                      <span className="text-emerald-300">Thumbnail Idea:</span>{" "}
                      {youtubeResult.thumbnailIdea || "-"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm text-slate-200">
              {scenes.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-xs text-slate-300 whitespace-pre-wrap">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Header
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyHeader}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                      >
                        Copy header
                      </button>
                      {headerCopyStatus && (
                        <span className="text-xs text-slate-400">{headerCopyStatus}</span>
                      )}
                    </div>
                  </div>
                  {buildHeaderText()}
                  <div className="mt-3 text-[11px] text-slate-400">
                    Requested {sceneCount} scenes • Generated {scenes.length} scenes
                  </div>
                </div>
              )}
              {scenes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-300">
                  <button
                    onClick={handleCopyAllScenes}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                  >
                    Copy all scenes
                  </button>
                  <button
                    onClick={handleDownloadScenes}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                  >
                    Download text
                  </button>
                  {sceneCopyStatus && (
                    <span className="text-xs text-slate-400">{sceneCopyStatus}</span>
                  )}
                </div>
              )}
              {scenes
                .slice((scenePage - 1) * scenesPerPage, scenePage * scenesPerPage)
                .map((scene, idx) => (
                <div
                  key={`${scene.title}-${idx}-${scenePage}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Scene {(scenePage - 1) * scenesPerPage + idx + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{scene.title}</p>
                  <p className="mt-2 text-xs text-slate-300">{scene.summary}</p>
                  {scene.visual && (
                    <p className="mt-2 text-xs text-slate-400">Visual: {scene.visual}</p>
                  )}
                  {scene.actions && (
                    <p className="mt-1 text-xs text-slate-400">Actions: {scene.actions}</p>
                  )}
                  {scene.camera && (
                    <p className="mt-1 text-xs text-slate-400">Camera: {scene.camera}</p>
                  )}
                  {scene.audio && (
                    <p className="mt-1 text-xs text-slate-400">Audio: {scene.audio}</p>
                  )}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() =>
                        handleCopyScene((scenePage - 1) * scenesPerPage + idx)
                      }
                      className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
                    >
                      Copy scene
                    </button>
                  </div>
                </div>
              ))}
              {scenes.length > scenesPerPage && (
                <Pagination
                  currentPage={scenePage}
                  totalPages={Math.ceil(scenes.length / scenesPerPage)}
                  onPageChange={setScenePage}
                  className="border-slate-800 bg-slate-950/80 text-slate-300"
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

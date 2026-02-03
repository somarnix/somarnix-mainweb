// gstechedukh\app\components\promt\promptUtils.ts
import type { CharacterDraft, ObjectDraft, SceneItem } from "@/app/components/promt/types";

export const extractJsonPayload = (text: string) => {
  const trimmed = text.trim();
  const jsonFuncMatch = trimmed.match(/^json\(([\s\S]*)\)$/i);
  const cleaned = jsonFuncMatch ? jsonFuncMatch[1] : trimmed;
  const fenceMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : cleaned;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  const arrayMatch = candidate.match(/\[[\s\S]*\]/);
  const match = objectMatch || arrayMatch;
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

export const parseNameDetailsLine = (rawLine: string) => {
  const cleaned = rawLine
    .replace(/^\s*[-*]\s*/g, "")
    .replace(/\*\*/g, "")
    .trim();
  if (!cleaned) return { name: "", details: "" };
  if (cleaned.includes(":")) {
    const [namePart, ...rest] = cleaned.split(":");
    const name = namePart.trim();
    const details = rest.join(":").trim();
    return { name, details };
  }
  const dashMatch = cleaned.match(/^(.*?)\s*-\s*(.+)$/);
  if (dashMatch) {
    return { name: dashMatch[1].trim(), details: dashMatch[2].trim() };
  }
  return { name: cleaned.trim(), details: "" };
};

export const parseSingleCharacter = (text: string): CharacterDraft => {
  const nameMatch = text.match(/Name:\s*(.*)/i);
  const genderMatch = text.match(/Gender:\s*(.*)/i);
  const ageMatch = text.match(/Age:\s*(.*)/i);
  const typegenderMatch = text.match(/TypeGender:\s*(.*)/i);
  const sizeMatch = text.match(/Size:\s*(.*)/i);
  const roleMatch = text.match(/Role:\s*(.*)/i);
  const appearanceMatch = text.match(/Appearance:\s*(.*)/i);
  const outfitMatch = text.match(/Outfit:\s*(.*)/i);
  const accessoriesMatch = text.match(/Accessories:\s*(.*)/i);
  const expressionMatch = text.match(/Expression:\s*(.*)/i);
  const colorsMatch = text.match(/Colors:\s*(.*)/i);
  return {
    name: nameMatch?.[1]?.trim() || "Character",
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
};

export const parseSingleObject = (text: string): ObjectDraft => {
  const nameMatch = text.match(/Name:\s*(.*)/i);
  const descriptionMatch = text.match(/Description:\s*(.*)/i);
  const materialMatch = text.match(/Material:\s*(.*)/i);
  const conditionMatch = text.match(/Condition:\s*(.*)/i);
  const colorsMatch = text.match(/Colors:\s*(.*)/i);
  const looseLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(name|description|material|condition|colors)\s*:/i.test(line));
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
    name: nameMatch?.[1]?.trim() || "Object",
    details,
  };
};

export const parseSceneBlocks = (text: string): SceneItem[] => {
  const blocks = text.split(/(?:^|\n)Scene\s*\d+/i).slice(1);
  if (blocks.length === 0) return [];
  return blocks.map((block, idx) => {
    const titleMatch = block.match(/^\s*([^\n]+)/);
    const visualMatch = block.match(/Visual:\s*([\s\S]*?)(Actions:|Camera:|$)/i);
    const actionsMatch = block.match(/Actions:\s*([\s\S]*?)(Camera:|Audio:|$)/i);
    const cameraMatch = block.match(/Camera:\s*([\s\S]*?)(Audio:|$)/i);
    const audioMatch = block.match(/Audio:\s*([\s\S]*?)$/i);
    const summary = block
      .replace(/Visual:[\s\S]*/i, "")
      .replace(/Actions:[\s\S]*/i, "")
      .replace(/Camera:[\s\S]*/i, "")
      .replace(/Audio:[\s\S]*/i, "")
      .trim();
    const rawTitle = titleMatch ? titleMatch[1].trim() : `Scene ${idx + 1}`;
    const cleanTitle = rawTitle.replace(/^[\-–—]\s*/, "").trim() || rawTitle;
    return {
      title: cleanTitle,
      summary,
      visual: visualMatch ? visualMatch[1].trim() : "",
      actions: actionsMatch ? actionsMatch[1].trim() : "",
      camera: cameraMatch ? cameraMatch[1].trim() : "",
      audio: audioMatch ? audioMatch[1].trim() : "",
    };
  });
};

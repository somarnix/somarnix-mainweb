import { NextResponse } from "next/server";

type Body = {
  title?: string;
  subjectType?: string;
  subject?: string;
  breed?: string;
  actions?: string;
  scenes?: number;
  durationSeconds?: number;
  aspectRatio?: string;
  style?: string;
  mood?: string;
  environment?: string;
  timeOfDay?: string;
  weather?: string;
  cameraShot?: string;
  cameraMove?: string;
  lens?: string;
  lighting?: string;
  colorPalette?: string;
  transitions?: string;
  fps?: string;
  resolution?: string;
  audio?: string;
  textOverlay?: string;
  language?: string;
  quality?: string;
  negativePrompt?: string;
  notes?: string;
  lengthMode?: string;
  storyArc?: string;
  characterDetails?: string;
  outfit?: string;
  props?: string;
  characterName?: string;
  continuity?: string;
  appearance?: string;
  settingStyle?: string;
  narrativeTone?: string;
  detailLevel?: string;
  scenesList?: {
    title?: string;
    action?: string;
    camera?: string;
    duration?: number;
    mood?: string;
  }[];
};

const clean = (value?: string) => (value || "").trim();

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const title = clean(body.title);
  const subjectType = clean(body.subjectType) || "subject";
  const subject = clean(body.subject) || "unknown subject";
  const breed = clean(body.breed);
  const actions = clean(body.actions) || "natural movement";
  const scenes = Number(body.scenes || 1);
  const durationSeconds = Number(body.durationSeconds || 10);
  const aspectRatio = clean(body.aspectRatio) || "16:9";
  const style = clean(body.style) || "cinematic";
  const mood = clean(body.mood) || "calm";
  const environment = clean(body.environment) || "outdoor";
  const timeOfDay = clean(body.timeOfDay) || "daytime";
  const weather = clean(body.weather) || "clear";
  const cameraShot = clean(body.cameraShot) || "wide shot";
  const cameraMove = clean(body.cameraMove) || "slow pan";
  const lens = clean(body.lens) || "35mm";
  const lighting = clean(body.lighting) || "soft natural light";
  const colorPalette = clean(body.colorPalette) || "warm cinematic tones";
  const transitions = clean(body.transitions) || "clean cuts";
  const fps = clean(body.fps) || "24fps";
  const resolution = clean(body.resolution) || "4K";
  const audio = clean(body.audio) || "ambient + subtle music";
  const textOverlay = clean(body.textOverlay);
  const language = clean(body.language) || "English";
  const quality = clean(body.quality) || "ultra";
  const negativePrompt = clean(body.negativePrompt);
  const notes = clean(body.notes);
  const lengthMode = clean(body.lengthMode) || "short-form";
  const storyArc = clean(body.storyArc) || "clear beginning, middle, end";
  const characterDetails = clean(body.characterDetails);
  const outfit = clean(body.outfit);
  const props = clean(body.props);
  const characterName = clean(body.characterName);
  const continuity = clean(body.continuity);
  const appearance = clean(body.appearance);
  const settingStyle = clean(body.settingStyle) || "cozy cinematic setting";
  const narrativeTone = clean(body.narrativeTone) || "warm and vivid";
  const detailLevel = clean(body.detailLevel) || "long";
  const scenesList = Array.isArray(body.scenesList) ? body.scenesList : [];

  const subjectLine =
    subjectType === "animal" && breed ? `${subject} (${breed})` : subject;

  const baseLines = [
    title ? `Title: ${title}` : "",
    `Create a ${durationSeconds}s video in ${aspectRatio} with ${scenes} scene(s).`,
    `Subject: ${subjectType} - ${subjectLine}.`,
    characterName && characterName !== "none" ? `Character name: ${characterName}.` : "",
    characterDetails && characterDetails !== "none" ? `Character details: ${characterDetails}.` : "",
    outfit && outfit !== "none" ? `Outfit/wardrobe: ${outfit}.` : "",
    props && props !== "none" ? `Props: ${props}.` : "",
    continuity && continuity !== "none"
      ? `Continuity rules: ${continuity}. Keep character, outfit, location, and props consistent across all scenes.`
      : "Continuity rules: keep character, outfit, location, and props consistent across all scenes.",
    `Actions: ${actions}.`,
    `Style: ${style}. Mood: ${mood}. Quality: ${quality}.`,
    `Environment: ${environment}. Time: ${timeOfDay}. Weather: ${weather}.`,
    `Camera: ${cameraShot}, ${cameraMove}, lens ${lens}.`,
    `Lighting: ${lighting}. Color palette: ${colorPalette}.`,
    `Transitions: ${transitions}.`,
    `Frame rate: ${fps}. Resolution: ${resolution}.`,
    `Audio: ${audio}.`,
    textOverlay ? `On-screen text: "${textOverlay}" (${language}).` : "",
    `Length mode: ${lengthMode}. Story arc: ${storyArc}.`,
    notes ? `Extra notes: ${notes}` : "",
    negativePrompt ? `Avoid: ${negativePrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!scenesList.length) {
    return NextResponse.json({ prompt: baseLines, prompts: [baseLines] });
  }

  const characterLine =
    characterName && characterName !== "none"
      ? `The character is named ${characterName}.`
      : `The character is ${subjectLine}.`;

  const continuityLine =
    continuity && continuity !== "none"
      ? `Continuity: ${continuity}.`
      : "Continuity: keep character, outfit, location, and props consistent.";

  const appearanceLine =
    appearance && appearance !== "none"
      ? `Appearance: ${appearance}.`
      : "";

  const settingLine = `Setting: ${settingStyle}, ${environment}, ${timeOfDay}, ${weather}.`;

  const toneLine = `Narrative tone: ${narrativeTone}.`;

  const buildNarrative = (
    sceneTitle: string,
    sceneAction: string,
    sceneCamera: string,
    sceneMood: string,
    sceneDuration: string
  ) => {
    if (detailLevel === "short") {
      return [
        `${sceneTitle}.`,
        `${characterLine} ${continuityLine}`,
        settingLine,
        appearanceLine,
        `Outfit: ${outfit}. Props: ${props}.`,
        `Action: ${sceneAction}.`,
        `Camera: ${sceneCamera}, ${cameraMove}, lens ${lens}.`,
        `Mood: ${sceneMood}. Duration: ${sceneDuration}.`,
      ]
        .filter(Boolean)
        .join(" ");
    }

    const rich = [
      `${sceneTitle}.`,
      `${characterLine} ${appearanceLine}`.trim(),
      `They wear ${outfit} and carry ${props}.`,
      `${settingLine}`,
      `Action: ${sceneAction}.`,
      `Camera: ${sceneCamera}, ${cameraMove}, lens ${lens}.`,
      `Lighting: ${lighting}. Color palette: ${colorPalette}.`,
      `Mood: ${sceneMood}. Duration: ${sceneDuration}.`,
      toneLine,
    ]
      .filter(Boolean)
      .join(" ");

    if (detailLevel === "medium") {
      return rich;
    }

    return `${rich} Add sensory details (sound, texture, atmosphere) and keep character, outfit, and location identical in every scene.`;
  };

  const prompts = scenesList.map((scene, idx) => {
    const titleText = scene?.title ? `Scene ${idx + 1} – "${scene.title}"` : `Scene ${idx + 1}`;
    const sceneAction = scene?.action || actions;
    const sceneCamera = scene?.camera || cameraShot;
    const sceneMood = scene?.mood || mood;
    const sceneDuration =
      typeof scene?.duration === "number" && scene.duration > 0
        ? `${scene.duration}s`
        : `${Math.max(3, Math.floor(durationSeconds / scenes))}s`;

    const narrative = buildNarrative(
      titleText,
      sceneAction,
      sceneCamera,
      sceneMood,
      sceneDuration
    );

    return [baseLines, narrative].filter(Boolean).join("\n");
  });

  const combined = prompts.map((p, i) => `Prompt ${i + 1}:\n${p}`).join("\n\n");

  return NextResponse.json({ prompt: combined, prompts });
}

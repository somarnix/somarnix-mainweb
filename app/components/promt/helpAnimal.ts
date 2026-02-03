// gstechedukh\app\components\promt\helpAnimal.ts
export type HelpAnimalIdea = {
  title: string;
  one_line: string;
};

export const HELP_ANIMAL_SYSTEM_PROMPT = [
  "You are a cinematic animal-rescue movie generator.",
  "You create long-form, realistic, animated-style rescue movies where animals help other animals.",
  "Stories are emotional, adventurous, and escalate through real danger, failed attempts, and earned resolution.",
  "",
  "GLOBAL RULES:",
  "- No dialogue.",
  "- No narration.",
  "- No text on screen.",
  "- No gore or graphic violence.",
  "- Danger and loss are allowed.",
  "- Rescue must involve effort, failure, and problem-solving.",
  "- Movies must feel cinematic, not ASMR, not static.",
  "",
  "PART CONTROL:",
  "The user will specify a \"part\" value.",
  "",
  "PART 1:",
  "- Generate exactly 5 movie ideas.",
  "- Output STRICT JSON only.",
  "- Each idea includes: title, one_line (2-4 sentences).",
  "- Do NOT generate scenes.",
  "- Do NOT lock characters or locations yet.",
  "- Use ONLY animals implied by user input.",
  "- Do NOT invent unrelated species.",
  "- Ideas must be diverse: different conflict types, rescue methods, and structures.",
  "- Each idea must support long-form movies (40-80 scenes).",
  "",
  "PART 2:",
  "- Design a long-form movie blueprint.",
  "- Do NOT generate scenes.",
  "- Respect the provided title, logline, sceneCount, summary, characters, objects.",
  "- Do NOT change species.",
  "- If characters are cats, the movie must center on those cats.",
  "- If new elements are added and not restricted, label them clearly as NEW.",
  "- Output MARKDOWN only.",
  "",
  "MOVIE DESIGN REQUIREMENTS (PART 2):",
  "- Movie Concept: 2-3 paragraphs, long escalation, failures, aftermath.",
  "- Character Design: locked roles, personalities, emotional arcs.",
  "- Location Design: multiple locations allowed, all listed.",
  "- Hazards & Obstacles: escalating dangers.",
  "- Object Design: all props used.",
].join("\n");

export const HELP_ANIMAL_PART1_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "HelpAnimalIdeasResponse",
  "type": "object",
  "required": ["ideas"],
  "properties": {
    "ideas": {
      "type": "array",
      "minItems": 5,
      "maxItems": 5,
      "items": {
        "type": "object",
        "required": ["title", "one_line"],
        "properties": {
          "title": { "type": "string", "minLength": 3 },
          "one_line": { "type": "string", "minLength": 10 }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}`;

export const HELP_ANIMAL_PART2_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "HelpAnimalMovieDesign",
  "type": "object",
  "required": ["movieTitle","movieConcept","characters","locations","hazards","objects"],
  "properties": {
    "movieTitle": { "type": "string" },
    "movieConcept": { "type": "string" },
    "characters": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name","species","role","personality"],
        "properties": {
          "name": { "type": "string" },
          "species": { "type": "string" },
          "role": { "type": "string" },
          "personality": { "type": "string" },
          "isNew": { "type": "boolean" }
        }
      }
    },
    "locations": { "type": "array", "items": { "type": "string" } },
    "hazards": { "type": "array", "items": { "type": "string" } },
    "objects": { "type": "array", "items": { "type": "string" } }
  },
  "additionalProperties": false
}`;

export const buildHelpAnimalIdeaPrompt = (
  summary: string,
  characters: string,
  objects: string
) => {
  return [
    "YOU ARE WRITING HELP-ANIMAL RESCUE MOVIE IDEAS.",
    "Generate exactly 5 ideas.",
    "",
    "ABSOLUTE RULES (NO EXCEPTIONS):",
    "- Use ONLY the characters listed in CHARACTERS.",
    "- Use ONLY the objects listed in OBJECTS.",
    "- Use ONLY the environment/weather visible in SUMMARY.",
    "- DO NOT invent new animals, people, tools, vehicles, locations, or backstory.",
    "- DO NOT mention emotions, themes, morals, friendship, bonding, or past history.",
    "- If rescue logic cannot work with given assets, still write it WITHOUT adding anything new.",
    "",
    "EACH IDEA MUST BE PURE RESCUE ACTION:",
    "- The danger must be PHYSICAL and VISIBLE (cold, rain, injury, chain, traffic, fire, water).",
    "- No thinking, no planning, no memories, no lessons.",
    "",
    "one_line must be EXACTLY 4 SHORT SENTENCES:",
    "1) Who is in danger + what is physically wrong",
    "2) First rescue attempt fails + clear reason",
    "3) Situation escalates using environment or objects",
    "4) Rescue succeeds + animal is safe",
    "",
    "OUTPUT STRICT JSON ONLY:",
    '{ "ideas": [ { "title": string, "one_line": string } ] }',
    "",
    "SUMMARY:",
    summary || "(none)",
    "",
    "CHARACTERS (ONLY THESE):",
    characters || "(none)",
    "",
    "OBJECTS (ONLY THESE):",
    objects || "(none)",
  ].join("\n");
};

export const buildHelpAnimalAutoDesignPrompt = (
  title: string,
  oneLine: string,
  sceneCount: number,
  summary: string,
  characters: string,
  objects: string,
  lockInputAssetsOnly: boolean
) => {
  return [
    "PART: 2 — MOVIE BLUEPRINT",
    "OUTPUT: MARKDOWN only",
    `TOTAL SCENES: ${sceneCount}`,
    "Each scene = ~5 seconds",
    "Each scene MUST describe a DIFFERENT physical action",
    "",
    `MOVIE TITLE: ${title}`,
    `RESCUE LOGIC (FROM PART 1 — DO NOT CHANGE):`,
    oneLine,
    "",

    // 🔒 LOCK / EXPAND MODE
    lockInputAssetsOnly
      ? [
          "STRICT MODE (LOCK INPUT ASSETS ONLY):",
          "- You MUST NOT add any new Characters, Objects, Locations, or Hazards.",
          "- You MUST ONLY use the ALLOWED lists below.",
          "- If you cannot proceed, redesign the rescue using ONLY allowed assets.",
          "- NEVER invent names. NEVER write 'NEW'.",
        ].join("\n")
      : [
          "EXPAND MODE:",
          "- You MAY add new Characters/Objects/Locations/Hazards.",
          "- If you add anything, prefix the item name with 'NEW '.",
          "- New assets must be MINIMAL and rescue-related only.",
        ].join("\n"),

    "",
    summary ? `SUMMARY (DO NOT CHANGE SETTING/WEATHER):\n${summary}` : "",

    characters ? `ALLOWED CHARACTERS (ONLY THESE):\n${characters}` : "",
    objects ? `ALLOWED OBJECTS (ONLY THESE):\n${objects}` : "",

    "",
    // 🚨 CRITICAL FIX — THIS IS WHY YOUR MOVIES WERE BORING
    "SCENE DIVERSITY RULES (CRITICAL — FOLLOW STRICTLY):",
    `- You MUST generate EXACTLY ${sceneCount} scenes.`,
    "- No two consecutive scenes may show the same action.",
    "- EACH scene must introduce ONE new physical change:",
    "  (movement, grip, balance, tension, weather effect, injury state, position, or interaction).",
    "- DO NOT repeat actions like: walking, looking, planning, talking, thinking.",
    "",
    "RESCUE PHASE STRUCTURE (MANDATORY ORDER):",
    "PHASE 1 — Warning signs (danger building, no rescue yet)",
    "PHASE 2 — First rescue attempt FAILS",
    "PHASE 3 — Escalation (danger worsens, time pressure)",
    "PHASE 4 — ANIMAL-led rescue action (animal initiates key action)",
    "PHASE 5 — Stabilization & safety (breathing, warmth, stillness)",
    "",
    "If scenes repeat actions or skip phases, the output is INVALID.",
    "",
    // 🚫 BAN GENERIC MOVIE LANGUAGE
    "ABSOLUTE BANS:",
    "- NO themes, morals, lessons, bonding, backstory, future, hope, or emotions.",
    "- NO words like: learns, realizes, bond, meaning, journey, destiny.",
    "- Every sentence must be filmable as a 5-second visual clip.",
    "",
    // 📤 OUTPUT STRUCTURE
    "OUTPUT FORMAT (MARKDOWN ONLY — VERY IMPORTANT):",
    "- Do NOT use markdown tables.",
    "- Use ONLY bullet lists for sections 2–5.",
    "- Each bullet item must be ONE LINE.",
    "",
    "MOVIE TITLE",
    "1) MOVIE CONCEPT (FOCUSED ON RESCUE ONLY, 2–3 SHORT PARAGRAPHS)",
    "2) CHARACTER DESIGN",
    "   - Name: species | role in rescue | physical behavior",
    "3) LOCATION DESIGN",
    "   - LocationName: physical constraints",
    "4) HAZARDS & OBSTACLES",
    "   - HazardName: how it worsens the rescue",
    "5) OBJECT DESIGN",
    "   - ObjectName: how it is used physically",
  ].join("\n");
};
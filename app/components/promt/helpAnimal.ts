// gstechedukh\app\components\promt\helpAnimal.ts

export type HelpAnimalIdea = {
  title: string;
  one_line: string; // This holds the FULL long story from Part 1
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
  "PART 1 (STORY GENERATION):",
  "- Generate exactly 1 FULL MOVIE STORY based on the user's idea.",
  "- Output STRICT JSON only.",
  "- The 'one_line' field MUST be a long, multi-paragraph narrative (500-1000 words) sufficient to fill the requested scene count.",
  "- Do NOT summarize. Write the actual story beats chronologically.",
  "- Include: Context -> Incident -> Failed Attempts -> Escalation -> Complications -> Climax -> Resolution -> Aftermath.",
  "",
  "PART 2 (SCENE BREAKDOWN & BLUEPRINT):",
  "- Convert the 'one_line' story from Part 1 into a complete Movie Blueprint.",
  "- Section 1: Movie Concept (Summary of Part 1).",
  "- Section 2: Character Design (Map Part 1 characters to specific roles).",
  "- Section 3: Location Design (List all setting from Part 1).",
  "- Section 4: Hazards (List dangers from Part 1).",
  "- Section 5: Objects (List props from Part 1).",
  "- Section 6: Scene List (Slice the story into scenes).",
  "- Do NOT invent new story beats; just structure the Part 1 story.",
  "- Output MARKDOWN only.",
].join("\n");

export const HELP_ANIMAL_PART1_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "HelpAnimalIdeasResponse",
  "type": "object",
  "required": ["ideas"],
  "properties": {
    "ideas": {
      "type": "array",
      "minItems": 1,
      "maxItems": 1,
      "items": {
        "type": "object",
        "required": ["title", "one_line"],
        "properties": {
          "title": { "type": "string", "minLength": 3 },
          "one_line": { "type": "string", "minLength": 100 }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}`;

// Keep HELP_ANIMAL_PART2_SCHEMA if needed for validation, otherwise it's just for reference since output is Markdown.
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
  objects: string,
  userIdea: string,
  sceneCount: number,
  lockAssetsOnly: boolean
) => {
  const isLongStory = sceneCount >= 30;

  const structureInstructions = isLongStory
    ? [
        "TYPE: LONG FEATURE FILM NARRATIVE (Complex, Escalating)",
        `REQUIREMENT: You MUST write a detailed story complex enough to fill ${sceneCount} scenes.`,
        "CRITICAL RULE: The provided assets are NOT enough for a movie this length. You MUST invent NEW secondary characters (friends or enemies), NEW locations, and NEW hazards.",
        "STRUCTURE:",
        "1. ACT 1: Establish the bond -> The Inciting Incident -> First failed rescue attempt.",
        "2. ACT 2 (THE JOURNEY): They meet a NEW ally or a NEW enemy (e.g., a predator, a rival animal, or a human threat). The storm/danger gets worse.",
        "3. ACT 3 (THE CLIMAX): The situation looks hopeless. A major sacrifice or high-stakes action sequence involving the new elements.",
        "4. RESOLUTION: Safe rescue and emotional aftermath.",
      ]
    : [
        "TYPE: SHORT FILM NARRATIVE (Direct, Fast-Paced)",
        `REQUIREMENT: Write a punchy story for exactly ${sceneCount} scenes.`,
        "STRUCTURE:",
        "1. BEGINNING: Quick context -> Immediate Danger.",
        "2. MIDDLE: The Helper Animal gets the human -> The Rescue happens immediately.",
        "3. ENDING: Short struggle -> Success -> Safe walk away.",
      ];

  const assetModeInstruction = lockAssetsOnly
    ? "STRICT LOCK MODE: Do NOT add new characters or objects. You must write the story using ONLY the assets provided below."
    : `EXPANSION MODE (ACTIVE): To make this a ${sceneCount}-scene movie, you MUST invent new content. Introduce a new Helper Animal, a Villain, or a Human Rescuer that is NOT in the list below.`;

  return [
    "PART 1 — FULL STORY GENERATION",
    "OUTPUT STRICT JSON ONLY. No markdown, no headings.",
    'JSON SHAPE: { "ideas": [ { "title": string, "one_line": string } ] }',
    "",
    "ROLE:",
    "You are a master storyteller. You do not write 'summaries'. You write full, cinematic narratives.",
    "Do NOT copy or repeat the 'Summary' text provided below. Start your story with action.",
    "",
    ...structureInstructions,
    "",
    "NARRATIVE STYLE:",
    "- Write in past tense prose.",
    "- Focus on visual details: weather, textures, lighting.",
    "- Do NOT use bullet points in the story text. Write continuous paragraphs.",
    "",
    assetModeInstruction,
    "",
    "INPUT DATA:",
    "SUMMARY (Context only, do not repeat):",
    summary || "(none)",
    "",
    "CHARACTERS (Start with these, but add more if needed):",
    characters || "(none)",
    "",
    "OBJECTS:",
    objects || "(none)",
    "",
    "USER IDEA (DIRECTION):",
    userIdea || "(none)",
  ].join("\n");
};

export const buildHelpAnimalAutoDesignPrompt = (
  title: string,
  oneLine: string,
  sceneCount: number,
  summary: string,
  characters: string,
  objects: string,
  lockInputAssetsOnly: boolean,
  startScene: number = 1,
  endScene: number = sceneCount,
  includeBlueprint: boolean = true,
  previousContext: string = ""
) => {
  return [
    "PART: 2 — MOVIE BLUEPRINT & SCENE BREAKDOWN",
    "OUTPUT: MARKDOWN only",
    "IMPORTANT: DO NOT generate any JSON. DO NOT repeat Part 1 content verbatim.",
    `TOTAL SCENES TARGET: ${sceneCount}`,
    `CURRENT BATCH: Scene ${startScene} to Scene ${endScene}`,
    "",
    `MOVIE TITLE: ${title}`,
    "FULL STORY SOURCE (Use this to build the blueprint):",
    oneLine,
    "",
    previousContext
      ? `PREVIOUS STORY CONTEXT (CONTINUE SCENES FROM HERE):\n${previousContext}`
      : "",
    "",
    "INSTRUCTIONS:",
    "1.  Your job is to structure the 'FULL STORY SOURCE' above into a Movie Design.",
    "2.  Do not invent new plots that contradict the source story.",
    "3.  Pacing:",
    `    - You need to cover the story such that Scene ${sceneCount} is the ending.`,
    `    - If you are at Scene ${startScene} and the total is ${sceneCount}, pace yourself accordingly.`,
    "",
    "OUTPUT FORMAT (MARKDOWN ONLY):",
    // --- UPDATED SECTION: Removed Movie Concept, Renumbered Sections ---
    includeBlueprint ? [
      `# ${title}`,
      "",
      // "## 1) MOVIE CONCEPT" -> REMOVED
      
      "## 1) CHARACTER DESIGN", // Was 2
      "(List characters found in the story. Use format: * Name: species | role | behavior)",
      "",
      "## 2) LOCATION DESIGN", // Was 3
      "(List new characters. Format: * Name: Role | Detailed appearance and personality)",
      "",
      "## 3) HAZARDS & OBSTACLES", // Was 4
      "(List hazards found in the story. Use format: * HazardName: description)",
      "",
      "## 4) OBJECT DESIGN", // Was 5
      "(List objects found in the story. Use format: * ObjectName: description)",
      ""
    ].join("\n") : "",
    
    "## 5) SCENE LIST", // Was 6
    `Generate exactly scenes ${startScene} to ${endScene}.`,
    `Scene ${startScene}: **[Action Title]** [Description of action]`,
    "...",
    `Scene ${endScene}: **[Action Title]** [Description of action]`,
    `STOP generating after Scene ${endScene}.`,
  ].join("\n");
};
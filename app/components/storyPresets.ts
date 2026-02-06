// gstechedukh\app\components\storyPresets.ts
export type StoryPreset =
  | "animation"
  | "person"
  | "restoring"
  | "help-animal"
  | "help-person"
  | "cooking-animal"
  | "cooking-person"
  | "adventure"
  | "mystery"
  | "inspirational"
  | "life-lesson"
  | "viral"
  | "short-story"
  | "twist-ending"
  | "before-after"
  | "cut-asmr"
  | "eat-asmr"
  | "cooking-asmr"
  | "unreal-furniture-asmr"
  | "fantasy"
  | "magic"
  | "dragon"
  | "superhero"
  | "time-travel"
  | "sci-fi"
  | "ai-future"
  | "post-apocalypse"
  | "horror"
  | "thriller"
  | "psychological"
  | "ghost"
  | "urban-legend"
  | "survival"
  | "animal-rescue"
  | "animal-friendship"
  | "animal-adventure"
  | "animal-family"
  | "daily-life"
  | "poor-to-rich"
  | "struggle"
  | "work-life"
  | "student-life"
  | "childhood-memory"
  | "educational"
  | "moral-story"
  | "kids-story"
  | "bedtime-story"
;

export const STORY_PRESETS: { key: StoryPreset; label: string }[] = [
  { key: "animation", label: "Animation Story" },
  { key: "person", label: "Person Story" },
  { key: "restoring", label: "Restoring (Old to New)" },
  { key: "help-animal", label: "Help Animal" },
  { key: "help-person", label: "Help Person" },
  { key: "cooking-animal", label: "Cooking (Animal)" },
  { key: "cooking-person", label: "Cooking (Person)" },
  { key: "adventure", label: "Adventure" },
  { key: "mystery", label: "Mystery" },
  { key: "inspirational", label: "Inspirational" },
  { key: "life-lesson", label: "Life Lesson" },
  { key: "viral", label: "Viral Story" },
  { key: "short-story", label: "Short Story" },
  { key: "twist-ending", label: "Twist Ending" },
  { key: "before-after", label: "Before & After" },
  { key: "cut-asmr", label: "Cut ASMR" },
  { key: "eat-asmr", label: "Eat ASMR" },
  { key: "cooking-asmr", label: "Cooking ASMR" },
  { key: "unreal-furniture-asmr", label: "Unreal Furniture ASMR" },
  { key: "fantasy", label: "Fantasy" },
  { key: "magic", label: "Magic World" },
  { key: "dragon", label: "Dragon Story" },
  { key: "superhero", label: "Superhero" },
  { key: "time-travel", label: "Time Travel" },
  { key: "sci-fi", label: "Sci-Fi" },
  { key: "ai-future", label: "AI Future" },
  { key: "post-apocalypse", label: "Post-Apocalypse" },
  { key: "horror", label: "Horror" },
  { key: "thriller", label: "Thriller" },
  { key: "psychological", label: "Psychological Thriller" },
  { key: "ghost", label: "Ghost Story" },
  { key: "urban-legend", label: "Urban Legend" },
  { key: "survival", label: "Survival Story" },
  { key: "animal-rescue", label: "Animal Rescue" },
  { key: "animal-friendship", label: "Animal Friendship" },
  { key: "animal-adventure", label: "Animal Adventure" },
  { key: "animal-family", label: "Animal Family" },
  { key: "daily-life", label: "Daily Life" },
  { key: "poor-to-rich", label: "Poor to Rich" },
  { key: "struggle", label: "Life Struggle" },
  { key: "work-life", label: "Work Life" },
  { key: "student-life", label: "Student Life" },
  { key: "childhood-memory", label: "Childhood Memory" },
  { key: "educational", label: "Educational Story" },
  { key: "moral-story", label: "Moral Story" },
  { key: "kids-story", label: "Kids Story" },
  { key: "bedtime-story", label: "Bedtime Story" },
];

export const getStoryPresetLabel = (preset: StoryPreset) => {
  const found = STORY_PRESETS.find((item) => item.key === preset);
  return found?.label || preset;
};

export const STORY_PRESET_RULES: Record<StoryPreset, string> = {
  animation:
    "Animation style. Clean shapes, clear silhouettes, expressive faces, smooth motion.",
  person:
    "Human-centered story. Focus on emotions, gestures, and daily-life details.",
  restoring:
    "Restoring old to new. Step-by-step transformation, before/after contrast.",
  "help-animal":
    "Compassionate rescue tone. Gentle pacing, hopeful outcome, safety-first.",
  "help-person":
    "Empathy and care. Focus on supportive actions and positive resolution.",
  "cooking-animal":
    "Cooking with animal characters. Warm, playful, tasty visuals.",
  "cooking-person":
    "Cooking with human characters. Cozy kitchen, delicious textures.",
  adventure:
    "Adventure tone. Dynamic movement, discovery, forward momentum.",
  mystery:
    "Mysterious tone. Subtle clues, moody lighting, suspenseful pacing.",
  inspirational:
    "Motivational tone. Growth, determination, optimistic visuals.",
  "life-lesson":
    "Clear moral. Simple structure, cause and effect, warm closure.",
  viral:
    "Hooky pacing. Attention-grabbing visuals, punchy moments.",
  "short-story":
    "Very concise. Each scene carries clear meaning, no filler.",
  "twist-ending":
    "Hidden clues early, strong reveal at the end.",
  "before-after":
    "Contrast visuals. Show problem then solution clearly.",
  "cut-asmr":
    "ASMR cutting focus. Close-up slicing, crisp cuts, soft scraping, gentle rhythm. Emphasize cut textures.",
  "eat-asmr":
    "ASMR eating focus. Close-up mouth and hands, crisp bites, soft chewing, slow pace. Emphasize edible textures.",
  "cooking-asmr":
    "ASMR cooking focus. Gentle sizzling, stirring, chopping, mixing. Emphasize cooking steps, aromas, and textures.",
  "unreal-furniture-asmr":
    "ASMR: impossible furniture shapes, soft material focus, surreal calm. Transform given objects into furniture-like structures (chairs, beds, tables) without introducing new objects. Change furniture material/style each scene (e.g., wood, ice, glass, gold, crystal, moss) and vary the character action each scene.",
  fantasy:
    "Fantasy tone. Magical atmosphere, wonder, ethereal light.",
  magic:
    "Magic world. Glowing effects, mystical symbols, soft haze.",
  dragon:
    "Dragon focus. Epic scale, majestic movement, fantasy scenery.",
  superhero:
    "Heroic action. Bold poses, dramatic lighting, dynamic framing.",
  "time-travel":
    "Temporal contrasts. Glitches, time motifs, layered visuals.",
  "sci-fi":
    "Futuristic tech. Clean lines, neon accents, sleek materials.",
  "ai-future":
    "AI future. Synthetic aesthetics, holograms, smart environments.",
  "post-apocalypse":
    "Ruin and survival. Dust, decay, harsh light, resilience.",
  horror:
    "Horror tone. Tension, shadows, unsettling details, slow build.",
  thriller:
    "Thriller tone. Suspenseful pacing, tight framing, moody light.",
  psychological:
    "Psychological thriller. Subtle unease, distorted perspectives.",
  ghost:
    "Ghost story. Cold tones, eerie silence, faint presence.",
  "urban-legend":
    "Urban legend. Gritty setting, mysterious hints, suspense.",
  survival:
    "Survival focus. Struggle, grit, harsh environment.",
  "animal-rescue":
    "Rescue focus. Gentle, hopeful, safety-first.",
  "animal-friendship":
    "Bonding animals. Playful, warm tone.",
  "animal-adventure":
    "Animal adventure. Curious exploration, lively pacing.",
  "animal-family":
    "Animal family. Cozy, protective, affectionate mood.",
  "daily-life":
    "Daily life. Realistic moments, simple scenes.",
  "poor-to-rich":
    "Transformation arc. Contrast early hardship with later success.",
  struggle:
    "Struggle focus. Determination, hardship, eventual uplift.",
  "work-life":
    "Work life. Routine, effort, teamwork.",
  "student-life":
    "Student life. Study, friends, growth, youthful tone.",
  "childhood-memory":
    "Nostalgic tone. Warm light, gentle pacing, soft textures.",
  educational:
    "Educational. Clear steps, simple explanations, neutral tone.",
  "moral-story":
    "Moral story. Cause/effect, clear lesson, gentle tone.",
  "kids-story":
    "Kids story. Bright colors, simple shapes, safe content.",
  "bedtime-story":
    "Bedtime. Calm, slow pacing, soft light, quiet mood.",
};

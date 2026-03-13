// gstechedukh\app\components\promt\types.ts
export type CharacterDraft = {
  name: string;
  appearance?: string;
  gender?: string;
  age?: string;
  typegender?: string;
  size?: string;
  role?: string;
  outfit?: string;
  accessories?: string;
  expression?: string;
  colors?: string;
  details?: string;
};

export type StoryIdea = { title: string; detail: string };

export type ObjectDraft = {
  name: string;
  details: string;
};

export type LocationDraft = {
  name: string;
  details: string;
};

export type HazardDraft = {
  name: string;
  details: string;
};

export type SceneItem = {
  title: string;
  summary: string;
  visual: string;
  actions: string;
  camera: string;
  audio?: string;
};

export type CharacterSheetItem = {
  name: string;
  details: string;
};

export type Resolution = "256" | "512" | "1024" | "2048";

export type VisionModel = "4.1-mini" | "4.1";

export type CharacterItem = {
  name: string;
  description: string;
  gender?: string;
  ageRange?: string;
  typegender?: string;
  size?: string;
  role?: string;
  outfit?: string;
  accessories?: string;
  expression?: string;
  colors?: string;
};

export type ObjectItem = {
  name: string;
  description: string;
  material?: string;
  condition?: string;
  colors?: string;
};

export type PromtAiTab =
  | "imgtotext"
  | "texttoimg"
  | "texttostory"
  | "texttoscene"
  | "generateflow";

export const GENDER_OPTIONS = ["unknown", "male", "female", "non-binary"];
export const TYPE_GENDER_OPTIONS = [
  "unknown",
  "straight",
  "gay",
  "lesbian",
  "bisexual",
  "pansexual",
];
export const SIZE_OPTIONS = [
  "unknown",
  "very small",
  "small",
  "short",
  "medium",
  "tall",
  "large",
  "very large",
];
export const AGE_OPTION_GROUPS = [
  {
    label: "Very Young",
    options: [
      "Baby - newborn to ~1 year",
      "Infant - very young baby",
      "Toddler - ~1-3 years",
    ],
  },
  {
    label: "Young",
    options: [
      "Child - ~4-12 years",
      "Kid - casual word for child",
      "Young child - softer / emotional tone",
    ],
  },
  {
    label: "Growing",
    options: [
      "Pre-teen - ~10-12 years",
      "Tween - between child and teen",
      "Teen / Teenager - ~13-19 years",
      "Adolescent - formal word for teen",
    ],
  },
  {
    label: "Adult",
    options: [
      "Young adult - ~18-30",
      "Adult - ~20-60",
      "Middle-aged - ~40-60",
    ],
  },
  {
    label: "Older",
    options: [
      "Senior - 60+",
      "Elderly - old age (formal)",
      "Old - simple / blunt",
      "Aged - cinematic / story tone",
    ],
  },
  {
    label: "For animals (common in prompts)",
    options: [
      "Newborn",
      "Cub / Kitten / Puppy",
      "Juvenile",
      "Adult (Animal)",
      "Aged / Elder (Animal)",
    ],
  },
];

export const AGE_OPTIONS = [
  "unknown",
  ...AGE_OPTION_GROUPS.flatMap((group) => group.options),
];

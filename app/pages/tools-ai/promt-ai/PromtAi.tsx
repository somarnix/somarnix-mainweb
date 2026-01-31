"use client";

import { useMemo, useState } from "react";
import { Sparkles, Wand2, ClipboardCopy, Film, Sliders } from "lucide-react";

type FormState = {
  title: string;
  subjectType: string;
  subject: string;
  actions: string;
  scenes: number;
  durationSeconds: number;
  style: string;
  mood: string;
};

const TITLE_OPTIONS = ["Family Story", "Cinematic Animal Story", "Daily Life", "Product Launch"];
const SUBJECT_TYPE_OPTIONS = ["animal", "human", "object", "character", "environment"];
const SUBJECT_OPTIONS = ["cat family", "dog", "panda", "person", "room", "kitchen", "product"];
const ACTION_OPTIONS = [
  "emotional family journey",
  "cooking a birthday cake",
  "daily routine montage",
  "hero shots and feature highlights",
  "family reunion",
];
const SCENES_OPTIONS = [1, 2, 3, 4, 6, 8, 10, 16, 18];
const DURATION_OPTIONS = [10, 15, 20, 30, 45, 60, 90];
const STYLE_OPTIONS = ["cinematic", "realistic", "anime", "3D", "documentary"];
const MOOD_OPTIONS = ["emotional", "uplifting", "dramatic", "happy", "peaceful"];

const initialState: FormState = {
  title: "Family Story",
  subjectType: "character",
  subject: "cat family",
  actions: "emotional family journey",
  scenes: 18,
  durationSeconds: 60,
  style: "cinematic",
  mood: "emotional",
};

const DEMO_PROMPT = `GLOBAL STYLE (USE FOR ALL SCENES)

STYLE PROMPT (prepend to every scene):

Emotional cinematic animation, Pixar-style storytelling, anthropomorphic ginger tabby cats, soft lighting, warm pastel color palette, shallow depth of field, expressive human-like eyes, gentle cinematic camera movement, family-friendly, heart-touching, high emotional realism, consistent characters across all scenes

CHARACTER CONSISTENCY (VERY IMPORTANT - USE IN EVERY SCENE)

The Cat Family (constant across all scenes):

Father Cat
- Ginger tabby
- Wears a red t-shirt
- Shirt text: "Mss Roth. Recaps II."
- Strong build, hardworking look
- Expressive eyes showing sacrifice, love, exhaustion, and hope

Mother Cat
- Ginger tabby
- Long flowing ginger hair
- Wears a white button-up blouse and floral skirt
- Gentle, caring expression, emotional strength

Child Cat (Kitten)
- Small ginger tabby
- Wears yellow t-shirt and tiny denim shorts
- Shirt text: "Mss Roth. Recaps II" in bold black letters
- Big curious eyes, innocent, emotional reactions

SCENE-BY-SCENE PROMPTS
SCENE 1 - Father Leaving (Train Station)
A sad ginger tabby father cat wearing a red t-shirt labeled "Mss Roth. Recaps II" stands at a train station holding his small kitten's paw, steam rising from a departing train, mother cat watching from behind with worried eyes, golden morning light, cinematic wide shot, strong sense of separation, sacrifice, and responsibility

SCENE 2 - Child Asking Father
Close-up of the small kitten in a yellow t-shirt labeled "Mss Roth. Recaps II", looking up at his father with teary eyes, asking if he will come back, emotional facial expression, soft background blur, warm but melancholic lighting

SCENE 3 - Mother Consoles Child (Ice Cream)
Mother ginger tabby cat in white blouse and floral skirt gently comforting her kitten while sitting on a park bench eating ice cream, soft smiles mixed with sadness, cozy atmosphere, pastel colors, evening light, emotional warmth and maternal care

SCENE 4 - Mother Alone at Home
Mother cat alone inside a small humble home at night, folding clothes and washing the father's shirt, dim warm lamp light, quiet atmosphere, cinematic stillness, strong feeling of waiting, loneliness, and silent strength

SCENE 5 - Father Working Far Away
Father ginger tabby cat working hard at a city construction site, wearing a safety helmet over his red t-shirt, dusty air, tired but determined eyes, strong contrast lighting, symbol of sacrifice, labor, and responsibility

SCENE 6 - Phone Call Between Parents
Split-screen cinematic composition: father cat on a work break holding a phone at the construction site while mother cat answers at home with the child beside her, emotional connection across distance, soft glow on both sides, sense of longing and love

SCENE 7 - Child Studying Hard
Small kitten studying seriously at a desk late at night, books and notebooks neatly arranged, yellow t-shirt visible, mother cat watching proudly from behind, warm desk lamp light, atmosphere of effort, discipline, and hope

SCENE 8 - Exam Success
Mother cat happily telling the father over the phone that their child got first place, proud smiles, emotional relief, gentle joyful lighting, family pride and encouragement

SCENE 9 - Father Gets a Day Off
Father cat standing alone at night holding his phone, city lights behind him, smiling for the first time in a long time, hopeful expression, cinematic close-up, emotional breakthrough moment

SCENE 10 - Train Ride Home
Father cat sitting beside a train window at sunset, reflection on the glass, countryside passing by, warm orange and pink sky tones, emotional anticipation, sense of return and reunion

SCENE 11 - Family Reunion
Father cat hugging mother and child tightly, joyful tears in their eyes, soft sunlight surrounding them, emotional embrace, slow cinematic motion, heart-warming reunion after long separation

SCENE 12 - New Small City Home
Small cozy rented apartment in the city, simple furniture, family of three ginger cats sitting together at one table, warm lighting, feeling of safety, unity, and finally being together again

SCENE 13 - Child's Happiness
Child cat laughing and running happily inside the small home, parents watching with relief and love, bright cheerful lighting, joyful family energy filling the room

SCENE 14 - Buying Birthday Cake
Mother and child cat inside a bakery choosing a small birthday cake, colorful cake display, joyful anticipation, soft pastel bakery lighting, gentle excitement

SCENE 15 - Birthday at Construction Site
Mother and child surprising the father cat at the construction site with a small birthday cake, dusty environment contrasted with warm family light, emotional expressions, humble but deeply touching celebration

SCENE 16 - Decision to Live Together
Father cat telling his family they will live together in the city, hopeful smiles, close family grouping, sunset glow symbolizing a new beginning and stability

SCENE 17 - Child Studying Again
Child cat proudly showing completed homework to both parents, parents smiling and praising, warm home atmosphere, sense of growth, guidance, and support

SCENE 18 - Gratitude & Ending
Child cat standing confidently thanking mom and dad, parents emotional and proud, soft applause-like atmosphere, glowing warm light, cinematic ending shot symbolizing love, sacrifice, family unity, and hope for the future`;

export default function PromtAi() {
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [promptBlocks, setPromptBlocks] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = useMemo(() => form.subject.trim().length > 0, [form.subject]);

  const handleChange = (key: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/tools/prompt-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to generate prompt");
      setPrompt(String(data?.prompt || ""));
      setPromptBlocks(Array.isArray(data?.prompts) ? data.prompts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyBlock = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const useDemoPrompt = () => {
    setPrompt(DEMO_PROMPT);
    setPromptBlocks([]);
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ede9fe_0%,_#ffffff_45%,_#e0f2fe_100%)] dark:bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#111827_60%,_#020617_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[32px] border border-slate-200/70 bg-white/95 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur dark:border-gray-800/70 dark:bg-gray-900/90">
          <div className="border-b border-slate-200/70 px-6 py-6 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-purple-600/10 p-3 text-purple-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    Prompt Builder
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Hidden template - users cannot copy your base prompt
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={useDemoPrompt}
                  className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                >
                  <Film className="h-4 w-4" />
                  Use Demo Prompt
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate || loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-50"
                >
                  <Wand2 className="h-4 w-4" />
                  {loading ? "Generating..." : "Generate Prompt"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Sliders className="h-4 w-4 text-blue-500" />
                  Core Details
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={form.title} onChange={(e) => handleChange("title", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                    {TITLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <select value={form.subjectType} onChange={(e) => handleChange("subjectType", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                    {SUBJECT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <select value={form.subject} onChange={(e) => handleChange("subject", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <select value={form.actions} onChange={(e) => handleChange("actions", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                    {ACTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Film className="h-4 w-4 text-purple-500" />
                  Video Specs
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <select value={form.scenes} onChange={(e) => handleChange("scenes", Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                    {SCENES_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt} scenes</option>
                    ))}
                  </select>
                  <select value={form.durationSeconds} onChange={(e) => handleChange("durationSeconds", Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}s</option>
                    ))}
                  </select>
                  <select value={form.style} onChange={(e) => handleChange("style", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                    {STYLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <select value={form.mood} onChange={(e) => handleChange("mood", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                    {MOOD_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Generated Prompt
                </div>
                {error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </div>
                )}
                <textarea
                  value={prompt}
                  readOnly
                  placeholder="Your generated prompt will appear here..."
                  className="min-h-80 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                />
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!prompt}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-purple-300 hover:text-purple-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy Prompt"}
                  </button>
                </div>
                {promptBlocks.length > 0 && (
                  <div className="mt-5 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Scene Prompts
                    </div>
                    {promptBlocks.map((block, idx) => (
                      <div key={`${idx}-${block.slice(0, 12)}`} className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          Prompt {idx + 1}
                          <button
                            type="button"
                            onClick={() => handleCopyBlock(block)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600"
                          >
                            <ClipboardCopy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap font-sans">{block}</pre>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:border-gray-800 dark:bg-gray-950">
                  Your secret template stays on the server. Users only receive the final prompt.
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

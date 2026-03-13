import { NextResponse } from "next/server";

const GROQ_MODEL_MAP: Record<string, string> = {
  instant: "llama-3.1-8b-instant",
  versatile: "llama-3.1-70b-versatile",
  mixtral: "mixtral-8x7b-32768",
};

const GEMINI_MODEL_MAP: Record<string, string> = {
  "flash-lite": "gemini-2.5-flash-lite",
  flash: "gemini-2.5-flash",
};

export async function POST(req: Request) {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!groqKey && !geminiKey) {
    return NextResponse.json(
      { error: "Missing GROQ_API_KEY (or GOOGLE_API_KEY for Gemini fallback)." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sceneCount = Math.min(200, Math.max(5, Number(body.sceneCount || 20)));
  const storyChoice = String(body.storyChoice || "").trim();
  const globalStyle = String(body.globalStyle || "").trim();
  const registry = body.registry || {};
  const characters = Array.isArray(registry.characters) ? registry.characters : [];
  const objects = Array.isArray(registry.objects) ? registry.objects : [];
  const locations = Array.isArray(registry.locations) ? registry.locations : [];
  const locked = Boolean(body.locked);
  const modelKey = "instant";
  const groqModel = GROQ_MODEL_MAP[modelKey] || GROQ_MODEL_MAP.instant;
  const geminiModel = GEMINI_MODEL_MAP.flash;

  if (!storyChoice) {
    return NextResponse.json({ error: "Story choice is required" }, { status: 400 });
  }

  const system = [
    "You are a story-to-movie outline generator.",
    "Return STRICT JSON only.",
    "Schema: {",
    "\"outline\": [ { \"title\": string, \"summary\": string, \"newCharacters\": string[], \"newObjects\": string[], \"newLocations\": string[] } ],",
    "\"new_assets\": { \"characters\": [ {\"name\": string, \"details\": string} ], \"objects\": [ {\"name\": string, \"details\": string} ], \"locations\": [ {\"name\": string, \"details\": string} ] }",
    "}",
    `Generate exactly ${sceneCount} outline items in order.`,
    locked
      ? "Registry is locked: only add new assets if the story absolutely requires them."
      : "Registry is unlocked: add any missing assets you detect in outline.",
    "No markdown, no extra text.",
  ].join(" ");

  const prompt = [
    "Story choice:",
    storyChoice,
    globalStyle ? `Global style: ${globalStyle}` : "",
    "Registry:",
    `Characters: ${JSON.stringify(characters)}`,
    `Objects: ${JSON.stringify(objects)}`,
    `Locations: ${JSON.stringify(locations)}`,
    "Task: Create a scene-by-scene outline with short summaries.",
    "Detect any NEW characters/objects/locations not in the registry and list them in both each scene (newCharacters/newObjects/newLocations) and in new_assets.",
  ]
    .filter(Boolean)
    .join("\n");

  if (groqKey) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.6,
        max_tokens: 4096,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Groq outline generation failed" },
        { status: 500 }
      );
    }
    const text = String(data?.choices?.[0]?.message?.content || "");
    return NextResponse.json({ text });
  }

  const payload = {
    contents: [
      {
        parts: [{ text: system }, { text: prompt }],
      },
    ],
  };
  if (!geminiKey) {
    return NextResponse.json({ error: "Gemini API key is missing" }, { status: 500 });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Gemini outline generation failed" },
      { status: 500 }
    );
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: { text?: string }) => p.text).filter(Boolean).join("\n");

  return NextResponse.json({ text });
}

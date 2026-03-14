import { NextResponse } from "next/server";

import { resolveApiKeyFromRequest } from "@/lib/user-api-keys";

const GEMINI_MODEL_MAP: Record<string, string> = {
  "flash-lite": "gemini-2.5-flash-lite",
  flash: "gemini-2.5-flash",
};

const GROQ_MODEL_MAP: Record<string, string> = {
  instant: "llama-3.1-8b-instant",
  versatile: "llama-3.1-70b-versatile",
  mixtral: "mixtral-8x7b-32768",
};

export async function POST(req: Request) {
  const groqKey = await resolveApiKeyFromRequest(req, "groq", process.env.GROQ_API_KEY || null);
  const geminiKey = await resolveApiKeyFromRequest(
    req,
    "google",
    process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null
  );
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

  const prompt = String(body.prompt || "").trim();
  const modelKey = String(body.model || "instant");
  const groqModel = GROQ_MODEL_MAP[modelKey] || GROQ_MODEL_MAP.instant;
  const geminiModel = GEMINI_MODEL_MAP[modelKey] || GEMINI_MODEL_MAP.flash;
  const count = Math.min(10, Math.max(3, Number(body.count || 10)));

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const system = [
    "You are a story idea generator.",
    "Return STRICT JSON only.",
    "Schema: { \"ideas\": [ { \"title\": string, \"story\": string } ] }",
    `Generate exactly ${count} unique ideas.`,
    "Titles must be different from each other.",
    "Stories must be short (2-4 sentences), vivid, and distinct.",
    "Do not include markdown or extra text.",
  ].join(" ");

  if (groqKey) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.8,
        max_tokens: 1024,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Groq story generation failed" },
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
      { error: data?.error?.message || "Gemini story generation failed" },
      { status: 500 }
    );
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: { text?: string }) => p.text).filter(Boolean).join("\n");

  return NextResponse.json({ text });
}

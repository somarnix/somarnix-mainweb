import { NextResponse } from "next/server";

const SIZE_MAP: Record<string, string> = {
  "256": "1K",
  "512": "1K",
  "1024": "1K",
  "2048": "2K",
  "1K": "1K",
  "2K": "2K",
};

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini Imagen requires GOOGLE_API_KEY. Groq does not support image generation." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const aspectRatio = String(body.aspectRatio || "1:1");
  const sampleCount = Math.min(4, Math.max(1, Number(body.sampleCount || 1)));
  const imageSize = SIZE_MAP[String(body.imageSize || "1024")] || "1K";

  const payload = {
    instances: [{ prompt }],
    parameters: {
      sampleCount,
      aspectRatio,
      imageSize,
      personGeneration: "allow_adult",
    },
  };

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Image generation failed" },
      { status: 500 }
    );
  }

  const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
  const images = predictions
    .map((pred: { bytesBase64Encoded?: string; mimeType?: string }) => {
      if (!pred?.bytesBase64Encoded) return null;
      const mime = pred?.mimeType || "image/png";
      return `data:${mime};base64,${pred.bytesBase64Encoded}`;
    })
    .filter(Boolean);

  return NextResponse.json({ images, raw: data });
}

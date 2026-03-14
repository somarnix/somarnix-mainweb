import { NextResponse } from "next/server";

import { resolveApiKeyFromRequest } from "@/lib/user-api-keys";

const MODEL_MAP: Record<string, string> = {
  "flash-lite": "gemini-2.5-flash-lite",
  flash: "gemini-2.5-flash",
};

export async function POST(req: Request) {
  const apiKey = await resolveApiKeyFromRequest(
    req,
    "google",
    process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || null
  );
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini Vision requires GOOGLE_API_KEY. Groq does not support vision." },
      { status: 500 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const image = form.get("image");
  const imageUrl = String(form.get("imageUrl") || "").trim();
  const prompt = String(form.get("prompt") || "Describe this image.");
  const modelKey = String(form.get("model") || "flash");
  const model = MODEL_MAP[modelKey] || MODEL_MAP.flash;

  let mimeType = "image/jpeg";
  let buffer: Buffer | null = null;

  if (image instanceof File) {
    mimeType = image.type || "image/jpeg";
    buffer = Buffer.from(await image.arrayBuffer());
  } else if (imageUrl) {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: "Failed to download image from URL" },
        { status: 400 }
      );
    }
    mimeType = imgRes.headers.get("content-type") || "image/jpeg";
    const arrayBuf = await imgRes.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  }

  if (!buffer) {
    return NextResponse.json({ error: "Image file or URL required" }, { status: 400 });
  }
  const base64 = buffer.toString("base64");

  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
          { text: prompt },
        ],
      },
    ],
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
      { error: data?.error?.message || "Gemini request failed" },
      { status: 500 }
    );
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: { text?: string }) => p.text).filter(Boolean).join("\n");

  return NextResponse.json({ text: text || "", raw: data });
}

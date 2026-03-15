import { NextResponse } from "next/server";

import { resolveApiKeyFromRequest } from "@/lib/user-api-keys";

const MODEL_MAP: Record<string, string> = {
  "4.1-mini": "gpt-4.1-mini",
  "4.1": "gpt-4.1",
};

function normalizeApiKey(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  return trimmed || null;
}

export async function POST(req: Request) {
  const apiKey = normalizeApiKey(
    await resolveApiKeyFromRequest(req, "openai", process.env.OPENAI_API_KEY || null)
  );
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const prompt = String(form.get("prompt") || "").trim() || "Describe this image.";
  const modelKey = String(form.get("model") || "4.1-mini");
  const model = MODEL_MAP[modelKey] || MODEL_MAP["4.1-mini"];

  const imageFile = form.get("image");
  const imageUrl = String(form.get("imageUrl") || "").trim();

  if (!imageFile && !imageUrl) {
    return NextResponse.json(
      { error: "Image file or URL is required." },
      { status: 400 }
    );
  }

  let imagePayload = imageUrl;
  if (imageFile && typeof imageFile === "object" && "arrayBuffer" in imageFile) {
    const arrayBuffer = await (imageFile as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = (imageFile as File).type || "image/png";
    imagePayload = `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imagePayload },
          ],
        },
      ],
      max_output_tokens: 1200,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const isInvalidKey = res.status === 401 || data?.error?.code === "invalid_api_key";
    return NextResponse.json(
      {
        error: isInvalidKey
          ? "The configured OpenAI API key is invalid. Replace OPENAI_API_KEY in .env.local and restart the server, or save a valid personal OpenAI key in Settings."
          : data?.error?.message || "OpenAI Vision request failed",
      },
      { status: 500 }
    );
  }

  const outputText =
    typeof data?.output_text === "string"
      ? data.output_text
      : String(
          data?.output?.[0]?.content?.[0]?.text ||
            data?.output?.[0]?.content?.[0]?.text?.value ||
            ""
        );

  return NextResponse.json({ text: outputText });
}

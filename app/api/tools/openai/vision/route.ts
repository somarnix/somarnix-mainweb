import { NextResponse } from "next/server";

const MODEL_MAP: Record<string, string> = {
  "4.1-mini": "gpt-4.1-mini",
  "4.1": "gpt-4.1",
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
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
    return NextResponse.json(
      { error: data?.error?.message || "OpenAI Vision request failed" },
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

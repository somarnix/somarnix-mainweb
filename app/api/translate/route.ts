import { NextResponse } from "next/server";

const BASE_URL = process.env.LIBRETRANSLATE_URL || "https://libretranslate.de";
const API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";

export async function GET() {
  const res = await fetch(`${BASE_URL}/languages`, { method: "GET" });
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to load languages" },
      { status: res.status }
    );
  }
  const data = await res.json();
  return NextResponse.json({ languages: data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const q = body?.q;
  const target = body?.target;
  const source = body?.source || "auto";

  if (!q || !target) {
    return NextResponse.json(
      { error: "Missing q or target" },
      { status: 400 }
    );
  }

  const payload: Record<string, unknown> = {
    q,
    source,
    target,
    format: "text",
  };
  if (API_KEY) payload.api_key = API_KEY;

  const res = await fetch(`${BASE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Translation failed" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

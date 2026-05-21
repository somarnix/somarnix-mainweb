import { NextResponse } from "next/server";

const BASE_URL = process.env.LIBRETRANSLATE_URL || "http://localhost:5000";
const API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";
const FALLBACK_PROVIDER = process.env.AUTO_TRANSLATE_FALLBACK_PROVIDER || "google-free";

type TranslateQuery = string | string[];

type GoogleTranslateChunk = [string?, string?, unknown?, unknown?];

async function translateGoogleFree(text: string, target: string, source: string) {
  const cleaned = text.trim();
  if (!cleaned) return "";
  const sourceCode = source && source !== "auto" ? source : "auto";
  const targetCode = target === "zh" ? "zh-CN" : target;
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx" +
    `&sl=${encodeURIComponent(sourceCode)}&tl=${encodeURIComponent(targetCode)}&dt=t&q=${encodeURIComponent(
      cleaned
    )}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Google fallback translation failed");
  const data = (await res.json().catch(() => null)) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return text;
  const translated = (data[0] as GoogleTranslateChunk[])
    .map((chunk) => chunk?.[0])
    .filter((chunk): chunk is string => Boolean(chunk))
    .join("");
  return translated || text;
}

async function translateFallback(q: TranslateQuery, target: string, source: string) {
  if (FALLBACK_PROVIDER !== "google-free") {
    return {
      translatedText: q,
      warning: "Translation server unavailable; returned original text",
    };
  }

  if (Array.isArray(q)) {
    const translatedText = new Array<string>(q.length);
    const concurrency = 8;
    let nextIndex = 0;

    const workers = Array.from({ length: Math.min(concurrency, q.length) }, async () => {
      while (nextIndex < q.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        translatedText[currentIndex] = await translateGoogleFree(q[currentIndex], target, source);
      }
    });

    for (const worker of workers) {
      await worker;
    }

    return {
      translatedText,
      provider: "google-free",
      warning: "LibreTranslate unavailable; used google-free fallback",
    };
  }

  return {
    translatedText: await translateGoogleFree(q, target, source),
    provider: "google-free",
    warning: "LibreTranslate unavailable; used google-free fallback",
  };
}

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/languages`, { method: "GET" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to load languages" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json({ languages: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to load languages" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const q = body?.q as TranslateQuery;
  const target = String(body?.target || "");
  const source = String(body?.source || "auto");

  if ((!q && q !== "") || !target) {
    return NextResponse.json(
      { error: "Missing q or target" },
      { status: 400 }
    );
  }

  if (
    !(
      typeof q === "string" ||
      (Array.isArray(q) && q.every((item) => typeof item === "string"))
    )
  ) {
    return NextResponse.json(
      { error: "q must be a string or an array of strings" },
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

  try {
    const res = await fetch(`${BASE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const fallback = await translateFallback(q, target, source);
      return NextResponse.json(fallback);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    try {
      const fallback = await translateFallback(q, target, source);
      return NextResponse.json(fallback);
    } catch {
      return NextResponse.json({
        translatedText: q,
        warning: "Translation server unavailable; returned original text",
      });
    }
  }
}

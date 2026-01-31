import { NextResponse } from "next/server";

type Row = {
  id: number;
  start: string;
  end: string;
  original: string;
  translated?: string;
};

type Body = {
  provider?: string;
  targetLanguage?: string;
  rows?: Row[];
};

const normalizeDeeplTarget = (code: string) => {
  const raw = code.trim();
  if (!raw) return "EN";
  const lower = raw.toLowerCase();
  if (lower.startsWith("zh")) return "ZH";
  if (lower === "pt") return "PT-PT";
  if (lower === "en-gb") return "EN-GB";
  if (lower === "en-us") return "EN-US";
  if (lower === "pt-br") return "PT-BR";
  if (lower === "pt-pt") return "PT-PT";
  return raw.toUpperCase();
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const rows = Array.isArray(body?.rows) ? body?.rows : [];
  const provider = String(body?.provider || "google-free");
  const targetLanguage = String(body?.targetLanguage || "en");

  if (rows.length === 0) {
    return NextResponse.json({ error: "No subtitles provided" }, { status: 400 });
  }

  const translateGoogleFree = async (text: string, target: string) => {
    const cleaned = text.trim();
    if (!cleaned) return "";
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx" +
      `&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(cleaned)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Translate request failed");
    const data = (await res.json().catch(() => null)) as any;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return cleaned;
    return data[0].map((chunk: any) => chunk?.[0]).filter(Boolean).join("");
  };

  if (provider === "google-free") {
    const translated = [];
    for (const row of rows) {
      const translatedText = await translateGoogleFree(row.original || "", targetLanguage);
      translated.push({
        ...row,
        translated: translatedText || row.translated || row.original,
      });
    }

    return NextResponse.json({ rows: translated, ok: true });
  }

  if (provider === "deepl") {
    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing DeepL API key. Set DEEPL_API_KEY." },
        { status: 400 }
      );
    }

    const baseUrl = process.env.DEEPL_API_BASE || "https://api-free.deepl.com";
    const target = normalizeDeeplTarget(targetLanguage);

    const translateBatch = async (batch: Row[]) => {
      const res = await fetch(`${baseUrl}/v2/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `DeepL-Auth-Key ${apiKey}`,
        },
        body: JSON.stringify({
          text: batch.map((row) => row.original || ""),
          target_lang: target,
          enable_beta_languages: true,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "DeepL translate failed");
      }

      const data = (await res.json().catch(() => null)) as any;
      const translations = Array.isArray(data?.translations) ? data.translations : [];
      return translations.map((t: any) => String(t?.text ?? ""));
    };

    try {
      const chunkSize = 40;
      const translated: Row[] = [];
      for (let i = 0; i < rows.length; i += chunkSize) {
        const batch = rows.slice(i, i + chunkSize);
        const translatedTexts = await translateBatch(batch);
        batch.forEach((row, idx) => {
          translated.push({
            ...row,
            translated: translatedTexts[idx] || row.translated || row.original,
          });
        });
      }

      return NextResponse.json({ rows: translated, ok: true });
    } catch (err) {
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : "DeepL translate failed.",
        },
        { status: 400 }
      );
    }
  }

  if (provider === "gemini") {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI API key. Set GOOGLE_API_KEY or GEMINI_API_KEY." },
        { status: 400 }
      );
    }

    const modelListEnv = process.env.GEMINI_MODEL_LIST;
    const modelFallbacks = modelListEnv
      ? modelListEnv.split(",").map((m) => m.trim()).filter(Boolean)
      : ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    const translateBatch = async (batch: Row[], model: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text:
                  "Translate the following subtitle lines into " +
                  targetLanguage +
                  ". Return ONLY a JSON array of translated strings in the same order. " +
                  "Do not add extra text. Input lines:\\n" +
                  JSON.stringify(batch.map((r) => r.original || "")),
              },
            ],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 4096 },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Gemini translate failed (${model})`);
      }

      const data = (await res.json().catch(() => null)) as any;
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        data?.candidates?.[0]?.content?.parts?.[0] ??
        "";
      if (!text) return batch.map((r) => r.original || "");

      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v));
        }
      } catch {
        // fallthrough
      }

      return text
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean)
        .slice(0, batch.length);
    };

    try {
      const chunkSize = 30;
      let lastError: Error | null = null;
      for (const model of modelFallbacks) {
        try {
          const translated: Row[] = [];
          for (let i = 0; i < rows.length; i += chunkSize) {
            const batch = rows.slice(i, i + chunkSize);
            const translatedTexts = await translateBatch(batch, model);
            batch.forEach((row, idx) => {
              translated.push({
                ...row,
                translated: translatedTexts[idx] || row.translated || row.original,
              });
            });
          }

          return NextResponse.json({ rows: translated, ok: true, modelUsed: model });
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const msg = lastError.message || "";
          if (
            !msg.includes("NOT_FOUND") &&
            !msg.includes("not found") &&
            !msg.includes("404")
          ) {
            break;
          }
        }
      }

      throw lastError || new Error("Gemini translate failed.");
    } catch (err) {
      // Fallback to Google Free if Gemini fails
      try {
        const translated: Row[] = [];
        for (const row of rows) {
          const translatedText = await translateGoogleFree(row.original || "", targetLanguage);
          translated.push({
            ...row,
            translated: translatedText || row.translated || row.original,
          });
        }
        const reason =
          err instanceof Error ? err.message : "Gemini translate failed.";
        return NextResponse.json({
          rows: translated,
          ok: true,
          warning: `Gemini failed (${reason}), fallback to Google (Free).`,
        });
      } catch (fallbackErr) {
        return NextResponse.json(
          {
            error:
              err instanceof Error ? err.message : "Gemini translate failed.",
            detail:
              fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
          },
          { status: 400 }
        );
      }
    }
  }

  return NextResponse.json(
    { error: "Provider not configured yet. Use Google (Free) or Gemini." },
    { status: 400 }
  );
}

import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth";
import {
  getUserApiKeySummary,
  saveUserApiKeys,
  type ApiKeyProvider,
} from "@/lib/user-api-keys";

type ApiKeysBody = {
  groqApiKey?: unknown;
  openaiApiKey?: unknown;
  googleApiKey?: unknown;
  deeplApiKey?: unknown;
};

function normalizeApiKey(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function cleanApiKey(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = normalizeApiKey(value);
  return trimmed ? trimmed : null;
}

async function validateOpenAiApiKey(apiKey: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (res.ok) return null;

  const data = (await res.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null;

  if (res.status === 401 || data?.error?.code === "invalid_api_key") {
    return "Invalid OpenAI API key. Replace it with a current key from https://platform.openai.com/account/api-keys.";
  }

  return data?.error?.message || "Failed to validate the OpenAI API key.";
}

export async function GET(req: Request): Promise<Response> {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKeys = await getUserApiKeySummary(auth.userId);
  return NextResponse.json({ success: true, apiKeys });
}

export async function PUT(req: Request): Promise<Response> {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = (await req.json().catch(() => null)) as ApiKeysBody | null;
  const body = raw && typeof raw === "object" ? raw : {};

  const updates: Partial<Record<ApiKeyProvider, string | null>> = {};

  const groqApiKey = cleanApiKey(body.groqApiKey);
  if (groqApiKey !== undefined) updates.groq = groqApiKey;

  const openaiApiKey = cleanApiKey(body.openaiApiKey);
  if (openaiApiKey !== undefined) updates.openai = openaiApiKey;

  if (openaiApiKey) {
    const openAiError = await validateOpenAiApiKey(openaiApiKey);
    if (openAiError) {
      return NextResponse.json({ error: openAiError }, { status: 400 });
    }
  }

  const googleApiKey = cleanApiKey(body.googleApiKey);
  if (googleApiKey !== undefined) updates.google = googleApiKey;

  const deeplApiKey = cleanApiKey(body.deeplApiKey);
  if (deeplApiKey !== undefined) updates.deepl = deeplApiKey;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const apiKeys = await saveUserApiKeys(auth.userId, updates);
  return NextResponse.json({ success: true, apiKeys });
}

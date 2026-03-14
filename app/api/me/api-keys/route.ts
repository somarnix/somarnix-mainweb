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

function cleanApiKey(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

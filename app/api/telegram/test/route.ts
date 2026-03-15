import os from "os";

import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth";
import { isTelegramConfigured, sendTelegramSystemReadyNotification } from "@/lib/telegram";

export async function POST(req: Request): Promise<Response> {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID." },
      { status: 400 }
    );
  }

  try {
    await sendTelegramSystemReadyNotification(os.hostname());
    return NextResponse.json({ success: true, message: "Telegram test sent." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram test failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

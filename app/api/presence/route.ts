import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { setUserPresenceStatus } from "@/lib/presence";
import { db } from "@/lib/db";

type PresencePayload = {
  status?: "online" | "offline";
  deviceId?: string;
  deviceName?: string;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolvePayload(req: NextRequest): Promise<PresencePayload> {
  try {
    const payload = await req.json();
    if (payload && typeof payload === "object") {
      return payload as PresencePayload;
    }
  } catch {
    // ignore body parse errors
  }
  return {};
}

async function upsertLoginDevice(userId: number, deviceId: string, deviceName: string | null) {
  try {
    await db.query(
      `
      INSERT INTO user_login_devices (user_id, device_id, device_name, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        device_name = COALESCE(VALUES(device_name), device_name),
        last_seen_at = NOW()
      `,
      [userId, deviceId, deviceName]
    );
  } catch {
    // Ignore when table does not exist or any non-critical write error.
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await resolvePayload(req);
  const status = payload.status === "offline" ? "offline" : "online";
  const deviceId = normalizeString(payload.deviceId);
  const deviceName = normalizeString(payload.deviceName);

  await setUserPresenceStatus(auth.userId, status);
  if (deviceId) {
    await upsertLoginDevice(auth.userId, deviceId, deviceName);
  }

  return NextResponse.json({ success: true, status });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await setUserPresenceStatus(auth.userId, "offline");
  return NextResponse.json({ success: true, status: "offline" });
}

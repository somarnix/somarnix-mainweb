import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { clearSessionCookies } from "@/lib/security";
import type { RowDataPacket } from "mysql2";

type LogoutBody = {
  deviceId?: string;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function hasTable(table: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ?
    LIMIT 1
    `,
    [table]
  );
  return rows.length > 0;
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    const raw = await req.json().catch(() => null);
    const body = raw && typeof raw === "object" ? (raw as LogoutBody) : {};
    const deviceId = normalizeString(body.deviceId);

    if (auth && deviceId) {
      const hasLoginDevices = await hasTable("user_login_devices");
      if (hasLoginDevices) {
        await db.query(
          `
          DELETE FROM user_login_devices
          WHERE user_id = ? AND device_id = ?
          `,
          [auth.userId, deviceId]
        );
      }
    }
  } catch {
    // Always continue logout flow even if device cleanup fails.
  }

  const response = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

  for (const cookie of clearSessionCookies()) {
    response.headers.append("Set-Cookie", cookie);
  }

  return response;
}

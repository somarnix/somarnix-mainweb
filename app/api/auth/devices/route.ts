import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

type DeviceRow = RowDataPacket & {
  device_id: string;
  device_name: string | null;
  first_seen_at: string | Date | null;
  last_seen_at: string | Date | null;
};

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

export async function GET(req: Request): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasLoginDevices = await hasTable("user_login_devices");
    if (!hasLoginDevices) {
      return Response.json({ devices: [] });
    }

    const [rows] = await db.query<DeviceRow[]>(
      `
      SELECT device_id, device_name, first_seen_at, last_seen_at
      FROM user_login_devices
      WHERE user_id = ?
      ORDER BY last_seen_at DESC, id DESC
      `,
      [auth.userId]
    );

    return Response.json({
      devices: (rows ?? []).map((row) => ({
        deviceId: row.device_id,
        deviceName: row.device_name ?? "Unknown device",
        firstSeenAt: row.first_seen_at ?? null,
        lastSeenAt: row.last_seen_at ?? null,
      })),
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to load devices", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


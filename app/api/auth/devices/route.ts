import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { ensureTrustedDeviceSchema, hasTable } from "@/lib/trusted-devices";
import type { RowDataPacket } from "mysql2";

type DeviceRow = RowDataPacket & {
  device_id: string;
  device_name: string | null;
  first_seen_at: string | Date | null;
  last_seen_at: string | Date | null;
  trusted_until: string | Date | null;
  device_action_locked_until: string | Date | null;
};

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
    await ensureTrustedDeviceSchema();

    const [rows] = await db.query<DeviceRow[]>(
      `
      SELECT device_id, device_name, first_seen_at, last_seen_at, trusted_until, device_action_locked_until
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
        trustedUntil: row.trusted_until ?? null,
        deviceActionLockedUntil: row.device_action_locked_until ?? null,
      })),
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to load devices", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

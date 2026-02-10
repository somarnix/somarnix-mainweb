import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

async function hasAuditTable(): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'license_audit_logs'
    LIMIT 1
    `
  );
  return rows.length > 0;
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    licenseId?: number | string;
    machineId?: string;
    deviceId?: string;
    reason?: string;
  };
  const licenseId = Number(body.licenseId);
  const machineId = String(body.deviceId || body.machineId || "").trim();
  const reason = String(body.reason || "").trim() || "admin_remove_device";

  if (!Number.isFinite(licenseId) || licenseId <= 0 || !machineId) {
    return NextResponse.json({ error: "licenseId and machineId are required" }, { status: 400 });
  }

  const [res] = await db.query<ResultSetHeader>(
    `
    DELETE FROM tool_license_activations
    WHERE license_id = ? AND device_id = ?
    `,
    [licenseId, machineId]
  );
  if (res.affectedRows === 0) {
    return NextResponse.json({ error: "Activation not found" }, { status: 404 });
  }

  if (await hasAuditTable()) {
    await db.query<ResultSetHeader>(
      `
      INSERT INTO license_audit_logs
        (actor_admin_id, action, target_license_id, old_value, new_value, reason)
      VALUES
        (?, 'remove_device', ?, JSON_OBJECT('device_id', ?), JSON_OBJECT('device_id', NULL), ?)
      `,
      [auth.userId, licenseId, machineId, reason]
    );
  }

  return NextResponse.json({ ok: true });
}

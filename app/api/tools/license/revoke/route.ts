import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type LicenseRow = RowDataPacket & {
  id: number;
  status: "active" | "revoked" | "expired";
};

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
    reason?: string;
  };
  const licenseId = Number(body.licenseId);
  const reason = String(body.reason || "").trim() || "admin_revoke";
  if (!Number.isFinite(licenseId) || licenseId <= 0) {
    return NextResponse.json({ error: "Invalid licenseId" }, { status: 400 });
  }

  const [rows] = await db.query<LicenseRow[]>(
    `SELECT id, status FROM tool_license_keys WHERE id = ? LIMIT 1`,
    [licenseId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }
  const oldStatus = rows[0].status;

  await db.query<ResultSetHeader>(
    `
    UPDATE tool_license_keys
    SET status = 'revoked'
    WHERE id = ?
    `,
    [licenseId]
  );

  if (await hasAuditTable()) {
    await db.query<ResultSetHeader>(
      `
      INSERT INTO license_audit_logs
        (actor_admin_id, action, target_license_id, old_value, new_value, reason)
      VALUES
        (?, 'revoke', ?, JSON_OBJECT('status', ?), JSON_OBJECT('status', 'revoked'), ?)
      `,
      [auth.userId, licenseId, oldStatus, reason]
    );
  }

  return NextResponse.json({ ok: true });
}


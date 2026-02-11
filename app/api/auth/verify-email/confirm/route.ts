import crypto from "crypto";
import { db } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type UserRow = RowDataPacket & {
  id: number;
  email_verified_at: string | Date | null;
  deleted_at: string | Date | null;
};

type VerifyRow = RowDataPacket & {
  id: number;
  code_hash: string;
  expires_at: string | Date;
  used_at: string | Date | null;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.json().catch(() => null);
    const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const email = normalizeString(body.email).toLowerCase();
    const code = normalizeString(body.code).replace(/\s+/g, "");

    if (!email || !isValidEmail(email)) {
      return Response.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return Response.json({ error: "Verification code must be 6 digits" }, { status: 400 });
    }

    const [users] = await db.query<UserRow[]>(
      `
      SELECT id, email_verified_at, deleted_at
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );
    if (users.length === 0) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    const user = users[0];
    if (user.deleted_at) {
      return Response.json({ error: "Account is deleted" }, { status: 400 });
    }
    if (user.email_verified_at) {
      return Response.json({ success: true, alreadyVerified: true });
    }

    const [codes] = await db.query<VerifyRow[]>(
      `
      SELECT id, code_hash, expires_at, used_at
      FROM user_email_verifications
      WHERE user_id = ? AND used_at IS NULL
      ORDER BY id DESC
      LIMIT 1
      `,
      [user.id]
    );
    if (codes.length === 0) {
      return Response.json({ error: "No verification code. Request a new code." }, { status: 400 });
    }

    const row = codes[0];
    const exp = new Date(row.expires_at).getTime();
    if (Number.isNaN(exp) || exp < Date.now()) {
      return Response.json({ error: "Verification code expired. Request a new code." }, { status: 400 });
    }
    if (row.code_hash !== sha256Hex(code)) {
      return Response.json({ error: "Invalid verification code" }, { status: 400 });
    }

    await db.query<ResultSetHeader>(
      `
      UPDATE user_email_verifications
      SET used_at = NOW()
      WHERE id = ?
      `,
      [row.id]
    );

    await db.query<ResultSetHeader>(
      `
      UPDATE users
      SET email_verified_at = NOW(), is_active = 1
      WHERE id = ?
      `,
      [user.id]
    );

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: "Failed to verify email", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

type ResetRow = RowDataPacket & {
  id: number;
  user_id: number;
  expires_at: string;
  used_at: string | null;
};

export async function POST(req: Request): Promise<Response> {
  const raw: unknown = await req.json().catch(() => ({}));
  const body = isObject(raw) ? raw : {};

  const email = str(body.email).toLowerCase();
  const token = str(body.token);
  const newPassword = str(body.newPassword);

  if (!email || !token || !newPassword) {
    return Response.json({ error: "email, token, newPassword required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const tokenHash = sha256Hex(token);

  const [rows] = await db.query<ResetRow[]>(
    `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at
     FROM password_resets pr
     INNER JOIN users u ON u.id = pr.user_id
     WHERE u.email = ? AND pr.token_hash = ?
     LIMIT 1`,
    [email, tokenHash]
  );

  if (rows.length === 0) {
    return Response.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const r = rows[0];
  if (r.used_at) return Response.json({ error: "Token already used" }, { status: 400 });

  const exp = new Date(r.expires_at).getTime();
  if (Number.isNaN(exp) || Date.now() > exp) {
    return Response.json({ error: "Token expired" }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await db.query<ResultSetHeader>(
    "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
    [hash, r.user_id]
  );

  await db.query<ResultSetHeader>(
    "UPDATE password_resets SET used_at = NOW() WHERE id = ?",
    [r.id]
  );

  return Response.json({ success: true });
}

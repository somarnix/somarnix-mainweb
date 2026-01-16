import crypto from "crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { getMailer } from "@/lib/mailer";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  deleted_at: string | null;
  is_active: number;
};

export async function POST(req: Request): Promise<Response> {
  const raw: unknown = await req.json().catch(() => ({}));
  const body = isObject(raw) ? raw : {};
  const email = str(body.email).toLowerCase();
    
  console.log("EMAIL RECEIVED:", email);
    
  if (!email) {
    return Response.json({ error: "Email required" }, { status: 400 });
  }

  // ✅ Security: always return success (don’t reveal if email exists)
  const okResponse = Response.json({ success: true });

  const [users] = await db.query<UserRow[]>(
    "SELECT id, email, deleted_at, is_active FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  if (users.length === 0) return okResponse;

  const u = users[0];
  if (u.deleted_at || u.is_active === 0) return okResponse;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);

  await db.query<ResultSetHeader>(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
    [u.id, tokenHash]
  );

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetLink = `${appUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(
    email
  )}`;

  const mailer = getMailer();
  await mailer.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Reset your password",
    text: `Reset link (valid 30 minutes): ${resetLink}`,
  });

  return okResponse;
}

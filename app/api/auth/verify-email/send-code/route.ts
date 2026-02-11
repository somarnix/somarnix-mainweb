import crypto from "crypto";
import { db } from "@/lib/db";
import { getMailer } from "@/lib/mailer";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  is_active: number;
  deleted_at: string | Date | null;
  email_verified_at: string | Date | null;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.json().catch(() => null);
    const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const email = normalizeString(body.email).toLowerCase();

    if (!email || !isValidEmail(email)) {
      return Response.json({ error: "Valid email is required" }, { status: 400 });
    }

    const hasSmtpConfig =
      !!(process.env.SMTP_HOST ?? "").trim() &&
      !!(process.env.SMTP_USER ?? "").trim() &&
      !!(process.env.SMTP_PASS ?? "").trim();
    if (!hasSmtpConfig) {
      return Response.json(
        {
          error: "Email service is not configured",
          detail: "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment.",
        },
        { status: 500 }
      );
    }

    const [users] = await db.query<UserRow[]>(
      `
      SELECT id, email, is_active, deleted_at, email_verified_at
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
      return Response.json({ error: "Email already verified" }, { status: 400 });
    }

    const code = generateCode();
    const codeHash = sha256Hex(code);

    await db.query<ResultSetHeader>(
      `
      UPDATE user_email_verifications
      SET used_at = NOW()
      WHERE user_id = ? AND used_at IS NULL
      `,
      [user.id]
    );

    await db.query<ResultSetHeader>(
      `
      INSERT INTO user_email_verifications (user_id, code_hash, expires_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
      `,
      [user.id, codeHash]
    );

    const mailer = getMailer();
    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: "Verify your email",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    return Response.json({ success: true, expiresInMinutes: 10 });
  } catch (err) {
    return Response.json(
      { error: "Failed to send verification code", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


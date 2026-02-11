import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getMailer } from "@/lib/mailer";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type IdRow = RowDataPacket & { id: number };
type ExistingUserRow = RowDataPacket & {
  id: number;
  username: string | null;
  email_verified_at: string | Date | null;
  deleted_at: string | Date | null;
};

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isValidUsername(username: string): boolean {
  // letters, numbers, underscore, dot; 3-30 chars
  return /^[a-zA-Z0-9._]{3,30}$/.test(username);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [table, column]
  );
  return rows.length > 0;
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

export async function POST(req: Request): Promise<Response> {
  try {
    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    const firstName = getString(b.firstName);
    const lastName = getString(b.lastName);
    const username = getString(b.username);
    const birthDate = getString(b.birthDate); // "YYYY-MM-DD"
    const place = getString(b.place);
    const email = getString(b.email).toLowerCase();
    const password = typeof b.password === "string" ? b.password : "";
    const isGmailAddress = email.endsWith("@gmail.com");

    if (!firstName || !lastName) {
      return Response.json({ error: "First name and last name required" }, { status: 400 });
    }
    if (!email || !password) {
      return Response.json({ error: "Email and password required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!username) {
      return Response.json({ error: "Username required" }, { status: 400 });
    }
    if (!isValidUsername(username)) {
      return Response.json(
        { error: "Username invalid (3-30 chars, letters/numbers/._ only)" },
        { status: 400 }
      );
    }

    // birthDate optional, but if provided must be YYYY-MM-DD
    const birthDateValue =
      birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : null;

    // place optional
    const placeValue = place || null;

    const hasVerifiedColumn = await hasColumn("users", "email_verified_at");
    const hasVerificationTable = await hasTable("user_email_verifications");
    const requireEmailVerification = !isGmailAddress;

    if (requireEmailVerification && (!hasVerifiedColumn || !hasVerificationTable)) {
      return Response.json(
        { error: "Email verification not ready. Run sql/2026-02-11-video-course-access-sync.sql" },
        { status: 500 }
      );
    }

    const hasSmtpConfig =
      !!(process.env.SMTP_HOST ?? "").trim() &&
      !!(process.env.SMTP_USER ?? "").trim() &&
      !!(process.env.SMTP_PASS ?? "").trim();
    if (requireEmailVerification && !hasSmtpConfig) {
      return Response.json(
        {
          error: "Email service is not configured",
          detail: "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment.",
        },
        { status: 500 }
      );
    }

    // check email exists
    const [emailRows] = await db.query<ExistingUserRow[]>(
      "SELECT id, username, email_verified_at, deleted_at FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    const existingId = emailRows.length > 0 ? Number(emailRows[0].id) : 0;
    const [uRows] = await db.query<IdRow[]>(
      "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
      [username, existingId]
    );
    if (uRows.length > 0) {
      return Response.json({ error: "Username already exists" }, { status: 409 });
    }

    if (emailRows.length > 0) {
      const existing = emailRows[0];
      if (existing.deleted_at) {
        return Response.json({ error: "This email belongs to a deleted account" }, { status: 409 });
      }
      if (existing.email_verified_at) {
        return Response.json({ error: "Email already exists" }, { status: 409 });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      if (isGmailAddress) {
        if (hasVerifiedColumn) {
          await db.query<ResultSetHeader>(
            `
            UPDATE users
            SET
              password_hash = ?,
              first_name = ?,
              last_name = ?,
              username = ?,
              birth_date = ?,
              place = ?,
              is_active = 1,
              email_verified_at = NOW(),
              updated_at = NOW()
            WHERE id = ?
            `,
            [passwordHash, firstName, lastName, username, birthDateValue, placeValue, existing.id]
          );
        } else {
          await db.query<ResultSetHeader>(
            `
            UPDATE users
            SET
              password_hash = ?,
              first_name = ?,
              last_name = ?,
              username = ?,
              birth_date = ?,
              place = ?,
              is_active = 1,
              updated_at = NOW()
            WHERE id = ?
            `,
            [passwordHash, firstName, lastName, username, birthDateValue, placeValue, existing.id]
          );
        }

        return Response.json({
          success: true,
          requiresVerification: false,
          email,
        });
      }

      const code = generateCode();
      const codeHash = sha256Hex(code);
      await db.query<ResultSetHeader>(
        `
        UPDATE user_email_verifications
        SET used_at = NOW()
        WHERE user_id = ? AND used_at IS NULL
        `,
        [existing.id]
      );
      await db.query<ResultSetHeader>(
        `
        INSERT INTO user_email_verifications (user_id, code_hash, expires_at)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
        `,
        [existing.id, codeHash]
      );
      const mailer = getMailer();
      await mailer.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Verify your email",
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
      });
      return Response.json(
        {
          error: "Email exists but not verified. New verification code sent.",
          code: "EMAIL_NOT_VERIFIED",
          email,
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [insertResult] = hasVerifiedColumn
      ? await db.query<ResultSetHeader>(
          `
          INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, username, birth_date, place, email_verified_at)
          VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            email,
            passwordHash,
            isGmailAddress ? 1 : 0,
            firstName,
            lastName,
            username,
            birthDateValue,
            placeValue,
            isGmailAddress ? new Date() : null,
          ]
        )
      : await db.query<ResultSetHeader>(
          `
          INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, username, birth_date, place)
          VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?)
          `,
          [
            email,
            passwordHash,
            isGmailAddress ? 1 : 0,
            firstName,
            lastName,
            username,
            birthDateValue,
            placeValue,
          ]
        );
    const userId = Number(insertResult.insertId);

    if (isGmailAddress) {
      return Response.json({
        success: true,
        requiresVerification: false,
        email,
      });
    }

    const code = generateCode();
    const codeHash = sha256Hex(code);
    await db.query<ResultSetHeader>(
      `
      INSERT INTO user_email_verifications (user_id, code_hash, expires_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
      `,
      [userId, codeHash]
    );

    const mailer = getMailer();
    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Verify your email",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    return Response.json({
      success: true,
      requiresVerification: true,
      email,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}

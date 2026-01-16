import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

type IdRow = RowDataPacket & { id: number };
type UsernameRow = RowDataPacket & { username: string };

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isValidUsername(username: string): boolean {
  // letters, numbers, underscore, dot; 3-30 chars
  return /^[a-zA-Z0-9._]{3,30}$/.test(username);
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

    if (!firstName || !lastName) {
      return Response.json({ error: "First name and last name required" }, { status: 400 });
    }
    if (!email || !password) {
      return Response.json({ error: "Email and password required" }, { status: 400 });
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

    // check email exists
    const [emailRows] = await db.query<IdRow[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (emailRows.length > 0) {
      return Response.json({ error: "Email already exists" }, { status: 409 });
    }

    // check username exists
    const [uRows] = await db.query<UsernameRow[]>(
      "SELECT username FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    if (uRows.length > 0) {
      return Response.json({ error: "Username already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query<ResultSetHeader>(
      `
      INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, username, birth_date, place)
      VALUES (?, ?, 'user', 1, ?, ?, ?, ?, ?)
      `,
      [email, passwordHash, firstName, lastName, username, birthDateValue, placeValue]
    );

    return Response.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}

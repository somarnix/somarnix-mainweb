import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { normalizeSupportFaqRecord } from "@/app/lib/support-faq";

type SupportFaqRow = RowDataPacket & {
  id: number;
  question_en: string | null;
  question_km: string | null;
  answer_en: string | null;
  answer_km: string | null;
  video_url: string | null;
  sort_order: number | null;
  is_active: number | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

function readString(value: unknown, max = 0) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!max || normalized.length <= max) return normalized;
  return normalized.slice(0, max);
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return false;
}

function readNumber(value: unknown, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

async function ensureSupportFaqTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS support_faqs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      question_en VARCHAR(500) NOT NULL,
      question_km VARCHAR(500) NOT NULL,
      answer_en TEXT NOT NULL,
      answer_km TEXT NOT NULL,
      video_url VARCHAR(2000) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_support_faqs_active_sort (is_active, sort_order, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function listFaqs() {
  const [rows] = await db.query<SupportFaqRow[]>(
    `
    SELECT
      id,
      question_en,
      question_km,
      answer_en,
      answer_km,
      video_url,
      sort_order,
      is_active,
      created_at,
      updated_at
    FROM support_faqs
    ORDER BY sort_order ASC, id ASC
    `
  );

  return rows.map((row) =>
    normalizeSupportFaqRecord({
      id: row.id,
      questionEn: row.question_en ?? "",
      questionKm: row.question_km ?? "",
      answerEn: row.answer_en ?? "",
      answerKm: row.answer_km ?? "",
      videoUrl: row.video_url,
      sortOrder: row.sort_order ?? 0,
      isActive: Number(row.is_active ?? 0) === 1,
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at ?? null,
      updatedAt:
        row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at ?? null,
    })
  );
}

async function requireAdmin(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return null;
  }
  return auth;
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await ensureSupportFaqTable();
    return Response.json({ items: await listFaqs() });
  } catch (error) {
    console.error("GET /api/admin/support-faq failed:", error);
    return Response.json({ error: "Failed to load support FAQs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await ensureSupportFaqTable();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const questionEn = readString(body.questionEn, 500);
    const questionKm = readString(body.questionKm, 500);
    const answerEn = readString(body.answerEn);
    const answerKm = readString(body.answerKm);
    const videoUrl = readString(body.videoUrl, 2000) || null;
    const sortOrder = Math.max(0, Math.floor(readNumber(body.sortOrder, 0)));
    const isActive = readBoolean(body.isActive);

    if (!questionEn || !questionKm || !answerEn || !answerKm) {
      return Response.json({ error: "All question and answer fields are required" }, { status: 400 });
    }

    const [result] = await db.query<ResultSetHeader>(
      `
      INSERT INTO support_faqs
        (question_en, question_km, answer_en, answer_km, video_url, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [questionEn, questionKm, answerEn, answerKm, videoUrl, sortOrder, isActive ? 1 : 0]
    );

    const items = await listFaqs();
    return Response.json({ ok: true, id: result.insertId, items });
  } catch (error) {
    console.error("POST /api/admin/support-faq failed:", error);
    return Response.json({ error: "Failed to create support FAQ" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await ensureSupportFaqTable();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = Math.floor(readNumber(body.id, 0));
    const questionEn = readString(body.questionEn, 500);
    const questionKm = readString(body.questionKm, 500);
    const answerEn = readString(body.answerEn);
    const answerKm = readString(body.answerKm);
    const videoUrl = readString(body.videoUrl, 2000) || null;
    const sortOrder = Math.max(0, Math.floor(readNumber(body.sortOrder, 0)));
    const isActive = readBoolean(body.isActive);

    if (id <= 0) {
      return Response.json({ error: "Invalid FAQ id" }, { status: 400 });
    }
    if (!questionEn || !questionKm || !answerEn || !answerKm) {
      return Response.json({ error: "All question and answer fields are required" }, { status: 400 });
    }

    await db.query(
      `
      UPDATE support_faqs
      SET
        question_en = ?,
        question_km = ?,
        answer_en = ?,
        answer_km = ?,
        video_url = ?,
        sort_order = ?,
        is_active = ?
      WHERE id = ?
      `,
      [questionEn, questionKm, answerEn, answerKm, videoUrl, sortOrder, isActive ? 1 : 0, id]
    );

    return Response.json({ ok: true, items: await listFaqs() });
  } catch (error) {
    console.error("PATCH /api/admin/support-faq failed:", error);
    return Response.json({ error: "Failed to update support FAQ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await ensureSupportFaqTable();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = Math.floor(readNumber(body.id, 0));
    if (id <= 0) {
      return Response.json({ error: "Invalid FAQ id" }, { status: 400 });
    }

    await db.query(`DELETE FROM support_faqs WHERE id = ?`, [id]);
    return Response.json({ ok: true, items: await listFaqs() });
  } catch (error) {
    console.error("DELETE /api/admin/support-faq failed:", error);
    return Response.json({ error: "Failed to delete support FAQ" }, { status: 500 });
  }
}

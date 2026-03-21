import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
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

export async function GET() {
  try {
    await ensureSupportFaqTable();
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
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    return Response.json({
      items: rows.map((row) =>
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
      ),
    });
  } catch (error) {
    console.error("GET /api/support/faq failed:", error);
    return Response.json({ items: [], error: "Failed to load support FAQs" }, { status: 500 });
  }
}

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type CourseRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  category: string | null;
  tags: string | null;
  description: string | null;
  level: string;
  author_name: string | null;
  author_avatar_url: string | null;
  rating: number | string | null;
  rating_count: number | null;
  students_count: number | null;
  upload_date: string | Date | null;
  thumbnail_url: string | null;
  hero_url: string | null;
  preview_mode: string;
  preview_count: number;
  is_active: number;
};

type SectionRow = RowDataPacket & {
  id: number;
  title: string;
  position: number;
};

type LessonRow = RowDataPacket & {
  section_id: number;
  title: string;
  description: string | null;
  video_url: string;
  duration_label: string | null;
  position: number;
  is_free_preview: number;
  is_active: number;
};

type PlanRow = RowDataPacket & {
  name: string;
  access_type: string;
  duration_days: number | null;
  price: number | string | null;
  is_active: number;
  khqr: string | null;
  usdqr: string | null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const courseId = Number(id);
  if (!Number.isFinite(courseId) || courseId <= 0) {
    return Response.json({ error: "Invalid course id" }, { status: 400 });
  }

  try {
    const [courseRows] = await db.query<CourseRow[]>(
      `
      SELECT
        id,
        title,
        slug,
        category,
        tags,
        description,
        level,
        author_name,
        author_avatar_url,
        rating,
        rating_count,
        students_count,
        upload_date,
        thumbnail_url,
        hero_url,
        preview_mode,
        preview_count,
        is_active
      FROM video_courses
      WHERE id = ?
      LIMIT 1
      `,
      [courseId]
    );

    if (courseRows.length === 0) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }

    const course = courseRows[0];
    const suffix = `copy-${Date.now()}`;
    const newSlug = `${course.slug}-${suffix}`;
    const newTitle = `${course.title} (Copy)`;

    await db.query("START TRANSACTION");

    const [insertCourse] = await db.query<ResultSetHeader>(
      `
      INSERT INTO video_courses (
        title,
        slug,
        category,
        tags,
        description,
        level,
        author_name,
        author_avatar_url,
        rating,
        rating_count,
        students_count,
        upload_date,
        thumbnail_url,
        hero_url,
        preview_mode,
        preview_count,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        newTitle,
        newSlug,
        course.category,
        course.tags,
        course.description,
        course.level,
        course.author_name,
        course.author_avatar_url,
        course.rating,
        course.rating_count,
        course.students_count,
        course.upload_date,
        course.thumbnail_url,
        course.hero_url,
        course.preview_mode,
        course.preview_count,
        0,
      ]
    );

    const newCourseId = insertCourse.insertId;

    const [sections] = await db.query<SectionRow[]>(
      `
      SELECT id, title, position
      FROM video_course_sections
      WHERE course_id = ?
      ORDER BY position ASC, id ASC
      `,
      [courseId]
    );

    const sectionIdMap = new Map<number, number>();
    for (const section of sections) {
      const [insertSection] = await db.query<ResultSetHeader>(
        `
        INSERT INTO video_course_sections (course_id, title, position)
        VALUES (?, ?, ?)
        `,
        [newCourseId, section.title, section.position ?? 0]
      );
      sectionIdMap.set(section.id, insertSection.insertId);
    }

    const [lessons] = await db.query<LessonRow[]>(
      `
      SELECT
        section_id,
        title,
        description,
        video_url,
        duration_label,
        position,
        is_free_preview,
        is_active
      FROM video_course_lessons
      WHERE course_id = ?
      ORDER BY position ASC, id ASC
      `,
      [courseId]
    );

    if (lessons.length > 0) {
      const lessonValues: Array<unknown> = [];
      const lessonPlaceholders = lessons.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)");
      lessons.forEach((lesson) => {
        const newSectionId = sectionIdMap.get(lesson.section_id);
        if (!newSectionId) return;
        lessonValues.push(
          newCourseId,
          newSectionId,
          lesson.title,
          lesson.description,
          lesson.video_url,
          lesson.duration_label,
          lesson.position ?? 0,
          lesson.is_free_preview ?? 0,
          lesson.is_active ?? 1
        );
      });

      if (lessonValues.length > 0) {
        await db.query(
          `
          INSERT INTO video_course_lessons (
            course_id,
            section_id,
            title,
            description,
            video_url,
            duration_label,
            position,
            is_free_preview,
            is_active
          )
          VALUES ${lessonPlaceholders.join(", ")}
          `,
          lessonValues
        );
      }
    }

    const [plans] = await db.query<PlanRow[]>(
      `
      SELECT
        name,
        access_type,
        duration_days,
        price,
        is_active,
        khqr,
        usdqr
      FROM video_course_plans
      WHERE course_id = ?
      ORDER BY id ASC
      `,
      [courseId]
    );

    if (plans.length > 0) {
      const planValues: Array<unknown> = [];
      const planPlaceholders = plans.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)");
      plans.forEach((plan) => {
        planValues.push(
          newCourseId,
          plan.name,
          plan.access_type,
          plan.duration_days,
          plan.price ?? 0,
          plan.is_active ?? 1,
          plan.khqr ?? "/paymentQR/khmer_qr.jpg",
          plan.usdqr ?? "none"
        );
      });
      await db.query(
        `
        INSERT INTO video_course_plans (
          course_id,
          name,
          access_type,
          duration_days,
          price,
          is_active,
          khqr,
          usdqr
        )
        VALUES ${planPlaceholders.join(", ")}
        `,
        planValues
      );
    }

    await db.query("COMMIT");

    return Response.json({ success: true, id: newCourseId, slug: newSlug });
  } catch (err) {
    await db.query("ROLLBACK");
    return Response.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

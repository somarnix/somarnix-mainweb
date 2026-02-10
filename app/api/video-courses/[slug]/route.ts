import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type CourseRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  posted_by?: number | null;
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
  learning_outcomes: string | null;
  preview_mode: string;
  preview_count: number;
};

type SectionRow = RowDataPacket & {
  id: number;
  title: string;
  position: number;
};

type LessonRow = RowDataPacket & {
  id: number;
  section_id: number;
  title: string;
  video_url: string;
  duration_label: string | null;
  position: number;
  is_free_preview: number;
  is_active: number;
};

type AccessRow = RowDataPacket & { id: number };
type SubscriptionStatusRow = RowDataPacket & {
  plan_id: number;
  status: "pending" | "active" | "expired" | "cancelled";
  access_end: Date | string | null;
};
type PlanRow = RowDataPacket & {
  id: number;
  name: string;
  access_type: string;
  duration_days: number | null;
  price: number | string;
  khqr: string | null;
  usdqr: string | null;
};
type SubscriptionPlanRow = RowDataPacket & {
  id: number;
  name: string;
  duration_days: number;
  price: number | string;
  description: string | null;
  features: string | null;
  access_courses: number;
  access_ai_tools: number;
  access_downloads: number;
  khqr: string | null;
  usdqr: string | null;
};

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim();
      return id || null;
    }
    const v = u.searchParams.get("v");
    if (v) return v.trim();
    const parts = u.pathname.split("/").filter(Boolean);
    const embedIndex = parts.indexOf("embed");
    if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1].trim();
    return null;
  } catch {
    return null;
  }
}

function formatDurationLabel(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

async function fetchYouTubeDurationLabel(videoUrl: string): Promise<string | null> {
  const id = getYouTubeId(videoUrl);
  if (!id) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const html = await response.text();
    const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
    if (lengthMatch?.[1]) {
      const seconds = Number(lengthMatch[1]);
      if (Number.isFinite(seconds) && seconds > 0) {
        return formatDurationLabel(seconds);
      }
    }
    const approxMatch = html.match(/"approxDurationMs":"(\d+)"/);
    if (approxMatch?.[1]) {
      const seconds = Math.floor(Number(approxMatch[1]) / 1000);
      if (Number.isFinite(seconds) && seconds > 0) {
        return formatDurationLabel(seconds);
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug?: string }> }
) {
  const params = await ctx.params;
  const slug = (params?.slug ?? "").trim();
  if (!slug) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const [postedByColumnRows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'video_courses'
      AND COLUMN_NAME = 'posted_by'
    `
  );
  const hasPostedByColumn = Number(postedByColumnRows[0]?.cnt ?? 0) > 0;

  const [learningOutcomesColumnRows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'video_courses'
      AND column_name = 'learning_outcomes'
    LIMIT 1
    `
  );
  const hasLearningOutcomesColumn = learningOutcomesColumnRows.length > 0;

  const [courseRows] = await db.query<CourseRow[]>(
    `
    SELECT
      id,
      title,
      slug,
      ${hasPostedByColumn ? "posted_by," : ""}
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
      ${hasLearningOutcomesColumn ? "learning_outcomes," : "NULL AS learning_outcomes,"}
      preview_mode,
      preview_count
    FROM video_courses
    WHERE slug = ? AND is_active = 1
    LIMIT 1
    `,
    [slug]
  );

  if (courseRows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const course = courseRows[0];

  const [sections] = await db.query<SectionRow[]>(
    `
    SELECT id, title, position
    FROM video_course_sections
    WHERE course_id = ?
    ORDER BY position ASC, id ASC
    `,
    [course.id]
  );

  const [lessons] = await db.query<LessonRow[]>(
    `
    SELECT id, section_id, title, video_url, duration_label, position, is_free_preview, is_active
    FROM video_course_lessons
    WHERE course_id = ? AND is_active = 1
    ORDER BY position ASC, id ASC
    `,
    [course.id]
  );

  const [plans] = await db.query<PlanRow[]>(
    `
    SELECT id, name, access_type, duration_days, price, khqr, usdqr
    FROM video_course_plans
    WHERE course_id = ? AND is_active = 1
    ORDER BY id ASC
    `,
    [course.id]
  );

  const [subscriptionPlans] = await db.query<SubscriptionPlanRow[]>(
    `
    SELECT
      id,
      name,
      duration_days,
      price,
      description,
      features,
      access_courses,
      access_ai_tools,
      access_downloads,
      khqr,
      usdqr
    FROM video_subscription_plans
    WHERE is_active = 1
    ORDER BY id ASC
    `
  );

  const auth = await getAuthUser(req);
  let hasSubscription = false;
  let hasCourseAccess = false;
  let activeSubscriptionPlanId: number | null = null;
  let pendingSubscriptionPlanId: number | null = null;

  if (auth?.userId) {
    const [subRows] = await db.query<SubscriptionStatusRow[]>(
      `
      SELECT plan_id, status, access_end
      FROM video_subscriptions
      WHERE user_id = ?
        AND status IN ('active','pending')
      ORDER BY
        CASE status WHEN 'active' THEN 0 ELSE 1 END,
        access_end DESC
      LIMIT 2
      `,
      [auth.userId]
    );
    const activeRow = subRows.find((row) => row.status === "active");
    const pendingRow = subRows.find((row) => row.status === "pending");
    if (activeRow) {
      hasSubscription = true;
      activeSubscriptionPlanId = Number(activeRow.plan_id);
    }
    if (pendingRow) {
      pendingSubscriptionPlanId = Number(pendingRow.plan_id);
    }

    if (!hasSubscription) {
      const [purchaseRows] = await db.query<AccessRow[]>(
        `
        SELECT id
        FROM video_course_purchases
        WHERE user_id = ?
          AND course_id = ?
          AND status = 'active'
          AND (access_end IS NULL OR access_end >= NOW())
        LIMIT 1
        `,
        [auth.userId, course.id]
      );
      hasCourseAccess = purchaseRows.length > 0;
    }
  }

  const hasAccess = hasSubscription || hasCourseAccess;
  const previewCount = Number(course.preview_count ?? 0);
  const previewMode = course.preview_mode === "manual" ? "manual" : "count";

  const previewIds = new Set<number>();
  if (!hasAccess && previewMode === "count" && previewCount > 0) {
    lessons.slice(0, previewCount).forEach((lesson) => previewIds.add(lesson.id));
  }

  const mappedLessons = lessons.map((lesson) => {
    const durationLabel = lesson.duration_label;
    const isPreview =
      hasAccess ||
      (previewMode === "manual" && !!lesson.is_free_preview) ||
      previewIds.has(lesson.id);

    return {
      id: lesson.id,
      section_id: lesson.section_id,
      title: lesson.title,
      video_url: isPreview ? lesson.video_url : null,
      duration_label: durationLabel,
      position: lesson.position,
      is_free_preview: !!lesson.is_free_preview,
      is_locked: !isPreview,
    };
  });

  const durationCache = new Map<string, string | null>();
  const mappedLessonsWithDuration = await Promise.all(
    mappedLessons.map(async (lesson) => {
      if (lesson.duration_label || !lesson.video_url) return lesson;
      const cacheKey = lesson.video_url;
      if (durationCache.has(cacheKey)) {
        return { ...lesson, duration_label: durationCache.get(cacheKey) };
      }
      const detected = await fetchYouTubeDurationLabel(lesson.video_url);
      durationCache.set(cacheKey, detected);
      return { ...lesson, duration_label: detected };
    })
  );

  return Response.json({
    course,
    sections,
    lessons: mappedLessonsWithDuration,
    plans,
    subscription_plans: subscriptionPlans,
    access: {
      has_access: hasAccess,
      has_subscription: hasSubscription,
      has_course_access: hasCourseAccess,
      preview_mode: previewMode,
      preview_count: previewCount,
      active_subscription_plan_id: activeSubscriptionPlanId,
      pending_subscription_plan_id: pendingSubscriptionPlanId,
    },
  });
}

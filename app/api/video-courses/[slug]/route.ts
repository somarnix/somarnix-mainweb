import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CourseRow = RowDataPacket & {
  id: number;
  title: string;
  slug: string;
  posted_by?: number | null;
  posted_by_username?: string | null;
  category: string | null;
  tags: string | null;
  description: string | null;
  level: string;
  author_name: string | null;
  author_avatar_url: string | null;
  telegram_url: string | null;
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

type LinkedAuthorUserRow = RowDataPacket & {
  id: number;
  username: string;
  avatar_url: string | null;
};

function extractLinkedAuthorUsername(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed.startsWith("@")) return null;
  const username = trimmed.slice(1).trim();
  return username || null;
}

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

type SubscriptionStatusRow = RowDataPacket & {
  plan_id: number;
  status: "pending" | "active" | "expired" | "cancelled";
  access_end: Date | string | null;
};
type CoursePurchaseStatusRow = RowDataPacket & {
  plan_id: number;
  status: "pending" | "active" | "expired" | "cancelled";
  access_end: Date | string | null;
  access_type: "lifetime" | "months";
  max_devices: number;
  is_unlimited_device: number;
  order_number: string | null;
};
type PlanRow = RowDataPacket & {
  id: number;
  name: string;
  access_type: string;
  duration_days: number | null;
  price: number | string;
  max_devices: number;
  is_unlimited_device: number;
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
  const url = new URL(req.url);
  const deviceId = (url.searchParams.get("deviceId") || "").trim();
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
  const [telegramUrlColumnRows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'video_courses'
      AND COLUMN_NAME = 'telegram_url'
    `
  );
  const hasTelegramUrlColumn = Number(telegramUrlColumnRows[0]?.cnt ?? 0) > 0;

  const [orderStateColumnRows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'orders'
      AND column_name = 'state'
    LIMIT 1
    `
  );
  const hasOrderStateColumn = orderStateColumnRows.length > 0;

  const [orderStatusColumnRows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'orders'
      AND column_name = 'status'
    LIMIT 1
    `
  );
  const hasOrderStatusColumn = orderStatusColumnRows.length > 0;

  const completedOrderClause = (alias: string) =>
    hasOrderStateColumn
      ? `${alias}.state IN ('completed','complete')`
      : hasOrderStatusColumn
        ? `${alias}.status IN ('completed','complete')`
        : "1 = 0";

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
      ${hasTelegramUrlColumn ? "telegram_url," : "NULL AS telegram_url,"}
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
  const linkedAuthorUsername = extractLinkedAuthorUsername(course.author_avatar_url);
  if (linkedAuthorUsername) {
    const [linkedRows] = await db.query<LinkedAuthorUserRow[]>(
      `
      SELECT id, username, avatar_url
      FROM users
      WHERE LOWER(username) = LOWER(?)
        AND is_active = 1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [linkedAuthorUsername]
    );
    if (linkedRows.length > 0) {
      course.posted_by = linkedRows[0].id;
      course.posted_by_username = linkedRows[0].username;
      course.author_avatar_url = linkedRows[0].avatar_url;
    }
  } else if (hasPostedByColumn && Number(course.posted_by ?? 0) > 0) {
    const [sellerRows] = await db.query<RowDataPacket[]>(
      `
      SELECT username
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [Number(course.posted_by)]
    );
    course.posted_by_username =
      typeof sellerRows[0]?.username === "string" ? sellerRows[0].username : null;
  } else {
    course.posted_by_username = null;
  }

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
    SELECT id, name, access_type, duration_days, price, max_devices, is_unlimited_device, khqr, usdqr
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
  let activeCoursePlanId: number | null = null;
  let pendingCoursePlanId: number | null = null;
  let lifetimeCoursePurchased = false;
  let courseOrderNumber: string | null = null;
  let courseDeviceLimit: number | null = null;
  let courseDeviceCount: number | null = null;
  let courseAccessReason: string | null = null;

  if (auth?.userId) {
    const [subRows] = await db.query<SubscriptionStatusRow[]>(
      `
      SELECT plan_id, status, access_end
      FROM video_subscriptions
      WHERE user_id = ?
        AND (
          (status = 'active' AND (access_end IS NULL OR access_end >= NOW()))
          OR status = 'pending'
        )
        AND (
          order_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.id = video_subscriptions.order_id
              AND ${completedOrderClause("o")}
          )
        )
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

    const [coursePurchaseRows] = await db.query<CoursePurchaseStatusRow[]>(
      `
      SELECT
        vcp.plan_id,
        vcp.status,
        vcp.access_end,
        vplan.access_type,
        vplan.max_devices,
        vplan.is_unlimited_device,
        o.order_number
      FROM video_course_purchases vcp
      JOIN video_course_plans vplan ON vplan.id = vcp.plan_id
      LEFT JOIN orders o ON o.id = vcp.order_id
      WHERE vcp.user_id = ?
        AND vcp.course_id = ?
        AND (
          vcp.order_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM orders o2
            WHERE o2.id = vcp.order_id
              AND ${completedOrderClause("o2")}
          )
        )
      ORDER BY
        CASE vcp.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
        vcp.access_end DESC,
        vcp.id DESC
      `,
      [auth.userId, course.id]
    );

    const activeCourseRow = coursePurchaseRows.find((row) => {
      if (row.status !== "active") return false;
      if (!row.access_end) return true;
      const end = row.access_end instanceof Date ? row.access_end : new Date(row.access_end);
      return !Number.isNaN(end.getTime()) && end.getTime() >= Date.now();
    });
    const pendingCourseRow = coursePurchaseRows.find((row) => row.status === "pending");

    if (activeCourseRow) {
      hasCourseAccess = true;
      activeCoursePlanId = Number(activeCourseRow.plan_id);
      const unlimited = Number(activeCourseRow.is_unlimited_device ?? 0) === 1;
      const rawLimit = Number(activeCourseRow.max_devices ?? 0);
      const maxDevices =
        unlimited ? 9999 : Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 1;
      courseDeviceLimit = maxDevices;

      if (!unlimited) {
        if (!deviceId) {
          hasCourseAccess = false;
          courseAccessReason = "device_id_required";
        } else {
          try {
            const [existingDeviceRows] = await db.query<RowDataPacket[]>(
              `
              SELECT id
              FROM video_course_device_access
              WHERE user_id = ? AND course_id = ? AND device_id = ?
              LIMIT 1
              `,
              [auth.userId, course.id, deviceId]
            );

            if (existingDeviceRows.length > 0) {
              await db.query(
                `
                UPDATE video_course_device_access
                SET last_used_at = NOW()
                WHERE user_id = ? AND course_id = ? AND device_id = ?
                `,
                [auth.userId, course.id, deviceId]
              );
            } else {
              const [countRows] = await db.query<RowDataPacket[]>(
                `
                SELECT COUNT(*) AS total
                FROM video_course_device_access
                WHERE user_id = ? AND course_id = ?
                `,
                [auth.userId, course.id]
              );
              const totalDevices = Number(countRows[0]?.total ?? 0);
              courseDeviceCount = totalDevices;
              if (totalDevices >= maxDevices) {
                hasCourseAccess = false;
                courseAccessReason = "device_limit";
              } else {
                await db.query(
                  `
                  INSERT INTO video_course_device_access (user_id, course_id, device_id, device_name)
                  VALUES (?, ?, ?, ?)
                  `,
                  [auth.userId, course.id, deviceId, (req.headers.get("user-agent") || "").slice(0, 120)]
                );
              }
            }

            if (hasCourseAccess) {
              const [newCountRows] = await db.query<RowDataPacket[]>(
                `
                SELECT COUNT(*) AS total
                FROM video_course_device_access
                WHERE user_id = ? AND course_id = ?
                `,
                [auth.userId, course.id]
              );
              courseDeviceCount = Number(newCountRows[0]?.total ?? 0);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
            if (message.includes("video_course_device_access")) {
              // migration not yet applied; keep access behavior unchanged
            } else {
              throw err;
            }
          }
        }
      }
    }
    if (pendingCourseRow) {
      pendingCoursePlanId = Number(pendingCourseRow.plan_id);
    }

    lifetimeCoursePurchased = coursePurchaseRows.some(
      (row) =>
        row.access_type === "lifetime" &&
        (row.status === "active" || row.status === "pending")
    );
    courseOrderNumber =
      coursePurchaseRows
        .map((row) =>
          typeof row.order_number === "string" ? row.order_number.trim() : ""
        )
        .find((value) => value.length > 0) ?? null;
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
      active_course_plan_id: activeCoursePlanId,
      pending_course_plan_id: pendingCoursePlanId,
      lifetime_course_purchased: lifetimeCoursePurchased,
      course_order_number: courseOrderNumber,
      course_device_limit: courseDeviceLimit,
      course_device_count: courseDeviceCount,
      course_access_reason: courseAccessReason,
    },
  });
}

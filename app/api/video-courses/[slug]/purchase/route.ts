import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

function makeOrderNumber(): string {
  return (
    String(Date.now()) +
    String(Math.floor(Math.random() * 1000)).padStart(3, "0")
  );
}

type CourseRow = RowDataPacket & { id: number };
type PlanRow = RowDataPacket & {
  id: number;
  price: number | string;
  access_type: string;
  duration_days: number | null;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug?: string }> }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await ctx.params;
  const slug = (params?.slug ?? "").trim();
  if (!slug) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const planId = Number(data.planId);
  if (!Number.isFinite(planId) || planId <= 0) {
    return Response.json({ error: "planId is required" }, { status: 400 });
  }

  const [courseRows] = await db.query<CourseRow[]>(
    "SELECT id FROM video_courses WHERE slug = ? AND is_active = 1 LIMIT 1",
    [slug]
  );
  if (courseRows.length === 0) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }
  const courseId = Number(courseRows[0].id);

  const [planRows] = await db.query<PlanRow[]>(
    `
    SELECT id, price, access_type, duration_days
    FROM video_course_plans
    WHERE id = ? AND course_id = ? AND is_active = 1
    LIMIT 1
    `,
    [planId, courseId]
  );
  if (planRows.length === 0) {
    return Response.json({ error: "Plan not found" }, { status: 404 });
  }

  const plan = planRows[0];
  const price = Number(plan.price);
  if (!Number.isFinite(price) || price < 0) {
    return Response.json({ error: "Invalid price" }, { status: 400 });
  }

  const taxRate = 0.0;
  const taxAmount = Math.round(price * (taxRate / 100) * 100) / 100;
  const total = Math.round((price + taxAmount) * 100) / 100;
  const orderNumber = makeOrderNumber();

  let orderId: number;
  let usedLegacyInsert = false;
  try {
    const [orderIns] = await db.query<ResultSetHeader>(
      `
      INSERT INTO orders (
        user_id,
        order_number,
        state,
        result,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        total_amount
      )
      VALUES (?, ?, 'pending', 'none', ?, ?, ?, ?, ?)
      `,
      [auth.userId, orderNumber, price, taxRate, taxAmount, total, total]
    );
    orderId = Number(orderIns.insertId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const needsLegacyInsert =
      message.includes("state") ||
      message.includes("total_amount") ||
      message.includes("result");
    if (!needsLegacyInsert) {
      throw err;
    }

    const [legacyIns] = await db.query<ResultSetHeader>(
      `
      INSERT INTO orders (user_id, order_number, status, subtotal, tax_rate, tax_amount, total)
      VALUES (?, ?, 'pending', ?, ?, ?, ?)
      `,
      [auth.userId, orderNumber, price, taxRate, taxAmount, total]
    );
    orderId = Number(legacyIns.insertId);
    usedLegacyInsert = true;
  }

  const accessStart = new Date();
  const accessEnd =
    plan.access_type === "months" && plan.duration_days
      ? new Date(accessStart.getTime() + Number(plan.duration_days) * 24 * 60 * 60 * 1000)
      : null;

  await db.query<ResultSetHeader>(
    `
    INSERT INTO video_course_purchases (
      order_id,
      user_id,
      course_id,
      plan_id,
      access_start,
      access_end,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `,
    [
      orderId,
      auth.userId,
      courseId,
      planId,
      accessStart,
      accessEnd,
    ]
  );

  return Response.json({
    success: true,
    orderId,
    orderNumber,
    subtotal: price,
    taxRate,
    taxAmount,
    total,
    status: usedLegacyInsert ? "pending" : undefined,
    state: usedLegacyInsert ? undefined : "pending",
  });
}

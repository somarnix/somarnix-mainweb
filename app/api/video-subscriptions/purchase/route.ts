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

type PlanRow = RowDataPacket & {
  id: number;
  price: number | string;
  duration_days: number;
};

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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

  const [planRows] = await db.query<PlanRow[]>(
    `
    SELECT id, price, duration_days
    FROM video_subscription_plans
    WHERE id = ? AND is_active = 1
    LIMIT 1
    `,
    [planId]
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
  const accessEnd = new Date(
    accessStart.getTime() + Number(plan.duration_days) * 24 * 60 * 60 * 1000
  );

  await db.query<ResultSetHeader>(
    `
    INSERT INTO video_subscriptions (
      order_id,
      user_id,
      plan_id,
      access_start,
      access_end,
      status
    )
    VALUES (?, ?, ?, ?, ?, 'pending')
    `,
    [orderId, auth.userId, planId, accessStart, accessEnd]
  );

  try {
    await db.query<ResultSetHeader>(
      `UPDATE orders SET payment_state = 'waiting' WHERE id = ?`,
      [orderId]
    );
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (!(message.includes("unknown column") && message.includes("payment_state"))) {
      throw err;
    }
  }

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

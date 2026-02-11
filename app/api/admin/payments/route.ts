import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

type PaymentRow = RowDataPacket & {
  id: number;
  order_id: number;
  order_number: string | null;
  user_email: string | null;
  account_id: string | null;
  payment_id: string | null;
  payment_apv: string | null;
  paid_at: string | Date | null;
  method: string | null;
  total: number | string | null;
  state: string | null;
  result: string | null;
  payment_state: string | null;
  admin_decision: string | null;
  decision_note: string | null;
  categories: string | null;
};

export async function GET(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let rows: PaymentRow[] = [];
    try {
      const [rowsWithPaymentState] = await db.query<PaymentRow[]>(
        `
        SELECT
          p.id,
          p.order_id,
          o.order_number,
          u.email AS user_email,
          p.account_id,
          p.payment_id,
          p.payment_apv,
          p.paid_at,
          p.method,
          COALESCE(o.total_amount, o.total) AS total,
          o.state,
          o.result,
          COALESCE(p.admin_decision, o.payment_state) AS payment_state,
          p.admin_decision,
          p.decision_note,
          cats.categories
        FROM payments p
        LEFT JOIN orders o ON o.id = p.order_id
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN (
          SELECT
            x.order_id,
            GROUP_CONCAT(DISTINCT x.category ORDER BY x.category SEPARATOR ',') AS categories
          FROM (
            SELECT oi.order_id, LOWER(pc.name) AS category
            FROM order_items oi
            JOIN products pr ON pr.id = oi.product_id
            LEFT JOIN product_categories pc ON pc.id = pr.category_id
            UNION ALL
            SELECT vcp.order_id, 'video-course' AS category
            FROM video_course_purchases vcp
          ) x
          GROUP BY x.order_id
        ) cats ON cats.order_id = p.order_id
        ORDER BY p.id DESC
        `
      );
      rows = rowsWithPaymentState;
    } catch (innerErr) {
      const msg = innerErr instanceof Error ? innerErr.message.toLowerCase() : String(innerErr).toLowerCase();
      const missingPaymentState = msg.includes("unknown column") && msg.includes("payment_state");
      const missingAdminDecision = msg.includes("unknown column") && msg.includes("admin_decision");
      if (!(missingPaymentState || missingAdminDecision)) {
        throw innerErr;
      }
      const [rowsLegacy] = await db.query<PaymentRow[]>(
        `
        SELECT
          p.id,
          p.order_id,
          o.order_number,
          u.email AS user_email,
          p.account_id,
          p.payment_id,
          p.payment_apv,
          p.paid_at,
          p.method,
          COALESCE(o.total_amount, o.total) AS total,
          o.state,
          o.result,
          NULL AS payment_state,
          NULL AS admin_decision,
          NULL AS decision_note,
          cats.categories
        FROM payments p
        LEFT JOIN orders o ON o.id = p.order_id
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN (
          SELECT
            x.order_id,
            GROUP_CONCAT(DISTINCT x.category ORDER BY x.category SEPARATOR ',') AS categories
          FROM (
            SELECT oi.order_id, LOWER(pc.name) AS category
            FROM order_items oi
            JOIN products pr ON pr.id = oi.product_id
            LEFT JOIN product_categories pc ON pc.id = pr.category_id
            UNION ALL
            SELECT vcp.order_id, 'video-course' AS category
            FROM video_course_purchases vcp
          ) x
          GROUP BY x.order_id
        ) cats ON cats.order_id = p.order_id
        ORDER BY p.id DESC
        `
      );
      rows = rowsLegacy;
    }

    return Response.json({ payments: rows });
  } catch (err) {
    return Response.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      paymentId?: number;
      decision?: "approve" | "decline";
      note?: string;
    };

    const paymentId = Number(body.paymentId ?? 0);
    const decision = String(body.decision ?? "");
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!paymentId || (decision !== "approve" && decision !== "decline")) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const [paymentRows] = await db.query<RowDataPacket[]>(
      `SELECT id, order_id FROM payments WHERE id = ? LIMIT 1`,
      [paymentId]
    );
    if (!Array.isArray(paymentRows) || paymentRows.length === 0) {
      return Response.json({ error: "Payment not found" }, { status: 404 });
    }

    const orderId = Number(paymentRows[0].order_id ?? 0);
    if (!orderId) {
      return Response.json({ error: "Order not found for payment" }, { status: 404 });
    }

    // Update payments decision first (new schema). Keep backward compatibility.
    try {
      await db.query(
        `
        UPDATE payments
        SET
          admin_decision = ?,
          decision_note = ?,
          decided_by = ?,
          decided_at = NOW()
        WHERE id = ?
        `,
        [decision === "approve" ? "approved" : "declined", note || null, auth.userId, paymentId]
      );
    } catch (innerErr) {
      const msg = innerErr instanceof Error ? innerErr.message.toLowerCase() : String(innerErr).toLowerCase();
      const missingAdminDecision = msg.includes("unknown column") && msg.includes("admin_decision");
      const missingDecisionNote = msg.includes("unknown column") && msg.includes("decision_note");
      const missingDecidedBy = msg.includes("unknown column") && msg.includes("decided_by");
      const missingDecidedAt = msg.includes("unknown column") && msg.includes("decided_at");
      if (!(missingAdminDecision || missingDecisionNote || missingDecidedBy || missingDecidedAt)) {
        throw innerErr;
      }
    }

    try {
      if (decision === "approve") {
        await db.query(
          `
          UPDATE orders
          SET
            payment_state = 'approved',
            payment_review_note = ?,
            payment_reviewed_by = ?,
            payment_reviewed_at = NOW(),
            state = 'approved',
            result = 'none',
            reviewed_by = ?,
            reviewed_at = NOW(),
            review_note = ?
          WHERE id = ?
          `,
          [
            note || "Payment approved",
            auth.userId,
            auth.userId,
            note || "Payment approved",
            orderId,
          ]
        );
      } else {
        await db.query(
          `
          UPDATE orders
          SET
            payment_state = 'declined',
            payment_review_note = ?,
            payment_reviewed_by = ?,
            payment_reviewed_at = NOW(),
            state = 'cancelled',
            result = 'failed',
            reviewed_by = ?,
            reviewed_at = NOW(),
            review_note = ?
          WHERE id = ?
          `,
          [
            note || "Payment declined",
            auth.userId,
            auth.userId,
            note || "Payment declined",
            orderId,
          ]
        );
      }
    } catch (innerErr) {
      const msg = innerErr instanceof Error ? innerErr.message.toLowerCase() : String(innerErr).toLowerCase();
      const missingPaymentState = msg.includes("unknown column") && msg.includes("payment_state");
      const missingPaymentReview = msg.includes("unknown column") && (
        msg.includes("payment_review_note") ||
        msg.includes("payment_reviewed_by") ||
        msg.includes("payment_reviewed_at")
      );
      if (!(missingPaymentState || missingPaymentReview)) {
        throw innerErr;
      }
      if (decision === "approve") {
        await db.query(
          `
          UPDATE orders
          SET
            state = 'approved',
            result = 'none',
            reviewed_by = ?,
            reviewed_at = NOW(),
            review_note = ?
          WHERE id = ?
          `,
          [auth.userId, note || "Payment approved", orderId]
        );
      } else {
        await db.query(
          `
          UPDATE orders
          SET
            state = 'cancelled',
            result = 'failed',
            reviewed_by = ?,
            reviewed_at = NOW(),
            review_note = ?
          WHERE id = ?
          `,
          [auth.userId, note || "Payment declined", orderId]
        );
      }
    }

    if (decision === "approve") {
      await db.query(
        `
        UPDATE video_course_purchases vcp
        SET
          vcp.status = 'pending'
        WHERE vcp.order_id = ?
        `,
        [orderId]
      );

      await db.query(
        `
        UPDATE video_subscriptions vsub
        SET
          vsub.status = 'pending'
        WHERE vsub.order_id = ?
        `,
        [orderId]
      );
    } else {
      await db.query(
        `
        UPDATE video_course_purchases
        SET status = 'cancelled'
        WHERE order_id = ?
        `,
        [orderId]
      );

      await db.query(
        `
        UPDATE video_subscriptions
        SET status = 'cancelled'
        WHERE order_id = ?
        `,
        [orderId]
      );
    }

    const [orderRows] = await db.query<RowDataPacket[]>(
      `SELECT id, order_number, state, result, payment_state, review_note, reviewed_at FROM orders WHERE id = ? LIMIT 1`,
      [orderId]
    );

    return Response.json({
      ok: true,
      paymentId,
      order: orderRows?.[0] ?? null,
    });
  } catch (err) {
    return Response.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

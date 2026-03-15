import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { reviewPaymentDecision } from "@/lib/payment-review";
import { sendTelegramPaymentDecisionNotification } from "@/lib/telegram";
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

    const reviewResult = await reviewPaymentDecision({
      paymentId,
      decision,
      note,
      actorId: auth.userId,
      actorLabel: `admin:${auth.userId}`,
    });

    if (reviewResult.orderContext) {
      try {
        await sendTelegramPaymentDecisionNotification({
          orderId: reviewResult.orderContext.orderId,
          orderNumber: reviewResult.orderContext.orderNumber,
          amount: reviewResult.orderContext.amount,
          buyerName: reviewResult.orderContext.buyerName,
          buyerEmail: reviewResult.orderContext.buyerEmail,
          bankName: reviewResult.orderContext.bankName,
          accountNumber: reviewResult.orderContext.accountNumber,
          paymentApv: reviewResult.orderContext.paymentApv,
          paidAt: reviewResult.orderContext.paidAt,
          itemSummary: reviewResult.orderContext.itemSummary,
          decision: decision === "approve" ? "approved" : "declined",
          decisionNote: note || (decision === "approve" ? "Payment approved" : "Payment declined"),
          decisionSource: `Admin dashboard user ${auth.userId}`,
        });
      } catch (telegramError) {
        console.error("Telegram payment review notification failed:", telegramError);
      }
    }

    const [orderRows] = await db.query<RowDataPacket[]>(
      `SELECT id, order_number, state, result, payment_state, review_note, reviewed_at FROM orders WHERE id = ? LIMIT 1`,
      [reviewResult.orderId]
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

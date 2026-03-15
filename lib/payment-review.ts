import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db } from "@/lib/db";

export type TelegramOrderContext = {
  orderId: number;
  orderNumber: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
  itemSummary: string[];
  paymentId: number | null;
  bankName: string;
  accountNumber: string;
  paymentApv: string;
  paidAt: string;
  state: string;
  result: string;
  paymentState: string;
};

type OrderContextRow = RowDataPacket & {
  id: number;
  order_number: string | null;
  total: number | string | null;
  created_at: string | Date | null;
  state: string | null;
  result: string | null;
  payment_state: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  payment_id_row: number | null;
  payment_method: string | null;
  account_id: string | null;
  payment_apv: string | null;
  paid_at: string | Date | null;
};

type ItemSummaryRow = RowDataPacket & {
  item_label: string;
};

type PaymentLookupRow = RowDataPacket & {
  id: number;
  order_id: number;
};

type ReviewPaymentDecisionInput = {
  paymentId: number;
  decision: "approve" | "decline";
  note?: string;
  actorId?: number | null;
  actorLabel?: string;
};

type ReviewPaymentDecisionResult = {
  paymentId: number;
  orderId: number;
  orderContext: TelegramOrderContext | null;
};

function normalizeDate(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString();
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function buildDecisionNote(input: ReviewPaymentDecisionInput): string {
  const fallback =
    input.decision === "approve" ? "Payment approved" : "Payment declined";

  if (input.note && input.note.trim()) {
    return input.note.trim();
  }

  if (input.actorLabel && input.actorLabel.trim()) {
    return `${fallback} via ${input.actorLabel.trim()}`;
  }

  return fallback;
}

export async function getOrderTelegramContext(
  orderId: number
): Promise<TelegramOrderContext | null> {
  let orderRows: OrderContextRow[] = [];
  try {
    const [rows] = await db.query<OrderContextRow[]>(
      `
      SELECT
        o.id,
        o.order_number,
        o.total,
        o.created_at,
        COALESCE(o.state, 'pending') AS state,
        COALESCE(o.result, 'none') AS result,
        COALESCE(o.payment_state, 'waiting') AS payment_state,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username, u.email, 'N/A') AS buyer_name,
        COALESCE(u.email, 'N/A') AS buyer_email,
        p.id AS payment_id_row,
        COALESCE(p.method, 'Waiting for payer') AS payment_method,
        COALESCE(p.account_id, 'Waiting for payer') AS account_id,
        COALESCE(p.payment_apv, 'N/A') AS payment_apv,
        p.paid_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN payments p ON p.id = (
        SELECT p2.id
        FROM payments p2
        WHERE p2.order_id = o.id
        ORDER BY p2.id DESC
        LIMIT 1
      )
      WHERE o.id = ?
      LIMIT 1
      `,
      [orderId]
    );
    orderRows = rows;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const missingOrderWorkflowColumns =
      message.includes("unknown column") &&
      (message.includes("payment_state") || message.includes("state") || message.includes("result"));
    if (!missingOrderWorkflowColumns) {
      throw error;
    }

    const [rows] = await db.query<OrderContextRow[]>(
      `
      SELECT
        o.id,
        o.order_number,
        o.total,
        o.created_at,
        'pending' AS state,
        'none' AS result,
        'waiting' AS payment_state,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username, u.email, 'N/A') AS buyer_name,
        COALESCE(u.email, 'N/A') AS buyer_email,
        p.id AS payment_id_row,
        COALESCE(p.method, 'Waiting for payer') AS payment_method,
        COALESCE(p.account_id, 'Waiting for payer') AS account_id,
        COALESCE(p.payment_apv, 'N/A') AS payment_apv,
        p.paid_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN payments p ON p.id = (
        SELECT p2.id
        FROM payments p2
        WHERE p2.order_id = o.id
        ORDER BY p2.id DESC
        LIMIT 1
      )
      WHERE o.id = ?
      LIMIT 1
      `,
      [orderId]
    );
    orderRows = rows;
  }

  const order = orderRows[0];
  if (!order) return null;

  let itemRows: ItemSummaryRow[] = [];
  try {
    const [rows] = await db.query<ItemSummaryRow[]>(
      `
      SELECT item_label
      FROM (
        SELECT CONCAT(p.title, ' x', oi.qty) AS item_label
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        UNION ALL
        SELECT CONCAT(vc.title, ' x1') AS item_label
        FROM video_course_purchases vcp
        JOIN video_courses vc ON vc.id = vcp.course_id
        WHERE vcp.order_id = ?
        UNION ALL
        SELECT CONCAT('Video subscription: ', vsp.name, ' x1') AS item_label
        FROM video_subscriptions vs
        JOIN video_subscription_plans vsp ON vsp.id = vs.plan_id
        WHERE vs.order_id = ?
      ) AS summary_rows
      `,
      [orderId, orderId, orderId]
    );
    itemRows = rows;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const missingSubscriptionTables =
      message.includes("doesn't exist") &&
      (message.includes("video_subscriptions") || message.includes("video_subscription_plans"));
    if (!missingSubscriptionTables) {
      throw error;
    }

    const [rows] = await db.query<ItemSummaryRow[]>(
      `
      SELECT item_label
      FROM (
        SELECT CONCAT(p.title, ' x', oi.qty) AS item_label
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        UNION ALL
        SELECT CONCAT(vc.title, ' x1') AS item_label
        FROM video_course_purchases vcp
        JOIN video_courses vc ON vc.id = vcp.course_id
        WHERE vcp.order_id = ?
      ) AS summary_rows
      `,
      [orderId, orderId]
    );
    itemRows = rows;
  }

  return {
    orderId: Number(order.id),
    orderNumber: String(order.order_number ?? `ORDER-${order.id}`),
    amount: toNumber(order.total),
    buyerName: String(order.buyer_name ?? "N/A"),
    buyerEmail: String(order.buyer_email ?? "N/A"),
    createdAt: normalizeDate(order.created_at),
    itemSummary: itemRows.map((row) => String(row.item_label)).filter(Boolean),
    paymentId: order.payment_id_row === null ? null : Number(order.payment_id_row),
    bankName: String(order.payment_method ?? "Waiting for payer"),
    accountNumber: String(order.account_id ?? "Waiting for payer"),
    paymentApv: String(order.payment_apv ?? "N/A"),
    paidAt: normalizeDate(order.paid_at ?? order.created_at),
    state: String(order.state ?? "pending"),
    result: String(order.result ?? "none"),
    paymentState: String(order.payment_state ?? "waiting"),
  };
}

export async function reviewPaymentDecision(
  input: ReviewPaymentDecisionInput
): Promise<ReviewPaymentDecisionResult> {
  const paymentId = Number(input.paymentId);
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    throw new Error("Invalid paymentId");
  }

  const decision = input.decision;
  if (decision !== "approve" && decision !== "decline") {
    throw new Error("Invalid decision");
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [paymentRows] = await conn.query<PaymentLookupRow[]>(
      `SELECT id, order_id FROM payments WHERE id = ? LIMIT 1 FOR UPDATE`,
      [paymentId]
    );
    if (paymentRows.length === 0) {
      throw new Error("Payment not found");
    }

    const orderId = Number(paymentRows[0].order_id ?? 0);
    if (!orderId) {
      throw new Error("Order not found for payment");
    }

    const note = buildDecisionNote(input);

    try {
      await conn.query<ResultSetHeader>(
        `
        UPDATE payments
        SET
          admin_decision = ?,
          decision_note = ?,
          decided_by = ?,
          decided_at = NOW()
        WHERE id = ?
        `,
        [decision === "approve" ? "approved" : "declined", note, input.actorId ?? null, paymentId]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const missingAdminDecision = message.includes("unknown column") && message.includes("admin_decision");
      const missingDecisionNote = message.includes("unknown column") && message.includes("decision_note");
      const missingDecidedBy = message.includes("unknown column") && message.includes("decided_by");
      const missingDecidedAt = message.includes("unknown column") && message.includes("decided_at");
      if (!(missingAdminDecision || missingDecisionNote || missingDecidedBy || missingDecidedAt)) {
        throw error;
      }
    }

    try {
      if (decision === "approve") {
        await conn.query<ResultSetHeader>(
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
          [note, input.actorId ?? null, input.actorId ?? null, note, orderId]
        );
      } else {
        await conn.query<ResultSetHeader>(
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
          [note, input.actorId ?? null, input.actorId ?? null, note, orderId]
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const missingPaymentState = message.includes("unknown column") && message.includes("payment_state");
      const missingPaymentReview = message.includes("unknown column") && (
        message.includes("payment_review_note") ||
        message.includes("payment_reviewed_by") ||
        message.includes("payment_reviewed_at")
      );
      if (!(missingPaymentState || missingPaymentReview)) {
        throw error;
      }

      if (decision === "approve") {
        await conn.query<ResultSetHeader>(
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
          [input.actorId ?? null, note, orderId]
        );
      } else {
        await conn.query<ResultSetHeader>(
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
          [input.actorId ?? null, note, orderId]
        );
      }
    }

    if (decision === "approve") {
      await conn.query<ResultSetHeader>(
        `
        UPDATE video_course_purchases
        SET status = 'pending'
        WHERE order_id = ?
        `,
        [orderId]
      );

      await conn.query<ResultSetHeader>(
        `
        UPDATE video_subscriptions
        SET status = 'pending'
        WHERE order_id = ?
        `,
        [orderId]
      );
    } else {
      await conn.query<ResultSetHeader>(
        `
        UPDATE video_course_purchases
        SET status = 'cancelled'
        WHERE order_id = ?
        `,
        [orderId]
      );

      await conn.query<ResultSetHeader>(
        `
        UPDATE video_subscriptions
        SET status = 'cancelled'
        WHERE order_id = ?
        `,
        [orderId]
      );
    }

    await conn.commit();

    return {
      paymentId,
      orderId,
      orderContext: await getOrderTelegramContext(orderId),
    };
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    conn.release();
  }
}

import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db } from "@/lib/db";
import { getOrderTelegramContext } from "@/lib/payment-review";
import { sendTelegramPaymentDecisionNotification } from "@/lib/telegram";

type PaywayWebhookBody = Partial<{
  trx_id: unknown;
  amount: unknown;
  currency: unknown;
  remark: unknown;
  apv: unknown;
  buyer_name: unknown;
  sender_account: unknown;
  paid_at: unknown;
  raw_text: unknown;
}>;

type OrderRow = RowDataPacket & {
  id: number;
  user_id: number;
  order_number: string;
  total: number | string;
  state: string | null;
  payment_state: string | null;
  created_at?: string | Date | null;
};

type PaymentRow = RowDataPacket & {
  id: number;
  order_id: number;
};

type QueryExecutor = {
  query<T extends RowDataPacket[] | ResultSetHeader>(
    sql: string,
    values?: unknown[]
  ): Promise<[T, unknown]>;
};

function asTrimmedString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeRemark(value: string): string {
  return value.replace(/[.\s]+$/g, "").trim();
}

function parseAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function normalizeCurrency(value: unknown): "USD" | "KHR" | "" {
  const text = asTrimmedString(value).toUpperCase();
  if (text === "USD" || text === "KHR") return text;
  return "";
}

function toMysqlDatetime(value: unknown): string {
  const text = asTrimmedString(value);
  if (!text) {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function matchesOrderAmount(orderTotal: number, amount: number, currency: "USD" | "KHR" | ""): boolean {
  if (!Number.isFinite(orderTotal) || orderTotal <= 0 || !Number.isFinite(amount) || amount <= 0) {
    return false;
  }

  if (currency === "KHR") {
    const khrTotal = Math.round(orderTotal * 4000);
    return Math.abs(khrTotal - amount) <= 1;
  }

  return Math.abs(orderTotal - amount) <= 0.01;
}

let ensureWebhookLogsTablePromise: Promise<void> | null = null;

async function ensurePaywayWebhookLogsTable(): Promise<void> {
  if (!ensureWebhookLogsTablePromise) {
    ensureWebhookLogsTablePromise = db
      .query(`
        CREATE TABLE IF NOT EXISTS payway_webhook_logs (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          trx_id VARCHAR(120) NOT NULL,
          order_number VARCHAR(120) NULL,
          order_id BIGINT UNSIGNED NULL,
          amount DECIMAL(12,2) NULL,
          currency VARCHAR(10) NULL,
          apv VARCHAR(120) NULL,
          buyer_name VARCHAR(190) NULL,
          sender_account VARCHAR(190) NULL,
          processing_status VARCHAR(50) NOT NULL,
          response_message VARCHAR(255) NULL,
          raw_text TEXT NOT NULL,
          payload_json LONGTEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_payway_log_trx (trx_id),
          INDEX idx_payway_log_order_number (order_number),
          INDEX idx_payway_log_status (processing_status),
          INDEX idx_payway_log_order_id (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
      .then(() => undefined);
  }

  await ensureWebhookLogsTablePromise;
}

async function insertPaywayWebhookLog(
  executor: QueryExecutor,
  input: {
    trxId: string;
    orderNumber: string | null;
    orderId?: number | null;
    amount: number | null;
    currency: string;
    apv: string;
    buyerName: string;
    senderAccount: string;
    processingStatus: string;
    responseMessage: string;
    rawText: string;
    payload: PaywayWebhookBody;
  }
): Promise<void> {
  await executor.query<ResultSetHeader>(
    `
    INSERT INTO payway_webhook_logs (
      trx_id,
      order_number,
      order_id,
      amount,
      currency,
      apv,
      buyer_name,
      sender_account,
      processing_status,
      response_message,
      raw_text,
      payload_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.trxId,
      input.orderNumber,
      input.orderId ?? null,
      input.amount,
      input.currency || null,
      input.apv || null,
      input.buyerName || null,
      input.senderAccount || null,
      input.processingStatus,
      input.responseMessage,
      input.rawText,
      JSON.stringify(input.payload),
    ]
  );
}

export async function POST(req: Request): Promise<Response> {
  const expectedSecret = process.env.PAYWAY_WEBHOOK_SECRET?.trim() || "";
  const incomingSecret = req.headers.get("x-payway-secret")?.trim() || "";

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as PaywayWebhookBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await ensurePaywayWebhookLogsTable();

  const trxId = asTrimmedString(body.trx_id);
  const rawText = asTrimmedString(body.raw_text);
  const remark = normalizeRemark(asTrimmedString(body.remark));
  const apv = asTrimmedString(body.apv) || trxId;
  const buyerName = asTrimmedString(body.buyer_name) || "ABA Transfer";
  const senderAccount = asTrimmedString(body.sender_account) || "ABA";
  const currency = normalizeCurrency(body.currency);
  const amount = parseAmount(body.amount);
  const paidAt = toMysqlDatetime(body.paid_at);

  if (!trxId || !rawText || amount === null) {
    await insertPaywayWebhookLog(db, {
      trxId: trxId || "unknown",
      orderNumber: remark || null,
      amount,
      currency,
      apv,
      buyerName,
      senderAccount,
      processingStatus: "invalid_payload",
      responseMessage: "trx_id, amount, and raw_text are required",
      rawText: rawText || JSON.stringify(body),
      payload: body,
    });

    return NextResponse.json(
      { error: "trx_id, amount, and raw_text are required" },
      { status: 400 }
    );
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [dupRows] = await conn.query<PaymentRow[]>(
      `SELECT id, order_id FROM payments WHERE payment_id = ? LIMIT 1 FOR UPDATE`,
      [trxId]
    );
    if (dupRows.length > 0) {
      await insertPaywayWebhookLog(conn, {
        trxId,
        orderNumber: remark,
        orderId: Number(dupRows[0].order_id),
        amount,
        currency,
        apv,
        buyerName,
        senderAccount,
        processingStatus: "duplicate",
        responseMessage: "Transaction already processed",
        rawText,
        payload: body,
      });
      await conn.commit();
      return NextResponse.json({
        success: true,
        message: "Transaction already processed",
        orderId: Number(dupRows[0].order_id),
        duplicate: true,
      });
    }

    let order: OrderRow | null = null;

    if (remark) {
      const [orderRows] = await conn.query<OrderRow[]>(
        `
        SELECT id, user_id, order_number, total, state, payment_state, created_at
        FROM orders
        WHERE order_number = ?
        LIMIT 1
        FOR UPDATE
        `,
        [remark]
      );
      order = orderRows[0] ?? null;
    }

    if (!order && !remark) {
      await insertPaywayWebhookLog(conn, {
        trxId,
        orderNumber: null,
        amount,
        currency,
        apv,
        buyerName,
        senderAccount,
        processingStatus: "missing_reference",
        responseMessage: "Payment reference remark is required for automatic approval",
        rawText,
        payload: body,
      });
      await conn.rollback();
      return NextResponse.json(
        { error: "Payment reference remark is required for automatic approval" },
        { status: 409 }
      );
    }

    if (!order) {
      await insertPaywayWebhookLog(conn, {
        trxId,
        orderNumber: remark || null,
        amount,
        currency,
        apv,
        buyerName,
        senderAccount,
        processingStatus: remark ? "order_not_found" : "no_recent_amount_match",
        responseMessage: remark
          ? "Order not found for remark"
          : "No recent pending order matched the payment amount",
        rawText,
        payload: body,
      });
      await conn.rollback();
      return NextResponse.json(
        { error: remark ? "Order not found for remark" : "No recent pending order matched the payment amount" },
        { status: 404 }
      );
    }
    const orderId = Number(order.id);
    const userId = Number(order.user_id);
    const orderTotal = Number(order.total ?? 0);

    if (!matchesOrderAmount(orderTotal, amount, currency)) {
      await insertPaywayWebhookLog(conn, {
        trxId,
        orderNumber: order.order_number,
        orderId,
        amount,
        currency,
        apv,
        buyerName,
        senderAccount,
        processingStatus: "amount_mismatch",
        responseMessage: "Amount does not match the target order total",
        rawText,
        payload: body,
      });
      await conn.rollback();
      return NextResponse.json(
        { error: "Amount does not match the target order total" },
        { status: 409 }
      );
    }

    const [orderPaymentRows] = await conn.query<PaymentRow[]>(
      `SELECT id, order_id FROM payments WHERE order_id = ? LIMIT 1 FOR UPDATE`,
      [orderId]
    );

    if (orderPaymentRows.length > 0) {
      await conn.query<ResultSetHeader>(
        `
        UPDATE payments
        SET
          account_id = ?,
          payment_id = ?,
          payment_apv = ?,
          paid_at = ?,
          method = 'ABA Bank',
          admin_decision = 'approved',
          decision_note = ?,
          decided_by = NULL,
          decided_at = NOW()
        WHERE id = ?
        `,
        [
          buyerName || senderAccount,
          trxId,
          apv,
          paidAt,
          `Auto confirmed from Telegram webhook (${trxId})`,
          Number(orderPaymentRows[0].id),
        ]
      );
    } else {
      await conn.query<ResultSetHeader>(
        `
        INSERT INTO payments (
          order_id,
          user_id,
          account_id,
          payment_id,
          payment_apv,
          paid_at,
          method,
          admin_decision,
          decision_note,
          decided_by,
          decided_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'ABA Bank', 'approved', ?, NULL, NOW())
        `,
        [
          orderId,
          userId,
          buyerName || senderAccount,
          trxId,
          apv,
          paidAt,
          `Auto confirmed from Telegram webhook (${trxId})`,
        ]
      );
    }

    await conn.query<ResultSetHeader>(
      `
      UPDATE orders
      SET
        payment_state = 'approved',
        payment_review_note = ?,
        payment_reviewed_by = NULL,
        payment_reviewed_at = NOW(),
        state = 'approved',
        result = 'none',
        review_note = ?,
        reviewed_by = NULL,
        reviewed_at = NOW()
      WHERE id = ?
      `,
      [
        `Auto confirmed from Telegram webhook (${trxId})`,
        `Auto confirmed from Telegram webhook (${trxId})`,
        orderId,
      ]
    );

    await insertPaywayWebhookLog(conn, {
      trxId,
      orderNumber: order.order_number,
      orderId,
      amount,
      currency,
      apv,
      buyerName,
      senderAccount,
      processingStatus: "confirmed",
      responseMessage:
        "Payment auto-confirmed",
      rawText,
      payload: body,
    });

    await conn.commit();

    try {
      const orderContext = await getOrderTelegramContext(orderId);
      if (orderContext) {
        await sendTelegramPaymentDecisionNotification({
          orderId: orderContext.orderId,
          orderNumber: orderContext.orderNumber,
          amount: orderContext.amount,
          buyerName: buyerName || orderContext.buyerName,
          buyerEmail: orderContext.buyerEmail,
          bankName: "ABA Bank",
          accountNumber: senderAccount || orderContext.accountNumber,
          paymentApv: apv || orderContext.paymentApv,
          paidAt,
          itemSummary: orderContext.itemSummary,
          decision: "approved",
          decisionNote: `Auto approved by PayWay webhook (${trxId})`,
          decisionSource: "PayWay webhook",
        });
      }
    } catch (telegramError) {
      console.error("Telegram PayWay auto-confirm notification failed:", telegramError);
    }

    return NextResponse.json({
      success: true,
      message: "Payment auto-confirmed",
      orderId,
      orderNumber: order.order_number,
      trxId,
      matchedBy: "remark",
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback errors
    }

    const message = error instanceof Error ? error.message : "Webhook processing failed";
    try {
      await insertPaywayWebhookLog(db, {
        trxId: trxId || "unknown",
        orderNumber: remark || null,
        amount,
        currency,
        apv,
        buyerName,
        senderAccount,
        processingStatus: "error",
        responseMessage: message,
        rawText: rawText || JSON.stringify(body),
        payload: body,
      });
    } catch {
      // ignore audit log failures
    }

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    conn.release();
  }
}

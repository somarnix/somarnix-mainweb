import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db } from "@/lib/db";
import { getOrderTelegramContext } from "@/lib/payment-review";
import { sendTelegramPaymentSubmittedNotification } from "@/lib/telegram";

export const ALLOWED_PAYMENT_METHODS = [
  "manual",
  "ABA Bank",
  "ACLEDA Bank",
  "Wing Bank",
  "Canadia Bank",
  "Other",
] as const;

type OrderStatus =
  | "pending"
  | "waiting_admin"
  | "approved"
  | "delivered"
  | "done"
  | "cancelled";

type OrderRowLegacy = RowDataPacket & {
  id: number;
  status: OrderStatus;
};

type OrderRowState = RowDataPacket & {
  id: number;
  state: string;
  result?: string | null;
};

type SubmitOrderPaymentInput = {
  orderId: number;
  userId: number;
  accountName: string;
  accountNumber: string;
  paymentApv: string;
  method: (typeof ALLOWED_PAYMENT_METHODS)[number];
  paidAt: string;
};

type SubmitOrderPaymentResult = {
  success: true;
  message: string;
  orderId: number;
  duplicate?: boolean;
  state: string;
  result?: string;
};

function toMysqlDatetime(input: string): string | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export async function submitOrderPayment(
  input: SubmitOrderPaymentInput
): Promise<SubmitOrderPaymentResult> {
  const mysqlPaidAt = toMysqlDatetime(input.paidAt.trim());
  if (!mysqlPaidAt) {
    throw new Error("paidAt invalid (must be a valid date/time)");
  }

  let useLegacyStatus = false;
  let orderStateRow: OrderRowState | null = null;
  try {
    const [rows] = await db.query<OrderRowState[]>(
      `
      SELECT
        o.id,
        o.state,
        o.result
      FROM orders o
      WHERE o.id=? AND o.user_id=?
      LIMIT 1
      `,
      [input.orderId, input.userId]
    );
    orderStateRow = rows.length ? rows[0] : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unknown column 'state'") || message.includes("Unknown column 'result'")) {
      useLegacyStatus = true;
    } else {
      throw err;
    }
  }

  let orderLegacyRow: OrderRowLegacy | null = null;
  if (useLegacyStatus) {
    const [rows] = await db.query<OrderRowLegacy[]>(
      "SELECT id, status FROM orders WHERE id=? AND user_id=? LIMIT 1",
      [input.orderId, input.userId]
    );
    orderLegacyRow = rows.length ? rows[0] : null;
  }

  const orderExists = useLegacyStatus ? orderLegacyRow !== null : orderStateRow !== null;
  if (!orderExists) {
    throw new Error("Order not found");
  }

  const currentState = useLegacyStatus
    ? (orderLegacyRow!.status ?? "").toString()
    : (orderStateRow!.state ?? "").toString();

  if (currentState !== "pending") {
    throw new Error("Order not pending");
  }

  const [existPay] = await db.query<RowDataPacket[]>(
    "SELECT id FROM payments WHERE order_id=? AND user_id=? LIMIT 1",
    [input.orderId, input.userId]
  );
  if (existPay.length > 0) {
    return {
      success: true,
      message: "Payment already recorded for this order",
      orderId: input.orderId,
      duplicate: true,
      state: useLegacyStatus ? "waiting_admin" : "pending",
      result: useLegacyStatus ? undefined : "none",
    };
  }

  const [insertResult] = await db.query<ResultSetHeader>(
    `
    INSERT INTO payments (order_id, user_id, account_id, payment_id, payment_apv, paid_at, method)
    VALUES (?,?,?,?,?,?,?)
    `,
    [
      input.orderId,
      input.userId,
      input.accountName.trim(),
      input.accountNumber.trim(),
      input.paymentApv.trim(),
      mysqlPaidAt,
      input.method,
    ]
  );
  const paymentId = Number(insertResult.insertId ?? 0);

  const updateParts: string[] = [];
  const updateValues: Array<string | number> = [];

  if (useLegacyStatus) {
    updateParts.push("status = ?");
    updateValues.push("waiting_admin");
  } else {
    updateParts.push("state = ?");
    updateValues.push("pending");
    updateParts.push("result = ?");
    updateValues.push("none");
  }

  updateValues.push(input.orderId, input.userId);
  await db.query<ResultSetHeader>(
    `UPDATE orders SET ${updateParts.join(", ")} WHERE id=? AND user_id=?`,
    updateValues
  );

  try {
    await db.query<ResultSetHeader>(
      `UPDATE orders SET payment_state = 'waiting' WHERE id=? AND user_id=?`,
      [input.orderId, input.userId]
    );
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (!message.includes("unknown column") || !message.includes("payment_state")) {
      throw err;
    }
  }

  try {
    const orderContext = await getOrderTelegramContext(input.orderId);
    if (orderContext) {
      await sendTelegramPaymentSubmittedNotification({
        paymentId: paymentId || orderContext.paymentId || 0,
        orderId: input.orderId,
        orderNumber: orderContext.orderNumber,
        amount: orderContext.amount,
        buyerName: orderContext.buyerName,
        buyerEmail: orderContext.buyerEmail,
        bankName: input.method,
        accountNumber: input.accountNumber.trim(),
        paymentApv: input.paymentApv.trim(),
        paidAt: mysqlPaidAt,
        itemSummary: orderContext.itemSummary,
      });
    }
  } catch (telegramError) {
    console.error("Telegram payment notification failed:", telegramError);
  }

  return {
    success: true,
    message: "Payment submitted. Waiting admin review.",
    orderId: input.orderId,
    state: useLegacyStatus ? "waiting_admin" : "pending",
    result: useLegacyStatus ? undefined : "none",
  };
}

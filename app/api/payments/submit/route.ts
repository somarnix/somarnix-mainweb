import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

const ALLOWED_METHODS = [
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

function toMysqlDatetime(input: string): string | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    const oid = Number(b.orderId);
    const accountName = b.accountName;
    const accountNumber = b.accountNumber;
    const paymentApv = b.paymentApv;
    const method = b.method;
    const paidAt = b.paidAt;

    if (
      !Number.isFinite(oid) ||
      oid <= 0 ||
      typeof accountName !== "string" ||
      accountName.trim() === "" ||
      typeof accountNumber !== "string" ||
      accountNumber.trim() === "" ||
      typeof paymentApv !== "string" ||
      paymentApv.trim() === "" ||
      typeof method !== "string" ||
      !ALLOWED_METHODS.includes(method as (typeof ALLOWED_METHODS)[number]) ||
      typeof paidAt !== "string" ||
      paidAt.trim() === ""
    ) {
      return Response.json(
        {
          error:
            "orderId, accountName, accountNumber, paymentApv, method (valid option), paidAt required",
        },
        { status: 400 }
      );
    }

    const mysqlPaidAt = toMysqlDatetime(paidAt.trim());
    if (!mysqlPaidAt) {
      return Response.json(
        { error: "paidAt invalid (must be a valid date/time)" },
        { status: 400 }
      );
    }

    // Ensure order belongs to user
    let useLegacyStatus = false;
    let orderStateRow: OrderRowState | null = null;
    try {
      const [rows] = await db.query<OrderRowState[]>(
        "SELECT id, state, result FROM orders WHERE id=? AND user_id=? LIMIT 1",
        [oid, auth.userId]
      );
      orderStateRow = rows.length ? rows[0] : null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("Unknown column 'state'") ||
        message.includes("Unknown column 'result'")
      ) {
        useLegacyStatus = true;
      } else {
        throw err;
      }
    }

    let orderLegacyRow: OrderRowLegacy | null = null;
    if (useLegacyStatus) {
      const [rows] = await db.query<OrderRowLegacy[]>(
        "SELECT id, status FROM orders WHERE id=? AND user_id=? LIMIT 1",
        [oid, auth.userId]
      );
      orderLegacyRow = rows.length ? rows[0] : null;
    }

    const orderExists = useLegacyStatus ? orderLegacyRow !== null : orderStateRow !== null;
    if (!orderExists) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const currentState = useLegacyStatus
      ? (orderLegacyRow!.status ?? "").toString()
      : (orderStateRow!.state ?? "").toString();

    if (currentState !== "pending") {
      return Response.json({ error: "Order not pending" }, { status: 400 });
    }

    // Prevent duplicate payment submissions for same order
    const [existPay] = await db.query<RowDataPacket[]>(
      "SELECT id FROM payments WHERE order_id=? AND user_id=? LIMIT 1",
      [oid, auth.userId]
    );
    if (existPay.length > 0) {
      return Response.json(
        { error: "Payment already submitted for this order" },
        { status: 400 }
      );
    }

    await db.query<ResultSetHeader>(
      `
      INSERT INTO payments (order_id, user_id, account_id, payment_id, payment_apv, paid_at, method)
      VALUES (?,?,?,?,?,?,?)
      `,
      [
        oid,
        auth.userId,
        accountName.trim(),
        accountNumber.trim(),
        paymentApv.trim(),
        mysqlPaidAt,
        method,
      ]
    );

    // Update order state/result to reflect submission
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

    if (updateParts.length > 0) {
      updateValues.push(oid, auth.userId);
      await db.query<ResultSetHeader>(
        `UPDATE orders SET ${updateParts.join(", ")} WHERE id=? AND user_id=?`,
        updateValues
      );
    }

    // Keep payment workflow state separately when the column exists.
    try {
      await db.query<ResultSetHeader>(
        `UPDATE orders SET payment_state = 'waiting' WHERE id=? AND user_id=?`,
        [oid, auth.userId]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      if (!message.includes("unknown column") || !message.includes("payment_state")) {
        throw err;
      }
    }

    return Response.json({
      success: true,
      message: "Payment submitted. Waiting admin review.",
      orderId: oid,
      state: useLegacyStatus ? "waiting_admin" : "pending",
      result: useLegacyStatus ? undefined : "none",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}

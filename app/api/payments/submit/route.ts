import { getAuthUser } from "@/lib/auth";
import { syncExpiredUnconfirmedOrders } from "@/lib/order-expiry";
import { ALLOWED_PAYMENT_METHODS, submitOrderPayment } from "@/lib/payment-submission";

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

    await syncExpiredUnconfirmedOrders();

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
      !ALLOWED_PAYMENT_METHODS.includes(method as (typeof ALLOWED_PAYMENT_METHODS)[number]) ||
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

    const result = await submitOrderPayment({
      orderId: oid,
      userId: auth.userId,
      accountName,
      accountNumber,
      paymentApv,
      method: method as (typeof ALLOWED_PAYMENT_METHODS)[number],
      paidAt,
    });

    return Response.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message === "Order not found" ||
      message === "Order not pending" ||
      message.startsWith("paidAt invalid")
    ) {
      return Response.json({ error: message }, { status: 400 });
    }
    return Response.json({ error: "Server error", detail: message }, { status: 500 });
  }
}

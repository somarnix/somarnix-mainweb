import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getOrderNotificationsForUser,
  markAllOrderNotificationsRead,
  markOrderNotificationRead,
  type OrderNotificationScope,
} from "@/lib/order-notifications";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getOrderNotificationsForUser(auth.userId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await req.json().catch(() => ({}));
    const body =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

    const rawScope = body.scope;
    const scope: OrderNotificationScope | null =
      rawScope === "cancelled" || rawScope === "purchase" || rawScope === "sold"
        ? rawScope
        : null;

    if (body.markAll === true) {
      await markAllOrderNotificationsRead(auth.userId, scope ?? undefined);
      const result = await getOrderNotificationsForUser(auth.userId);
      return NextResponse.json({ success: true, ...result });
    }

    const orderId = Number(body.orderId);
    if (!Number.isFinite(orderId) || orderId <= 0 || !scope) {
      return NextResponse.json(
        { error: "Invalid order notification payload" },
        { status: 400 }
      );
    }

    await markOrderNotificationRead(auth.userId, orderId, scope);
    const result = await getOrderNotificationsForUser(auth.userId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}

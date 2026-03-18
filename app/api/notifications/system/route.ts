import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  getSystemNotificationsForUser,
  markAllSystemNotificationsRead,
  markSystemNotificationRead,
} from "@/lib/system-notifications";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getSystemNotificationsForUser(auth.userId, 20);
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

    if (body.markAll === true) {
      await markAllSystemNotificationsRead(auth.userId);
      const result = await getSystemNotificationsForUser(auth.userId, 20);
      return NextResponse.json({ success: true, ...result });
    }

    const notificationId = Number(body.notificationId);
    if (!Number.isFinite(notificationId) || notificationId <= 0) {
      return NextResponse.json(
        { error: "Invalid notification id" },
        { status: 400 }
      );
    }

    const ok = await markSystemNotificationRead(auth.userId, notificationId);
    if (!ok) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const result = await getSystemNotificationsForUser(auth.userId, 20);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { setUserPresenceStatus } from "@/lib/presence";

type PresencePayload = {
  status?: "online" | "offline";
};

async function resolveStatus(req: NextRequest): Promise<"online" | "offline"> {
  let payload: PresencePayload | null = null;
  try {
    payload = await req.json();
  } catch {
    // ignore body parse errors
  }
  return payload?.status === "offline" ? "offline" : "online";
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await resolveStatus(req);
  await setUserPresenceStatus(auth.userId, status);
  return NextResponse.json({ success: true, status });
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await setUserPresenceStatus(auth.userId, "offline");
  return NextResponse.json({ success: true, status: "offline" });
}

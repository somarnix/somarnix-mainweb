import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { isOnline } from "@/lib/presence";

type PresenceRow = RowDataPacket & {
  user_id: number;
  status: "online" | "offline" | null;
  last_active_at: string | Date | null;
};

async function hasColumn(tableName: string, columnName: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );

  return rows.length > 0;
}

export async function GET(req: NextRequest) {
  try {
    const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
    const ids = Array.from(
      new Set(
        idsParam
          .split(",")
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    ).slice(0, 50);

    if (ids.length === 0) {
      return NextResponse.json({ users: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const hasStatus = await hasColumn("user_presence", "status");
    const hasLastActiveAt = await hasColumn("user_presence", "last_active_at");
    if (!hasStatus && !hasLastActiveAt) {
      return NextResponse.json(
        {
          users: ids.map((id) => ({
            userId: id,
            status: "offline",
            lastActiveAt: null,
            online: false,
          })),
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const statusSelect = hasStatus ? "status" : "NULL AS status";
    const lastActiveSelect = hasLastActiveAt ? "last_active_at" : "NULL AS last_active_at";
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await db.query<PresenceRow[]>(
      `
      SELECT user_id, ${statusSelect}, ${lastActiveSelect}
      FROM user_presence
      WHERE user_id IN (${placeholders})
      `,
      ids
    );

    const byId = new Map<number, PresenceRow>();
    for (const row of rows) {
      byId.set(Number(row.user_id), row);
    }

    return NextResponse.json(
      {
        users: ids.map((id) => {
          const row = byId.get(id) ?? null;
          const lastActiveAt =
            row?.last_active_at instanceof Date
              ? row.last_active_at.toISOString()
              : row?.last_active_at ?? null;
          return {
            userId: id,
            status: row?.status ?? "offline",
            lastActiveAt,
            online: isOnline(
              row
                ? {
                    user_id: id,
                    status: row.status ?? "offline",
                    last_active_at: row.last_active_at,
                  }
                : null
            ),
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load presence", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

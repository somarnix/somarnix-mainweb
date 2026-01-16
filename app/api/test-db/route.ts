import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface TestRow extends RowDataPacket {
  test: number;
}

export async function GET(): Promise<Response> {
  const [rows] = await db.query<TestRow[]>("SELECT 1 AS test");
  return Response.json(rows[0]);
}

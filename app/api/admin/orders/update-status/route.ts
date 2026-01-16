// import { db } from "@/lib/db";
// import { getAuthUser } from "@/lib/auth";
// import type { ResultSetHeader } from "mysql2";

// const ALLOWED = [
//   "pending",
//   "waiting_admin",
//   "approved",
//   "delivered",
//   "done",
//   "cancelled",
// ] as const;

// type OrderStatus = typeof ALLOWED[number];

// export async function POST(req: Request) {
//   try {
//     const auth = await getAuthUser(req);
//     if (!auth || auth.role !== "admin") {
//       return Response.json({ error: "Forbidden" }, { status: 403 });
//     }

//     const body = (await req.json()) as {
//       orderId?: number;
//       status?: OrderStatus;
//       note?: string;
//     };

//     if (
//       !body.orderId ||
//       !body.status ||
//       !ALLOWED.includes(body.status)
//     ) {
//       return Response.json({ error: "Invalid input" }, { status: 400 });
//     }

//     const note =
//       typeof body.note === "string" && body.note.trim()
//         ? body.note.trim()
//         : null;

//     const [result] = await db.query<ResultSetHeader>(
//       `
//       UPDATE orders
//       SET status=?, reviewed_by=?, reviewed_at=NOW(), review_note=?
//       WHERE id=?
//       `,
//       [body.status, auth.userId, note, body.orderId]
//     );

//     if (result.affectedRows === 0) {
//       return Response.json({ error: "Order not found" }, { status: 404 });
//     }

//     return Response.json({ success: true });
//   } catch (err: unknown) {
//     return Response.json(
//       { error: "Server error", detail: String(err) },
//       { status: 500 }
//     );
//   }
// }

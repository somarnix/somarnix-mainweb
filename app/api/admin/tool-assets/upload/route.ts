import fs from "fs/promises";
import path from "path";

import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function GET() {
  return Response.json({ ok: true, hint: "Use POST with form-data: file" });
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name || "").toLowerCase() || "";
  const filename = `${Date.now()}_${safeName(file.name || "tool-file")}`;
  const finalName = ext && filename.endsWith(ext) ? filename : `${filename}${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "tool-assets");
  await fs.mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, finalName);
  await fs.writeFile(filepath, buffer);

  return Response.json({
    success: true,
    url: `/tool-assets/${finalName}`,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
  });
}


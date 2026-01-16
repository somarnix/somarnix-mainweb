// app/api/admin/products/upload/route.ts
import { getAuthUser } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs"; // allow fs
export const dynamic = "force-dynamic";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// ✅ so browser won't show 405 (GET is normal when you open URL)
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

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Only images allowed" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name || "").toLowerCase() || ".png";
  const filename = `${Date.now()}_${safeName(file.name || "image")}`;
  const finalName = filename.endsWith(ext) ? filename : filename + ext;

  const uploadDir = path.join(process.cwd(), "public", "productimg");
  await fs.mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, finalName);
  await fs.writeFile(filepath, buffer);

  const url = `/productimg/${finalName}`;

  return Response.json({ success: true, url });
}

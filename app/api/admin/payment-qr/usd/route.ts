// app/api/admin/payment-qr/usd/route.ts
import { getAuthUser } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USD_DIR = path.join(process.cwd(), "public", "paymentQR", "USD");

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_$-]/g, "_").trim();
  return cleaned || `qr_${Date.now()}`;
}

async function ensureUsdDir() {
  await fs.mkdir(USD_DIR, { recursive: true });
}

export async function GET(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureUsdDir();

  const entries = await fs.readdir(USD_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => ({
      filename,
      label: path.parse(filename).name,
      url: `/paymentQR/USD/${filename}`,
    }));

  return Response.json({ files });
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const customName = form.get("name");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const baseName =
    typeof customName === "string" && customName.trim()
      ? customName.trim()
      : file.name?.split(".")?.[0] ?? "";

  const safeBase = sanitizeName(baseName);
  const ext = path.extname(file.name || "").toLowerCase() || ".png";
  const finalName = `${safeBase}${ext}`;

  await ensureUsdDir();

  const bytes = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(USD_DIR, finalName);

  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    const code = typeof err === "object" && err && "code" in err ? (err as { code?: string }).code : null;
    if (code !== "ENOENT") {
      throw err;
    }
  }

  await fs.writeFile(filePath, bytes);

  const url = `/paymentQR/USD/${finalName}`;

  return Response.json({
    success: true,
    filename: finalName,
    label: safeBase,
    url,
  });
}

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type StickerPack = {
  id: string;
  label: string;
  cover?: string | null;
  stickers: string[];
};

function titleCase(input: string): string {
  return input
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function loadStickerPacks(): StickerPack[] {
  const baseDir = path.join(process.cwd(), "public", "sticker");
  if (!fs.existsSync(baseDir)) return [];

  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((dir) => {
      const packDir = path.join(baseDir, dir.name);
      const stickers = fs
        .readdirSync(packDir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((file) => `/sticker/${dir.name}/${file.name}`)
        .sort();

      return {
        id: dir.name,
        label: titleCase(dir.name),
        cover: stickers[0] ?? null,
        stickers,
      };
    })
    .filter((pack) => pack.stickers.length > 0);
}

export async function GET() {
  try {
    const packs = loadStickerPacks();
    return NextResponse.json({ packs });
  } catch (err) {
    console.error("stickers GET error", err);
    return NextResponse.json({ packs: [] });
  }
}

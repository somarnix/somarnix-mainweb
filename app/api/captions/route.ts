import { NextResponse } from "next/server";

type CaptionTrack = {
  languageCode: string;
  languageName: string;
  name?: string;
  kind?: string;
};

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseTrackList(xml: string): CaptionTrack[] {
  const tracks: CaptionTrack[] = [];
  const trackRegex = /<track\s+([^>]+?)\s*(?:\/>|>)/g;
  let match: RegExpExecArray | null;
  while ((match = trackRegex.exec(xml))) {
    const attrs = match[1];
    const attrRegex = /(\w+)="([^"]*)"/g;
    const record: Record<string, string> = {};
    let attr: RegExpExecArray | null;
    while ((attr = attrRegex.exec(attrs))) {
      record[attr[1]] = attr[2];
    }
    if (record.lang_code) {
      tracks.push({
        languageCode: record.lang_code,
        languageName: decodeXml(record.lang_translated || record.lang_original || record.lang_code),
        name: decodeXml(record.name || ""),
        kind: record.kind || "",
      });
    }
  }
  return tracks;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const lang = searchParams.get("lang");
  const list = searchParams.get("list");

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  const baseUrl = "https://video.google.com/timedtext";

  if (list) {
    const res = await fetch(`${baseUrl}?type=list&v=${encodeURIComponent(videoId)}`);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to load caption list" },
        { status: res.status }
      );
    }
    const xml = await res.text();
    const tracks = parseTrackList(xml);
    return NextResponse.json({ tracks });
  }

  if (!lang) {
    return NextResponse.json({ error: "Missing lang" }, { status: 400 });
  }

  const res = await fetch(
    `${baseUrl}?lang=${encodeURIComponent(lang)}&v=${encodeURIComponent(videoId)}`
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to load captions" },
      { status: res.status }
    );
  }
  const xml = await res.text();
  return NextResponse.json({ xml });
}

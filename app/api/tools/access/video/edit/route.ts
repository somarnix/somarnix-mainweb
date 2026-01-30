import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

export const runtime = "nodejs"; // IMPORTANT

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(String(code)))));
  });
}

function runCapture(cmd: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(err))));
  });
}

function sanitizeBaseName(value: string, fallback: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9-_]+/g, "").trim();
  return cleaned || fallback;
}

function parseDuration(value: string) {
  const parts = value.split(":").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return 0;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return 0;
  if (parts.length === 1) return nums[0];
  if (parts.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

async function getVideoDuration(inputPath: string) {
  const output = await runCapture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ]);
  const seconds = Number(String(output).trim());
  return Number.isFinite(seconds) ? seconds : 0;
}

export async function POST(req: Request) {
  const form = await req.formData();

  const action = String(form.get("action") || "compress");
  const start = String(form.get("start") || "0");
  const end = String(form.get("end") || "0");
  const format = String(form.get("format") || "mp4");
  const watermarkText = String(form.get("watermark") || "");
  const splitDuration = String(form.get("splitDuration") || "");
  const baseName = sanitizeBaseName(String(form.get("baseName") || ""), "output");
  const watermarkPosition = String(form.get("watermarkPosition") || "top-right");
  const watermarkSize = Number(form.get("watermarkSize") || 0.1);
  const frameRate = String(form.get("frameRate") || "30fps");
  const codec = String(form.get("codec") || "libx264");

  const outDir = path.join(process.cwd(), "public", "edited");
  fs.mkdirSync(outDir, { recursive: true });
  const timestamp = Date.now();

  const singleFile = form.get("file") as File | null;
  const fileList = form.getAll("files").filter((f) => f instanceof File) as File[];
  const watermarkFile = form.get("watermarkFile") as File | null;

  if (!singleFile && fileList.length === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const tempPaths: string[] = [];
  const cleanupTemp = () => {
    for (const p of tempPaths) {
      try {
        fs.unlinkSync(p);
      } catch {}
    }
  };

  const writeTemp = async (file: File, prefix: string) => {
    const inputPath = path.join(os.tmpdir(), `${prefix}-${timestamp}-${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);
    tempPaths.push(inputPath);
    return inputPath;
  };

  try {
    if (action === "merge") {
      if (fileList.length < 2) {
        return NextResponse.json({ error: "Merge needs at least 2 files" }, { status: 400 });
      }
      const inputPaths = await Promise.all(
        fileList.map((file, idx) => writeTemp(file, `merge-${idx}`))
      );
      const listPath = path.join(os.tmpdir(), `concat-${timestamp}.txt`);
      const listContent = inputPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
      fs.writeFileSync(listPath, listContent);
      tempPaths.push(listPath);

      const outName = `${baseName}-${timestamp}.${format}`;
      const outputPath = path.join(outDir, outName);
      await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath]);

      cleanupTemp();
      return NextResponse.json({ ok: true, downloadUrl: `/edited/${outName}` });
    }

    if (action === "split") {
      if (!singleFile) {
        return NextResponse.json({ error: "Split needs a file" }, { status: 400 });
      }
      const durationSeconds = parseDuration(splitDuration);
      if (!durationSeconds) {
        return NextResponse.json({ error: "Split duration required" }, { status: 400 });
      }
      const inputPath = await writeTemp(singleFile, "split");
      const fps = Number(frameRate.replace("fps", "")) || 30;
      const outputUrls: string[] = [];
      let watermarkPath: string | null = null;

      if (watermarkFile) {
        watermarkPath = await writeTemp(watermarkFile, "watermark");
      }

      const overlayMap: Record<string, string> = {
        "top-right": "main_w-overlay_w-20:20",
        "top-left": "20:20",
        "bottom-right": "main_w-overlay_w-20:main_h-overlay_h-20",
        "bottom-left": "20:main_h-overlay_h-20",
      };
      const overlayPos = overlayMap[watermarkPosition] ?? overlayMap["top-right"];
      const wmScale = watermarkSize > 0 ? watermarkSize : 0.1;

      const totalDuration = await getVideoDuration(inputPath);
      if (!totalDuration) {
        return NextResponse.json({ error: "Unable to read video duration" }, { status: 400 });
      }

      let segmentIndex = 0;
      let startSec = 0;
      while (startSec < totalDuration) {
        const endSec = Math.min(startSec + durationSeconds, totalDuration);
        const outName = `${baseName}-${timestamp}-${String(segmentIndex + 1).padStart(4, "0")}.${format}`;
        const outputPath = path.join(outDir, outName);

        const args: string[] = ["-y", "-ss", String(startSec), "-to", String(endSec), "-i", inputPath];
        if (watermarkPath) {
          args.push(
            "-i",
            watermarkPath,
            "-filter_complex",
            `[1]scale=iw*${wmScale}:ih*${wmScale}[wm];[0][wm]overlay=${overlayPos}`
          );
        }
        args.push("-r", String(fps), "-c:v", codec, "-c:a", "aac", outputPath);

        await run("ffmpeg", args);

        outputUrls.push(`/edited/${outName}`);
        segmentIndex += 1;
        startSec = endSec;

        if (segmentIndex >= 9999) break;
      }

      cleanupTemp();
      return NextResponse.json({ ok: true, downloadUrls: outputUrls });
    }

    if (!singleFile) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const inputPath = await writeTemp(singleFile, "single");
    const outName = `edited-${timestamp}.${format}`;
    const outputPath = path.join(outDir, outName);
    let args: string[] = [];

    if (action === "trim") {
      if (!end || end === "0") {
        return NextResponse.json({ error: "Trim needs end time" }, { status: 400 });
      }
      args = ["-y", "-ss", start, "-to", end, "-i", inputPath, "-c", "copy", outputPath];
    } else if (action === "convert") {
      if (format === "webm") {
        args = ["-y", "-i", inputPath, "-c:v", "libvpx-vp9", "-b:v", "1M", "-c:a", "libopus", outputPath];
      } else {
        args = ["-y", "-i", inputPath, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", outputPath];
      }
    } else if (action === "watermark-text") {
      if (!watermarkText) {
        return NextResponse.json({ error: "Watermark text required" }, { status: 400 });
      }
      const draw = `drawtext=text='${watermarkText.replace(/'/g, "\\'")}':x=20:y=20:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.35`;
      args = ["-y", "-i", inputPath, "-vf", draw, "-c:a", "copy", outputPath];
    } else {
      args = ["-y", "-i", inputPath, "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "96k", outputPath];
    }

    await run("ffmpeg", args);
    cleanupTemp();

    return NextResponse.json({ ok: true, downloadUrl: `/edited/${outName}` });
  } catch (e) {
    cleanupTemp();
    return NextResponse.json({ error: "Edit failed", detail: String(e) }, { status: 500 });
  }
}

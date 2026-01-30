"use client";

import { useMemo, useState } from "react";

type Mode = "merge" | "split" | "edit";
type EditAction = "compress" | "trim" | "convert" | "watermark-text";

export default function VideoEditorPage() {
  const [mode, setMode] = useState<Mode>("edit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);

  const [editFile, setEditFile] = useState<File | null>(null);
  const [editAction, setEditAction] = useState<EditAction>("compress");
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("0");
  const [format, setFormat] = useState("mp4");
  const [watermarkText, setWatermarkText] = useState("");

  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [mergeFormat, setMergeFormat] = useState("mp4");
  const [mergeName, setMergeName] = useState("merged_video");

  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitDuration, setSplitDuration] = useState("00:00:05");
  const [splitBaseName, setSplitBaseName] = useState("output");
  const [splitFormat, setSplitFormat] = useState("mp4");
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState("top-right");
  const [watermarkSize, setWatermarkSize] = useState("0.1");
  const [frameRate, setFrameRate] = useState("30fps");
  const [codec, setCodec] = useState("libx264");

  const canSubmit = useMemo(() => {
    if (mode === "merge") return mergeFiles.length > 1;
    if (mode === "split") return !!splitFile;
    return !!editFile;
  }, [mode, mergeFiles.length, splitFile, editFile]);

  const resetOutputs = () => {
    setError(null);
    setDownloadUrl("");
    setDownloadUrls([]);
  };

  const handleSubmit = async () => {
    resetOutputs();
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("action", mode === "edit" ? editAction : mode);

      if (mode === "merge") {
        mergeFiles.forEach((file) => fd.append("files", file));
        fd.append("format", mergeFormat);
        fd.append("baseName", mergeName);
      }

      if (mode === "split") {
        if (!splitFile) throw new Error("Choose a video file");
        fd.append("file", splitFile);
        fd.append("splitDuration", splitDuration);
        fd.append("baseName", splitBaseName);
        fd.append("format", splitFormat);
        fd.append("watermarkPosition", watermarkPosition);
        fd.append("watermarkSize", watermarkSize);
        fd.append("frameRate", frameRate);
        fd.append("codec", codec);
        if (watermarkFile) fd.append("watermarkFile", watermarkFile);
      }

      if (mode === "edit") {
        if (!editFile) throw new Error("Choose a video file");
        fd.append("file", editFile);
        fd.append("format", format);
        fd.append("start", start);
        fd.append("end", end);
        fd.append("watermark", watermarkText);
      }

      const res = await fetch("/api/tools/access/video/edit", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed");
      }

      if (Array.isArray(data?.downloadUrls)) {
        setDownloadUrls(data.downloadUrls);
      } else if (typeof data?.downloadUrl === "string") {
        setDownloadUrl(data.downloadUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="absolute -top-24 -right-24 h-60 w-60 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 blur-3xl" />

          <div className="relative z-10 border-b border-slate-200/70 px-6 py-8 dark:border-gray-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                  Editor Reel
                </p>
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                  Video Editor Studio
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Merge, split, trim, convert, and watermark with a clean workflow.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-gray-800">
                  FFmpeg powered
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-gray-800">
                  No license
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 grid gap-8 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Modes
              </p>
              {(["edit", "merge", "split"] as Mode[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    mode === item
                      ? "border-blue-600 bg-blue-600 text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  }`}
                >
                  <div className="text-xs uppercase tracking-[0.18em] opacity-70">
                    {item}
                  </div>
                  <div className="mt-1 text-sm">
                    {item === "edit"
                      ? "Quick edits"
                      : item === "merge"
                      ? "Combine clips"
                      : "Split into parts"}
                  </div>
                </button>
              ))}
            </aside>

            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-slate-300">
                {mode === "edit" && "Upload a file, pick an action, then export."}
                {mode === "merge" && "Select multiple files to merge into one output."}
                {mode === "split" && "Split a video into equal duration clips."}
              </div>

              {mode === "edit" && (
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Edit video
                    </h2>
                    <span className="text-xs text-slate-500">Single file</span>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                    className="text-sm file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/20 dark:file:text-blue-300"
                  />

                  <div className="grid gap-2">
                    <label className="text-sm text-slate-600 dark:text-slate-300">
                      Action
                    </label>
                    <select
                      value={editAction}
                      onChange={(e) => setEditAction(e.target.value as EditAction)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="compress">Compress (smaller)</option>
                      <option value="trim">Trim (start → end)</option>
                      <option value="convert">Convert (mp4/webm)</option>
                      <option value="watermark-text">Watermark Text</option>
                    </select>
                  </div>

                  {editAction === "trim" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-slate-600 dark:text-slate-300">
                          Start (sec)
                        </label>
                        <input
                          value={start}
                          onChange={(e) => setStart(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600 dark:text-slate-300">
                          End (sec)
                        </label>
                        <input
                          value={end}
                          onChange={(e) => setEnd(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {editAction === "convert" && (
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Format
                      </label>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="mp4">MP4</option>
                        <option value="webm">WEBM</option>
                      </select>
                    </div>
                  )}

                  {editAction === "watermark-text" && (
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Watermark text
                      </label>
                      <input
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="e.g. Toch Mony"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {mode === "merge" && (
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Merge clips
                    </h2>
                    <span className="text-xs text-slate-500">
                      {mergeFiles.length} files
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => setMergeFiles(Array.from(e.target.files || []))}
                    className="text-sm file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/20 dark:file:text-blue-300"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Output format
                      </label>
                      <select
                        value={mergeFormat}
                        onChange={(e) => setMergeFormat(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="mp4">MP4</option>
                        <option value="webm">WEBM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Output name
                      </label>
                      <input
                        value={mergeName}
                        onChange={(e) => setMergeName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {mode === "split" && (
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Split video
                    </h2>
                    <span className="text-xs text-slate-500">Batch exports</span>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setSplitFile(e.target.files?.[0] || null)}
                    className="text-sm file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/20 dark:file:text-blue-300"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Split duration (hh:mm:ss)
                      </label>
                      <input
                        value={splitDuration}
                        onChange={(e) => setSplitDuration(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Output base name
                      </label>
                      <input
                        value={splitBaseName}
                        onChange={(e) => setSplitBaseName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Output format
                      </label>
                      <select
                        value={splitFormat}
                        onChange={(e) => setSplitFormat(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="mp4">MP4</option>
                        <option value="webm">WEBM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Frame rate
                      </label>
                      <select
                        value={frameRate}
                        onChange={(e) => setFrameRate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="30fps">30fps</option>
                        <option value="24fps">24fps</option>
                        <option value="60fps">60fps</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Codec
                      </label>
                      <select
                        value={codec}
                        onChange={(e) => setCodec(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="libx264">libx264</option>
                        <option value="libx265">libx265</option>
                        <option value="mpeg4">mpeg4</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Watermark position
                      </label>
                      <select
                        value={watermarkPosition}
                        onChange={(e) => setWatermarkPosition(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="top-right">Top right</option>
                        <option value="top-left">Top left</option>
                        <option value="bottom-right">Bottom right</option>
                        <option value="bottom-left">Bottom left</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Watermark size (fraction)
                      </label>
                      <input
                        value={watermarkSize}
                        onChange={(e) => setWatermarkSize(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 dark:text-slate-300">
                        Watermark image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setWatermarkFile(e.target.files?.[0] || null)}
                        className="mt-1 w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Start"}
                </button>

                {downloadUrl && (
                  <a href={downloadUrl} className="text-sm font-medium text-blue-600 hover:underline">
                    Download output
                  </a>
                )}

                {downloadUrls.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    <p className="font-semibold">Downloads</p>
                    <div className="mt-2 grid gap-2">
                      {downloadUrls.map((url) => (
                        <a key={url} href={url} className="text-blue-600 hover:underline">
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

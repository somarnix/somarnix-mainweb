"use client";

import { useMemo, useState } from "react";
import KeyLicence, { type KeyLicenceState } from "@/app/components/KeyLicence";

type Mode = "merge" | "split" | "edit";
type EditAction = "compress" | "trim" | "convert" | "watermark-text";
const TOOL_PRODUCT_SLUG =
  process.env.NEXT_PUBLIC_VIDEO_EDITOR_TOOL_SLUG || "videoeditor";

export default function VideoEditorPage() {
  const [mode, setMode] = useState<Mode>("edit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);
  const [licenseState, setLicenseState] = useState<KeyLicenceState>({
    status: "checking",
    token: "",
    deviceId: "",
    expiresAt: null,
    maxDevices: null,
    deviceCount: null,
    error: null,
  });

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
    if (licenseState.status !== "ready" || !licenseState.token) {
      setError("License required. Please activate your license key first.");
      return;
    }
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
        headers: {
          Authorization: `Bearer ${licenseState.token}`,
          "x-tool-slug": TOOL_PRODUCT_SLUG,
        },
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

  const handleDeactivateFromHeader = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`gstech_tool_license_${TOOL_PRODUCT_SLUG}`);
    }
    setLicenseState({
      status: "missing",
      token: "",
      deviceId: licenseState.deviceId,
      expiresAt: null,
      maxDevices: null,
      deviceCount: null,
      error: null,
    });
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
              <div className="flex flex-col items-start gap-2 text-xs text-slate-500 dark:text-slate-400 sm:items-end">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300">
                    FFmpeg powered
                  </span>
                  {licenseState.status === "ready" ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      License Active
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      License required
                    </span>
                  )}
                  {licenseState.status === "ready" ? (
                    <button
                      type="button"
                      onClick={handleDeactivateFromHeader}
                      className="rounded-full border border-red-600 bg-red-600 px-3 py-1 font-semibold text-white transition hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-500"
                    >
                      Deactivate key
                    </button>
                  ) : null}
                </div>
                {licenseState.status === "ready" ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
                    <span className="rounded-md bg-white/70 px-2 py-1 dark:bg-gray-900/50">
                      Device: <strong>{licenseState.deviceId || "--"}</strong>
                    </span>
                    <span className="rounded-md bg-white/70 px-2 py-1 dark:bg-gray-900/50">
                      Max: <strong>{licenseState.maxDevices ?? "--"}</strong>
                    </span>
                    <span className="rounded-md bg-white/70 px-2 py-1 dark:bg-gray-900/50">
                      Used: <strong>{licenseState.deviceCount ?? "--"}</strong>
                    </span>
                    <span className="rounded-md bg-white/70 px-2 py-1 dark:bg-gray-900/50">
                      Expires:{" "}
                      <strong>
                        {licenseState.expiresAt
                          ? new Date(licenseState.expiresAt).toLocaleString()
                          : "No expiry"}
                      </strong>
                    </span>
                  </div>
                ) : null}
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
              {licenseState.status !== "ready" ? (
                <KeyLicence
                  toolSlug={TOOL_PRODUCT_SLUG}
                  title="License"
                  showStatusInCard={false}
                  onChange={setLicenseState}
                />
              ) : null}

              <div className="relative">
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
                  disabled={!canSubmit || loading || licenseState.status !== "ready"}
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

              {licenseState.status !== "ready" && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-sm dark:bg-gray-950/70">
                  <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
                        <path d="M9.5 12.5l1.5 1.5 3.5-3.5" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Editor Locked</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Activation is required to use the processing tools. Enter your license key above.
                    </p>
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

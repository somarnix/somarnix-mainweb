"use client";

import { useState } from "react";
import type { Resolution } from "@/app/components/promt/types";

const RES_LABEL: Record<Resolution, string> = {
  "256": "256 x 256",
  "512": "512 x 512",
  "1024": "1024 x 1024",
  "2048": "2048 x 2048",
};

export default function TextToImgPage() {
  const [genResolution, setGenResolution] = useState<Resolution>("1024");
  const [genPrompt, setGenPrompt] = useState("A cinematic sunset city skyline.");
  const [genAspect, setGenAspect] = useState("1:1");
  const [genSampleCount, setGenSampleCount] = useState(1);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [genResults, setGenResults] = useState<string[]>([]);
  const [imagenBillingRequired, setImagenBillingRequired] = useState(false);

  const handleImageSubmit = async () => {
    setGenError("");
    setGenResults([]);
    setImagenBillingRequired(false);
    if (!genPrompt.trim()) {
      setGenError("Prompt is required.");
      return;
    }

    setGenLoading(true);
    try {
      const res = await fetch("/api/tools/gemini/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: genPrompt,
          imageSize: genResolution,
          aspectRatio: genAspect,
          sampleCount: genSampleCount,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = String(data?.error || "Image generation failed");
        if (message.toLowerCase().includes("billed")) {
          setImagenBillingRequired(true);
        }
        throw new Error(message);
      }
      setGenResults(Array.isArray(data?.images) ? data.images : []);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Text to Image
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            Gemini Imagen Demo
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            Generate images with Gemini Imagen (billing required).
          </p>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          <div className="space-y-4 text-sm text-slate-200">
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Imagen API currently requires a billed Google AI Studio project.
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Prompt
              </label>
              <textarea
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Aspect ratio
                </label>
                <select
                  value={genAspect}
                  onChange={(e) => setGenAspect(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Size
                </label>
                <select
                  value={genResolution}
                  onChange={(e) => setGenResolution(e.target.value as Resolution)}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                >
                  {(["256", "512", "1024", "2048"] as Resolution[]).map((res) => (
                    <option key={res} value={res}>
                      {RES_LABEL[res]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={genSampleCount}
                  onChange={(e) => setGenSampleCount(Number(e.target.value || 1))}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
            <button
              onClick={handleImageSubmit}
              disabled={genLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 disabled:opacity-50"
            >
              {genLoading ? "Generating..." : "Generate image"}
            </button>
            {genError && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {genError}
              </div>
            )}
            {imagenBillingRequired && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Billing is required to use Imagen. Enable billing in Google AI Studio
                and try again.
              </div>
            )}
            {genResults.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {genResults.map((img, idx) => (
                  <div key={`${img.slice(0, 20)}-${idx}`} className="overflow-hidden rounded-2xl border border-slate-800">
                    <img src={img} alt={`Generated ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

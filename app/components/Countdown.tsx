"use client";

import { useEffect, useMemo, useState } from "react";

const DAY_SECONDS = 24 * 60 * 60;

function pad(value: number): string {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

function getRemainingSeconds(nowMs: number): number {
  const epochSeconds = Math.floor(nowMs / 1000);
  const elapsedToday = ((epochSeconds % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS;
  const remaining = DAY_SECONDS - elapsedToday;
  return remaining === 0 ? DAY_SECONDS : remaining;
}

function SplitTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-xl overflow-hidden border border-blue-300/40 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 shadow-xl"
      // IMPORTANT: fallback if Tailwind is not applied
      style={{
        width: 112, // ~w-28
        height: 128, // ~h-32
        borderRadius: 12,
        border: "1px solid rgba(147,197,253,0.40)",
        background:
          "linear-gradient(135deg, rgba(30,41,59,1), rgba(15,23,42,1), rgba(23,37,84,1))",
        boxShadow: "0 18px 40px rgba(0,0,0,.55)",
      }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-blue-400/10 to-transparent pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(96,165,250,0.10), transparent)" }}
      />
      <div
        className="absolute inset-x-0 top-0 h-1/2 border-b border-white/10 bg-gradient-to-b from-white/10 to-transparent"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.10), transparent)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-black/10 to-black/40"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.40))",
        }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-xs font-bold tracking-wide text-blue-100/90 uppercase"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          {label}
        </div>

        <div
          key={value}
          className="mt-1 text-4xl sm:text-5xl leading-none font-light text-white font-mono tracking-wide drop-shadow-[0_0_14px_rgba(255,255,255,0.35)] animate-[countdownPop_350ms_ease]"
          style={{
            color: "#fff",
            textShadow: "0 0 14px rgba(255,255,255,0.35)",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function Countdown() {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = useMemo(() => getRemainingSeconds(nowMs ?? 0), [nowMs]);
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-blue-200/30 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 px-4 py-12 sm:px-10 sm:py-14 mb-12"
      // fallback background if Tailwind not applied
      style={{
        borderRadius: 18,
        border: "1px solid rgba(191,219,254,0.30)",
        background: "linear-gradient(180deg, #020617, #172554, #020617)",
        padding: "56px 40px",
        marginBottom: 48,
      }}
    >
      {/* glows behind */}
      <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none -z-10" />

      <div className="relative z-10 text-center" style={{ color: "#fff" }}>
        <h3 className="text-2xl sm:text-4xl font-bold text-white" style={{ color: "#fff" }}>
          To Avoid Losing Your Place In Line,
        </h3>

        <p
          className="mt-2 text-blue-100/70 text-lg"
          style={{ color: "rgba(255,255,255,0.70)" }}
        >
          Please Complete Your Order Within:
        </p>

        <div className="mt-10 flex items-center justify-center gap-2 sm:gap-4">
          <SplitTile label="HRS" value={pad(hours)} />

          <div
            className="text-4xl font-bold text-blue-100/90 animate-pulse"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            :
          </div>

          <SplitTile label="MIN" value={pad(minutes)} />

          <div
            className="text-4xl font-bold text-blue-100/90 animate-pulse"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            :
          </div>

          <SplitTile label="SEC" value={pad(seconds)} />
        </div>
      </div>

      <style>{`
        @keyframes countdownPop {
          0% { transform: translateY(14%) scale(0.94); opacity: 0.45; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </section>
  );
}

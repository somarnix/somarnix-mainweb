// gstechedukh/app/pages/tools-ai/promt-ai/components/SummaryEditor.tsx
"use client";

type SummaryEditorProps = {
  summary: string;
  onSummaryChange: (value: string) => void;
  idea: string;
  onIdeaChange: (value: string) => void;
};

export default function SummaryEditor({
  summary,
  onSummaryChange,
  idea,
  onIdeaChange,
}: SummaryEditorProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        Edit summary
      </p>
      <textarea
        value={summary}
        onChange={(e) => onSummaryChange(e.target.value)}
        rows={4}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
      />
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Story idea
          </p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">
            Required
          </span>
        </div>
        <textarea
          value={idea}
          onChange={(e) => onIdeaChange(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          placeholder="Describe your movie idea or plot direction (required)..."
        />
      </div>
    </div>
  );
}

// gstechedukh/app/pages/tools-ai/promt-ai/components/PromptInput.tsx
"use client";

type PromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  onParse: () => void;
};

export default function PromptInput({
  value,
  onChange,
  onParse,
}: PromptInputProps) {
  return (
    <div className="space-y-4 text-sm text-slate-200">
      <div>
        <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Paste prompt
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
          placeholder="Paste your image description prompt here..."
        />
      </div>
      <button
        onClick={onParse}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400"
      >
        Parse summary + characters
      </button>
    </div>
  );
}

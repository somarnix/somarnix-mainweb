// gstechedukh/app/pages/tools-ai/promt-ai/components/GenericAssetList.tsx
"use client";

type GenericAssetListProps<T> = {
  title: string;
  copyLabel: string;
  addLabel: string;
  emptyLabel: string;
  items: T[];
  getName: (item: T) => string;
  getDetails: (item: T) => string;
  onChangeName: (index: number, value: string) => void;
  onChangeDetails: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onCopy: () => void;
  namePlaceholder: string;
  detailsPlaceholder: string;
};

export default function GenericAssetList<T>({
  title,
  copyLabel,
  addLabel,
  emptyLabel,
  items,
  getName,
  getDetails,
  onChangeName,
  onChangeDetails,
  onRemove,
  onAdd,
  onCopy,
  namePlaceholder,
  detailsPlaceholder,
}: GenericAssetListProps<T>) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {title}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
          >
            {copyLabel}
          </button>
          <button
            onClick={onAdd}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-400"
          >
            {addLabel}
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-slate-400">{emptyLabel}</p>
        )}
        {items.map((item, idx) => (
          <div
            key={`${getName(item)}-${idx}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                {title} {idx + 1}
              </p>
              <button
                onClick={() => onRemove(idx)}
                className="text-xs text-red-300 hover:text-red-200"
              >
                Remove
              </button>
            </div>
            <input
              value={getName(item)}
              onChange={(e) => onChangeName(idx, e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
              placeholder={namePlaceholder}
            />
            <textarea
              value={getDetails(item)}
              onChange={(e) => onChangeDetails(idx, e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
              placeholder={detailsPlaceholder}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

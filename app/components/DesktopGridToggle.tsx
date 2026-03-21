"use client";

import { LayoutGrid } from "lucide-react";

type DesktopGridToggleProps = {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  className?: string;
  visibilityClassName?: string;
};

export function DesktopGridToggle({
  value,
  onChange,
  options = [4, 5],
  className = "",
  visibilityClassName = "hidden lg:flex",
}: DesktopGridToggleProps) {
  return (
    <div
      className={`${visibilityClassName} items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-200">
        <LayoutGrid className="h-4 w-4" />
      </span>
      {options.map((count) => {
        const active = value === count;
        return (
          <button
            key={count}
            type="button"
            onClick={() => onChange(count)}
            className={`min-w-[42px] rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              active
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
            aria-pressed={active}
            aria-label={`${count} cards per row`}
          >
            {count}
          </button>
        );
      })}
    </div>
  );
}

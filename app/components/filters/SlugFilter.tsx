import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Filter } from "lucide-react";

type SortKey = "popular" | "price-low" | "price-high" | "rating";

type SortOption = {
  id: SortKey;
  label: string;
};

type SlugOption = {
  value: string;
  label: string;
};

type SlugFilterProps = {
  filterTitle: string;
  slugLabel: string;
  sortLabel: string;
  slugOptions: SlugOption[];
  selectedSlug: string;
  onSelectSlug: (value: string) => void;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
  sortOptions: SortOption[];
  activeClassName: string;
  mobileTrailingControl?: ReactNode;
};

export function SlugFilter({
  filterTitle,
  slugLabel,
  sortLabel,
  slugOptions,
  selectedSlug,
  onSelectSlug,
  sortBy,
  onSortChange,
  sortOptions,
  activeClassName,
  mobileTrailingControl,
}: SlugFilterProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pcOpen, setPcOpen] = useState(false);

  const selectedSlugLabel = useMemo(
    () => slugOptions.find((slug) => slug.value === selectedSlug)?.label ?? slugLabel,
    [selectedSlug, slugLabel, slugOptions]
  );
  const selectedSortLabel = useMemo(
    () => sortOptions.find((option) => option.id === sortBy)?.label ?? sortLabel,
    [sortBy, sortLabel, sortOptions]
  );

  const handleSlugSelect = (value: string) => {
    onSelectSlug(value);
    setMobileOpen(false);
  };

  const handleSortSelect = (value: SortKey) => {
    onSortChange(value);
    setMobileOpen(false);
  };

  return (
    <>
      <div className="lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="flex min-w-0 flex-1 items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200">
                <Filter className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{filterTitle}</div>
                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {selectedSlugLabel} | {selectedSortLabel}
                </div>
              </div>
            </div>
            <span className="ml-3 shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {mobileOpen ? "Hide" : "Open"}
            </span>
          </button>
          {mobileTrailingControl}
        </div>

        {mobileOpen ? (
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="max-h-[52vh] space-y-5 overflow-y-auto pr-1">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {slugLabel}
                </h3>
                <div className="space-y-2">
                  {slugOptions.map((slug) => (
                    <button
                      key={slug.value}
                      type="button"
                      onClick={() => handleSlugSelect(slug.value)}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                        selectedSlug === slug.value
                          ? activeClassName
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                      }`}
                    >
                      {slug.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {sortLabel}
                </h3>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSortSelect(option.id)}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                        sortBy === option.id
                          ? activeClassName
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="hidden lg:block">
        <button
          type="button"
          onClick={() => setPcOpen((current) => !current)}
          className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200">
              <Filter className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{filterTitle}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedSlugLabel} | {selectedSortLabel}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {pcOpen ? "Hide Filters" : "Show Filters"}
          </span>
        </button>

        {pcOpen ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <h3 className="mb-3 font-semibold">{slugLabel}</h3>
                <div className="space-y-2">
                  {slugOptions.map((slug) => (
                    <button
                      key={slug.value}
                      onClick={() => onSelectSlug(slug.value)}
                      className={`w-full rounded-lg px-4 py-2 text-left transition-colors ${
                        selectedSlug === slug.value ? activeClassName : "hover:bg-secondary"
                      }`}
                    >
                      {slug.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">{sortLabel}</h3>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onSortChange(option.id)}
                      className={`w-full rounded-lg px-4 py-2 text-left transition-colors ${
                        sortBy === option.id ? activeClassName : "hover:bg-secondary"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

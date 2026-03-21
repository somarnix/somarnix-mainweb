import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Filter } from "lucide-react";

import { useLanguage } from "../../contexts/LanguageContext";

type SortKey = "popular" | "price-low" | "price-high" | "rating";
type ContentType = { id: "all" | "ai" | "program" | "game" | "tools"; label: string };

type AllFilterProps = {
  contentTypes: ContentType[];
  selectedType: ContentType["id"];
  onSelectType: (value: ContentType["id"]) => void;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
  mobileTrailingControl?: ReactNode;
};

export function AllFilter({
  contentTypes,
  selectedType,
  onSelectType,
  sortBy,
  onSortChange,
  mobileTrailingControl,
}: AllFilterProps) {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pcOpen, setPcOpen] = useState(false);

  const sortOptions = useMemo<Array<{ id: SortKey; label: string }>>(
    () => [
      { id: "popular", label: t("filters.mostPopular") },
      { id: "rating", label: t("filters.highestRated") },
      { id: "price-low", label: t("filters.priceLowHigh") },
      { id: "price-high", label: t("filters.priceHighLow") },
    ],
    [t]
  );

  const selectedTypeLabel =
    contentTypes.find((type) => type.id === selectedType)?.label ?? t("filters.all");
  const selectedSortLabel =
    sortOptions.find((option) => option.id === sortBy)?.label ?? t("filters.mostPopular");

  const handleTypeSelect = (value: ContentType["id"]) => {
    onSelectType(value);
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <Filter className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("filters.title")}
                </div>
                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {selectedTypeLabel} | {selectedSortLabel}
                </div>
              </div>
            </div>
            <span className="ml-3 shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-300">
              {mobileOpen ? "Hide" : "Open"}
            </span>
          </button>
          {mobileTrailingControl}
        </div>

        {mobileOpen ? (
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="max-h-[52vh] space-y-5 overflow-y-auto pr-1">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("filters.categories")}
                </p>
                <div className="space-y-2">
                  {contentTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleTypeSelect(type.id)}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                        selectedType === type.id
                          ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-300"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("filters.sortBy")}
                </p>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSortSelect(option.id)}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                        sortBy === option.id
                          ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-300"
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              <Filter className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {t("filters.title")}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedTypeLabel} | {selectedSortLabel}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
            {pcOpen ? "Hide Filters" : "Show Filters"}
          </span>
        </button>

        {pcOpen ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("filters.categories")}
                </p>
                <div className="space-y-2">
                  {contentTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => onSelectType(type.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedType === type.id
                          ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-300"
                          : "hover:bg-secondary"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("filters.sortBy")}
                </p>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onSortChange(option.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        sortBy === option.id
                          ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-300"
                          : "hover:bg-secondary"
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

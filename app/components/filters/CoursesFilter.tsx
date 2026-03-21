import { useState } from "react";
import { Filter } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { ScrollableChipTabs } from "../ScrollableChipTabs";

type SortOption = {
  id: "newest" | "popular" | "rating" | "price-low" | "price-high" | "all";
  label: string;
};

type CoursesFilterProps = {
  categories: { id: string; name: string }[];
  tags: { id: string; label: string }[];
  levels: { id: string; label: string }[];
  priceFilters: { id: "all" | "free" | "paid"; label: string }[];
  sortOptions: SortOption[];
  selectedCategories: string[];
  selectedTags: string[];
  selectedLevels: string[];
  selectedPrice: "all" | "free" | "paid";
  sortBy: string;
  viewMode: "all" | "newest" | "popular" | "rating";
  onSelectCategory: (value: string) => void;
  onSelectTag: (value: string) => void;
  onSelectLevel: (value: string) => void;
  onSelectPrice: (value: "all" | "free" | "paid") => void;
  onSortClick: (value: SortOption["id"]) => void;
  onClearFilters: () => void;
};

export function CoursesFilter({
  categories,
  tags,
  levels,
  priceFilters,
  sortOptions,
  selectedCategories,
  selectedTags,
  selectedLevels,
  selectedPrice,
  sortBy,
  viewMode,
  onSelectCategory,
  onSelectTag,
  onSelectLevel,
  onSelectPrice,
  onSortClick,
  onClearFilters,
}: CoursesFilterProps) {
  const { t } = useLanguage();
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [pcOpen, setPcOpen] = useState(false);

  const activeSortValue =
    viewMode === "newest"
      ? "newest"
      : viewMode === "popular"
      ? "popular"
      : viewMode === "rating"
      ? "rating"
      : sortBy;

  return (
    <div>
      <div className="space-y-4 lg:hidden">
        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowExtraFilters((current) => !current)}
              className="flex shrink-0 items-center gap-2 text-base font-semibold text-primary"
            >
              <Filter className="h-4 w-4" />
              {t("filters.title")}
            </button>

            <ScrollableChipTabs
              className="min-w-0 flex-1"
              items={[
                {
                  key: "view-all",
                  label: t("filters.allVideos"),
                  active: viewMode === "all",
                  onClick: () => onSortClick("all"),
                  className:
                    "rounded-full border px-4 py-2 text-sm font-medium transition " +
                    (viewMode === "all"
                      ? "border-slate-900 bg-slate-800 text-white dark:border-slate-100 dark:bg-white dark:text-slate-900"
                      : "border-gray-300 bg-white text-slate-700 hover:border-slate-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"),
                },
                {
                  key: "view-newest",
                  label: t("courses.newReleases"),
                  active: activeSortValue === "newest",
                  onClick: () => onSortClick("newest"),
                  className:
                    "rounded-full border px-4 py-2 text-sm font-medium transition " +
                    (activeSortValue === "newest"
                      ? "border-slate-900 bg-slate-800 text-white dark:border-slate-100 dark:bg-white dark:text-slate-900"
                      : "border-gray-300 bg-white text-slate-700 hover:border-slate-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"),
                },
                {
                  key: "view-popular",
                  label: t("filters.mostPopular"),
                  active: activeSortValue === "popular",
                  onClick: () => onSortClick("popular"),
                  className:
                    "rounded-full border px-4 py-2 text-sm font-medium transition " +
                    (activeSortValue === "popular"
                      ? "border-slate-900 bg-slate-800 text-white dark:border-slate-100 dark:bg-white dark:text-slate-900"
                      : "border-gray-300 bg-white text-slate-700 hover:border-slate-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"),
                },
                {
                  key: "view-rating",
                  label: t("filters.highestRated"),
                  active: activeSortValue === "rating",
                  onClick: () => onSortClick("rating"),
                  className:
                    "rounded-full border px-4 py-2 text-sm font-medium transition " +
                    (activeSortValue === "rating"
                      ? "border-slate-900 bg-slate-800 text-white dark:border-slate-100 dark:bg-white dark:text-slate-900"
                      : "border-gray-300 bg-white text-slate-700 hover:border-slate-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"),
                },
              ]}
            />
          </div>

          {showExtraFilters ? (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    {t("filters.price")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {priceFilters.map((option) => {
                      const isActive = selectedPrice === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onSelectPrice(option.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            isActive
                              ? "border-slate-900 bg-slate-800 text-white dark:border-slate-100 dark:bg-white dark:text-slate-900"
                              : "border-gray-300 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    {t("filters.categories")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectCategory("")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        selectedCategories.length === 0
                          ? "border-slate-900 bg-slate-800 text-white dark:border-slate-100 dark:bg-white dark:text-slate-900"
                          : "border-gray-300 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      {t("filters.allVideos")}
                    </button>
                    {categories.map((category) => {
                      const isActive = selectedCategories.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => onSelectCategory(category.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            isActive
                              ? "border-slate-900 bg-slate-800 text-white dark:border-slate-100 dark:bg-white dark:text-slate-900"
                              : "border-gray-300 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <details className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-primary">
                    {t("filters.tag")} ({selectedTags.length}) | {t("filters.level")} ({selectedLevels.length})
                  </summary>

                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        {t("filters.tag")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const isActive = selectedTags.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => onSelectTag(tag.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                isActive
                                  ? "border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "border-gray-300 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                              }`}
                            >
                              {tag.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        {t("filters.level")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {levels.map((level) => {
                          const isActive = selectedLevels.includes(level.id);
                          return (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => onSelectLevel(level.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                isActive
                                  ? "border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "border-gray-300 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                              }`}
                            >
                              {level.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </details>
              </div>

              <button
                onClick={onClearFilters}
                className="mt-2 w-full rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-gray-900 dark:text-blue-300 dark:hover:bg-blue-900/20"
              >
                {t("filters.clearAll")}
              </button>
            </div>
          ) : null}
        </div>
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
                {selectedCategories[0] || t("filters.allVideos")} | {sortOptions.find((option) => option.id === activeSortValue)?.label ?? t("filters.mostPopular")}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
            {pcOpen ? "Hide Filters" : "Show Filters"}
          </span>
        </button>

        {pcOpen ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="grid gap-6 xl:grid-cols-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("filters.categories")}
                </p>
                <button
                  onClick={() => onSelectCategory("")}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    selectedCategories.length === 0
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-primary hover:bg-secondary"
                  }`}
                >
                  {t("filters.allVideos")}
                </button>
                {categories.map((category) => {
                  const isActive = selectedCategories.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => onSelectCategory(category.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                          : "text-primary hover:bg-secondary"
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {t("filters.sortBy")}
                </p>
                <div className="space-y-2">
                  {sortOptions.map((option) => {
                    const isActive = activeSortValue === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => onSortClick(option.id)}
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                            : "text-primary hover:bg-secondary"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("filters.tag")}
                  </p>
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex items-center gap-2 text-sm text-primary"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.id)}
                          onChange={() => onSelectTag(tag.id)}
                          className="h-4 w-4 rounded border-border text-primary"
                        />
                        {tag.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("filters.level")}
                  </p>
                  <div className="space-y-2">
                    {levels.map((level) => (
                      <label
                        key={level.id}
                        className="flex items-center gap-2 text-sm text-primary"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLevels.includes(level.id)}
                          onChange={() => onSelectLevel(level.id)}
                          className="h-4 w-4 rounded border-border text-primary"
                        />
                        {level.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    {t("filters.price")}
                  </p>
                  <div className="space-y-2">
                    {priceFilters.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 text-sm text-primary"
                      >
                        <input
                          type="radio"
                          name="price"
                          checked={selectedPrice === option.id}
                          onChange={() => onSelectPrice(option.id)}
                          className="h-4 w-4 border-border text-primary"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onClearFilters}
                  className="w-full rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/20"
                >
                  {t("filters.clearAll")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

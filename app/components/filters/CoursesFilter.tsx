import { Filter } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

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

  const activeSortValue =
    viewMode === "newest"
      ? "newest"
      : viewMode === "popular"
      ? "popular"
      : viewMode === "rating"
      ? "rating"
      : sortBy;

  return (
    <aside className="md:col-span-4 lg:col-span-3">
      <div className="space-y-4 lg:hidden">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Filter className="w-4 h-4" />
            {t("filters.title")}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("filters.categories")}
              </span>
              <select
                value={selectedCategories[0] ?? ""}
                onChange={(event) => onSelectCategory(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <option value="">{t("filters.allVideos")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("filters.sortBy")}
              </span>
              <select
                value={activeSortValue}
                onChange={(event) => onSortClick(event.target.value as SortOption["id"])}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("filters.price")}
              </span>
              <select
                value={selectedPrice}
                onChange={(event) =>
                  onSelectPrice(event.target.value as "all" | "free" | "paid")
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                {priceFilters.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <details className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-950">
            <summary className="cursor-pointer list-none text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("filters.tag")} ({selectedTags.length})
            </summary>
            <div className="mt-3 space-y-2">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.id)}
                    onChange={() => onSelectTag(tag.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:border-gray-700"
                  />
                  {tag.label}
                </label>
              ))}
            </div>
          </details>

          <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-950">
            <summary className="cursor-pointer list-none text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t("filters.level")} ({selectedLevels.length})
            </summary>
            <div className="mt-3 space-y-2">
              {levels.map((level) => (
                <label
                  key={level.id}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes(level.id)}
                    onChange={() => onSelectLevel(level.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:border-gray-700"
                  />
                  {level.label}
                </label>
              ))}
            </div>
          </details>

          <button
            onClick={onClearFilters}
            className="mt-4 w-full rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/20"
          >
            {t("filters.clearAll")}
          </button>
        </div>
      </div>

      <div className="hidden h-fit space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:block">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Filter className="w-4 h-4" />
            {t("filters.title")}
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("filters.categories")}
            </p>
            <button
              onClick={() => onSelectCategory("")}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                selectedCategories.length === 0
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
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
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
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
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("filters.tag")}
            </p>
            <div className="space-y-2">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.id)}
                    onChange={() => onSelectTag(tag.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:border-gray-700"
                  />
                  {tag.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("filters.level")}
            </p>
            <div className="space-y-2">
              {levels.map((level) => (
                <label
                  key={level.id}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes(level.id)}
                    onChange={() => onSelectLevel(level.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 dark:border-gray-700"
                  />
                  {level.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("filters.price")}
            </p>
            <div className="space-y-2">
              {priceFilters.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-200"
                >
                  <input
                    type="radio"
                    name="price"
                    checked={selectedPrice === option.id}
                    onChange={() => onSelectPrice(option.id)}
                    className="h-4 w-4 border-gray-300 text-blue-600 dark:border-gray-700"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClearFilters}
          className="w-full rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/20"
        >
          {t("filters.clearAll")}
        </button>
      </div>
    </aside>
  );
}

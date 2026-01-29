import { Filter } from "lucide-react";

type SortOption = {
  id: "newest" | "popular" | "rating" | "price-low" | "price-high" | "all";
  label: string;
};

type CoursesFilterProps = {
  language: string;
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
  language,
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
  return (
    <aside className="md:col-span-4 lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5 space-y-6 h-fit shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="w-3/2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Filter className="w-4 h-4" />
            {language === "km" ? "តម្រង" : "Filters"}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
              {language === "km" ? "ប្រភេទ" : "Categories"}
            </p>
            <button
              onClick={() => onSelectCategory("")}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                selectedCategories.length === 0
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                  : "hover:bg-gray-50 text-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              {language === "km" ? "វីដេអូទាំងអស់" : "All Videos"}
            </button>

            {categories.map((category) => {
              const isActive = selectedCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => onSelectCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                      : "hover:bg-gray-50 text-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
              {language === "km" ? "តម្រៀបតាម" : "Sort By"}
            </p>
            <div className="space-y-2">
              {sortOptions.map((option) => {
                const isActive =
                  (option.id === "all" && viewMode === "all") ||
                  (option.id === "newest" && viewMode === "newest") ||
                  (option.id === "popular" && viewMode === "popular") ||
                  (option.id === "rating" && viewMode === "rating") ||
                  (!["all", "newest", "popular", "rating"].includes(option.id) &&
                    sortBy === option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => onSortClick(option.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                        : "hover:bg-gray-50 text-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
              {language === "km" ? "ស្លាក" : "Tag"}
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

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
              {language === "km" ? "កម្រិត" : "Level"}
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

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
              {language === "km" ? "តម្លៃ" : "Price"}
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
      </div>

      <button
        onClick={onClearFilters}
        className="w-full rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/20"
      >
        {language === "km" ? "សម្អាតតម្រងទាំងអស់" : "Clear all filters"}
      </button>
    </aside>
  );
}

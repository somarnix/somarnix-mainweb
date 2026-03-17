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
};

export function AllFilter({
  contentTypes,
  selectedType,
  onSelectType,
  sortBy,
  onSortChange,
}: AllFilterProps) {
  const { t } = useLanguage();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-5 h-5" />
        <h2 className="text-lg font-bold">
          {t("filters.title")}
        </h2>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          {t("filters.categories")}
        </p>
        <div className="md:hidden">
          <select
            value={selectedType}
            onChange={(event) => onSelectType(event.target.value as ContentType["id"])}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          >
            {contentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden space-y-2 md:block">
          {contentTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onSelectType(type.id)}
              className={`w-full text-left px-4 py-2 rounded-lg ${
                selectedType === type.id
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "hover:bg-gray-100"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          {t("filters.sortBy")}
        </p>
        <div className="md:hidden">
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          >
            {[
              ["popular", t("filters.mostPopular")],
              ["rating", t("filters.highestRated")],
              ["price-low", t("filters.priceLowHigh")],
              ["price-high", t("filters.priceHighLow")],
            ].map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden md:block">
          {[
            ["popular", t("filters.mostPopular")],
            ["rating", t("filters.highestRated")],
            ["price-low", t("filters.priceLowHigh")],
            ["price-high", t("filters.priceHighLow")],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => onSortChange(key as SortKey)}
              className={`w-full text-left px-4 py-2 rounded-lg ${
                sortBy === key
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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
        <div className="space-y-2">
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
  );
}

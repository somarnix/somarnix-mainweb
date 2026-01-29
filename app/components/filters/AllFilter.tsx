import { Filter } from "lucide-react";

type SortKey = "popular" | "price-low" | "price-high" | "rating";
type ContentType = { id: "all" | "ai" | "program" | "game" | "tools"; label: string };

type AllFilterProps = {
  language: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  contentTypes: ContentType[];
  selectedType: ContentType["id"];
  onSelectType: (value: ContentType["id"]) => void;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
};

export function AllFilter({
  language,
  searchTerm,
  onSearchChange,
  contentTypes,
  selectedType,
  onSelectType,
  sortBy,
  onSortChange,
}: AllFilterProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5" />
          <h2 className="text-lg font-bold">
            {language === "km" ? "?????" : "Filters"}
          </h2>
        </div>
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={language === "km" ? "???????" : "Search"}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          {language === "km" ? "?????????" : "Categories"}
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
          {language === "km" ? "?????????" : "Sort By"}
        </p>
        {[
          ["popular", language === "km" ? "???????" : "Most Popular"],
          ["rating", language === "km" ? "???????????" : "Highest Rated"],
          ["price-low", language === "km" ? "???????????????" : "Price: Low to High"],
          ["price-high", language === "km" ? "???????????????" : "Price: High to Low"],
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

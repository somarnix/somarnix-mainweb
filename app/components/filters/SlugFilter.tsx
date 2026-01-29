import { Filter } from "lucide-react";

type SortKey = "popular" | "price-low" | "price-high" | "rating";

type SortOption = {
  id: SortKey;
  label: string;
};

type SlugFilterProps = {
  filterTitle: string;
  slugLabel: string;
  sortLabel: string;
  slugs: string[];
  selectedSlug: string;
  onSelectSlug: (value: string) => void;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
  sortOptions: SortOption[];
  activeClassName: string;
};

export function SlugFilter({
  filterTitle,
  slugLabel,
  sortLabel,
  slugs,
  selectedSlug,
  onSelectSlug,
  sortBy,
  onSortChange,
  sortOptions,
  activeClassName,
}: SlugFilterProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sticky top-24">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-5 h-5" />
        <h2 className="text-lg font-bold">{filterTitle}</h2>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-3">{slugLabel}</h3>
        <div className="space-y-2">
          {slugs.map((slug) => (
            <button
              key={slug}
              onClick={() => onSelectSlug(slug)}
              className={`w-full text-left px-4 py-2 rounded-lg ${
                selectedSlug === slug ? activeClassName : "hover:bg-gray-100"
              }`}
            >
              {slug}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">{sortLabel}</h3>
        {sortOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSortChange(option.id)}
            className={`w-full text-left px-4 py-2 rounded-lg ${
              sortBy === option.id ? activeClassName : "hover:bg-gray-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

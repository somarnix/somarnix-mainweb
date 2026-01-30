import { Search as SearchIcon } from "lucide-react";

type SearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
};

export function Search({
  value,
  onChange,
  placeholder = "Search",
  className = "",
  inputClassName = "",
  iconClassName = "",
}: SearchProps) {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon
        className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${iconClassName}`}
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 ${inputClassName}`}
      />
    </div>
  );
}

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={`flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 ${className}`}
    >
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-7 h-7 rounded-full border text-sm ${
                isActive
                  ? "border-blue-500 text-blue-600"
                  : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>
    </div>
  );
}

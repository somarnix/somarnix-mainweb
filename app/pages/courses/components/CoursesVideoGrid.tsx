"use client";

import type { ReactNode } from "react";

export default function CoursesVideoGrid({
  loading,
  error,
  loadingLabel,
  items,
  renderItem,
  className = "",
}: {
  loading: boolean;
  error: string | null;
  loadingLabel: string;
  items: any[];
  renderItem: (item: any) => ReactNode;
  className?: string;
}) {
  return (
    <div className={className || "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"}>
      {loading ? (
        <div className="col-span-full text-sm text-gray-500 dark:text-gray-400">
          {loadingLabel}
        </div>
      ) : error ? (
        <div className="col-span-full text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : (
        items.map(renderItem)
      )}
    </div>
  );
}

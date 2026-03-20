"use client";

import type { ReactNode } from "react";
import { Search } from "../../components/Search";

export default function SlugCatalogResults({
  loading,
  loadingLabel,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchInputClassName,
  clearFilterControl,
  children,
}: {
  loading: boolean;
  loadingLabel: string;
  title: string;
  subtitle: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchInputClassName: string;
  clearFilterControl?: ReactNode;
  children: ReactNode;
}) {
  if (loading) {
    return <div className="text-center text-gray-500">{loadingLabel}</div>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Search
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="w-full sm:w-64"
            inputClassName={searchInputClassName}
          />
          {clearFilterControl}
        </div>
      </div>

      {children}
    </>
  );
}

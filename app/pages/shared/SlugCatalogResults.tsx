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
  desktopControls,
  belowSearchControls,
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
  desktopControls?: ReactNode;
  belowSearchControls?: ReactNode;
  children: ReactNode;
}) {
  if (loading) {
    return <div className="text-center text-gray-500">{loadingLabel}</div>;
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-[560px] sm:items-end">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Search
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="w-full sm:flex-1"
              inputClassName={searchInputClassName}
            />
            {desktopControls}
          </div>
          {clearFilterControl ? (
            <div className="flex w-full justify-start sm:justify-end">
              {clearFilterControl}
            </div>
          ) : null}
        </div>
      </div>

      {belowSearchControls ? <div className="mb-6">{belowSearchControls}</div> : null}

      {children}
    </>
  );
}

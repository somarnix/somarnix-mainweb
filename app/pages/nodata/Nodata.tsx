"use client";

import { useLanguage } from "../../contexts/LanguageContext";

export function Nodata() {
  const { t } = useLanguage();

  return (
    <div className="w-full flex items-center justify-center py-16">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {t("nodata.title")}
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t("nodata.subtitle")}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useLanguage } from "../../contexts/LanguageContext";
import { Nodata } from "../nodata/Nodata";

export function BlogPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {t("blog.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("blog.subtitle")}
          </p>
        </div>

        <Nodata />
      </div>
    </div>
  );
}

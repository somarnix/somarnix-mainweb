// app\pages\programs\ProgramsPage.tsx
import { useEffect, useState } from "react";
import { Code } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { useLanguage } from "../../contexts/LanguageContext";
import { SlugFilter } from "../../components/filters/SlugFilter";
import { Pagination } from "../../components/Pagination";
import { normalizeProductListResponse } from "../../../lib/products";
import { useCatalogListing } from "../../lib/catalog/useCatalogListing";
import SlugCatalogResults from "../shared/SlugCatalogResults";

type DbProgram = {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  min_price: number | null;
  min_original_price: number | null;
  category: string;
  stock_qty: number | null;
  is_unlimited_stock: 0 | 1 | null;
  students: number;
  rating: number;
};

export function ProgramsPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) {
  const { t } = useLanguage();
  const ALL_SLUG = "__all_programs__";

  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    pagedItems: pagedPrograms,
    selectedSlug,
    setCurrentPage,
    setSelectedSlug,
    setSlugQuery,
    setSortBy,
    slugOptions,
    slugQuery,
    sortBy,
    sortedItems: sortedPrograms,
    totalPages,
    visiblePage,
  } = useCatalogListing({
    items: programs,
    allSlug: ALL_SLUG,
    allLabel: t("programs.all"),
  });
  
  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch("/api/products?category=program", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setPrograms(normalizeProductListResponse(data) as DbProgram[]))
      .finally(() => setLoading(false));
  }, []);

  function handleViewDetails(slug: string): void {
    onOpenProductDetail(slug);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-10 text-white sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-3 flex items-center gap-3 md:mb-4">
            <Code className="h-9 w-9 sm:h-12 sm:w-12" />
            <h1 className="text-3xl font-bold md:text-5xl">
              {t("programs.title")}
            </h1>
          </div>
          <p className="text-base text-blue-100 sm:text-xl">
            {t("programs.subtitle")}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* SIDEBAR */}
          <aside className="lg:col-span-1">
            <SlugFilter
              filterTitle={t("courses.filters")}
              slugLabel={t("filters.slugs")}
              sortLabel={t("courses.sortBy")}
              slugOptions={slugOptions}
              selectedSlug={selectedSlug}
              onSelectSlug={setSelectedSlug}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOptions={[
                { id: "popular", label: t("courses.popular") },
                { id: "rating", label: t("courses.rating") },
                { id: "price-low", label: t("courses.priceLow") },
                { id: "price-high", label: t("courses.priceHigh") },
              ]}
              activeClassName="bg-blue-50 text-blue-600 font-medium"
            />
          </aside>

          {/* MAIN GRID */}
          <main className="lg:col-span-3">
            <SlugCatalogResults
              loading={loading}
              loadingLabel={t("common.loading")}
              title={selectedSlug === ALL_SLUG ? t("programs.all") : selectedSlug}
              subtitle={`${sortedPrograms.length} ${t("labels.programs")} ${t("common.available")}`}
              searchValue={slugQuery}
              onSearchChange={setSlugQuery}
              searchPlaceholder={t("search.slug")}
              searchInputClassName="rounded-lg shadow-sm focus:ring-blue-500"
              clearFilterControl={
                selectedSlug !== ALL_SLUG ? (
                  <button
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-100 dark:border-gray-700"
                    onClick={() => setSelectedSlug(ALL_SLUG)}
                  >
                    {t("courses.clearFilter")}
                  </button>
                ) : null
              }
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedPrograms.map((p) => (
                  <CourseCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    slug={p.slug}
                    image={p.image_url}
                    price={p.min_price}
                    originalPrice={p.min_original_price}
                    category={p.category}
                    stockQty={p.stock_qty}
                    isUnlimitedStock={p.is_unlimited_stock}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
              <Pagination
                currentPage={visiblePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="mt-6"
              />
            </SlugCatalogResults>
          </main>
        </div>
      </div>
    </div>
  );
}

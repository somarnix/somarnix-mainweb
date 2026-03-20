// app\pages\tools - ai\ToolsPage.tsx
import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { useLanguage } from "../../contexts/LanguageContext";
import { SlugFilter } from "../../components/filters/SlugFilter";
import { Pagination } from "../../components/Pagination";
import { normalizeProductListResponse } from "../../../lib/products";
import { useCatalogListing } from "../../lib/catalog/useCatalogListing";
import SlugCatalogResults from "../shared/SlugCatalogResults";

/* ================= DB TYPE ================= */
type DbTool = {
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

export function ToolsPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) {
  const { t } = useLanguage();
  const ALL_SLUG = "__all_tools__";

  const [tools, setTools] = useState<DbTool[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    pagedItems: pagedTools,
    selectedSlug,
    setCurrentPage,
    setSelectedSlug,
    setSlugQuery,
    setSortBy,
    slugOptions,
    slugQuery,
    sortBy,
    sortedItems: sortedTools,
    totalPages,
    visiblePage,
  } = useCatalogListing({
    items: tools,
    allSlug: ALL_SLUG,
    allLabel: t("tools.all"),
  });

  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch("/api/products?category=tools", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setTools(normalizeProductListResponse(data) as DbTool[]))
      .finally(() => setLoading(false));
  }, []);
  const handleViewDetails = (slug: string) => {
    onOpenProductDetail(slug);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 py-10 text-white sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-3 flex items-center gap-3 md:mb-4">
            <Wrench className="h-9 w-9 sm:h-12 sm:w-12" />
            <h1 className="text-3xl font-bold md:text-5xl">
              {t("tools.title")}
            </h1>
          </div>
          <p className="text-base text-green-100 sm:text-xl">
            {t("tools.subtitle")}
          </p>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* ================= FILTER SIDEBAR ================= */}
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
              activeClassName="bg-green-50 text-green-600 font-medium"
            />
          </aside>

          {/* ================= MAIN GRID ================= */}
          <main className="lg:col-span-3">
            <SlugCatalogResults
              loading={loading}
              loadingLabel={t("common.loading")}
              title={selectedSlug === ALL_SLUG ? t("tools.all") : selectedSlug}
              subtitle={`${sortedTools.length} ${t("labels.tools")} ${t("common.available")}`}
              searchValue={slugQuery}
              onSearchChange={setSlugQuery}
              searchPlaceholder={t("search.slug")}
              searchInputClassName="rounded-lg shadow-sm focus:ring-green-500"
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
                {pagedTools.map((tool) => (
                  <CourseCard
                    key={tool.id}
                    title={tool.title}
                    slug={tool.slug}
                    image={tool.image_url}
                    price={tool.min_price}
                    originalPrice={tool.min_original_price}
                    category={tool.category}
                    stockQty={tool.stock_qty}
                    isUnlimitedStock={tool.is_unlimited_stock}
                    onViewDetails={handleViewDetails}
                    id={tool.id}
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

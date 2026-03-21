// app\pages\tools - ai\ToolsPage.tsx
import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { DesktopGridToggle } from "../../components/DesktopGridToggle";
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
  posted_by_username?: string | null;
  posted_by_avatar?: string | null;
  telegram_url?: string | null;
};

export function ToolsPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) {
  const { t } = useLanguage();
  const ALL_SLUG = "__all_tools__";

  const [tools, setTools] = useState<DbTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(1280);
  const [mobileGridColumns, setMobileGridColumns] = useState<1 | 2>(2);
  const [tabletGridColumns, setTabletGridColumns] = useState<2 | 3>(3);
  const [desktopGridColumns, setDesktopGridColumns] = useState<4 | 5>(4);
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
    mobileGridColumns,
    tabletGridColumns,
    desktopGridColumns,
  });

  useEffect(() => {
    const updateScreenWidth = () => setScreenWidth(window.innerWidth);
    updateScreenWidth();
    window.addEventListener("resize", updateScreenWidth);
    return () => window.removeEventListener("resize", updateScreenWidth);
  }, []);

  const gridClassName =
    screenWidth < 768
      ? mobileGridColumns === 2
        ? "grid grid-cols-2 gap-4"
        : "grid grid-cols-1 gap-4"
      : screenWidth < 1024
      ? tabletGridColumns === 3
        ? "grid grid-cols-2 md:grid-cols-3 gap-6"
        : "grid grid-cols-2 gap-6"
      : `grid grid-cols-2 gap-4 sm:gap-6 ${
          desktopGridColumns === 5 ? "lg:grid-cols-4 xl:grid-cols-5" : "lg:grid-cols-4"
        }`;

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
        <div className="space-y-6">
          <main>
            <SlugCatalogResults
              loading={loading}
              loadingLabel={t("common.loading")}
              title={selectedSlug === ALL_SLUG ? t("tools.all") : selectedSlug}
              subtitle={`${sortedTools.length} ${t("labels.tools")} ${t("common.available")}`}
              searchValue={slugQuery}
              onSearchChange={setSlugQuery}
              searchPlaceholder={t("search.slug")}
              searchInputClassName="rounded-lg shadow-sm focus:ring-green-500"
              belowSearchControls={
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
                  mobileTrailingControl={
                    <>
                      <DesktopGridToggle
                        value={mobileGridColumns}
                        onChange={(value) => setMobileGridColumns(value as 1 | 2)}
                        options={[1, 2]}
                        visibilityClassName="flex md:hidden"
                      />
                      <DesktopGridToggle
                        value={tabletGridColumns}
                        onChange={(value) => setTabletGridColumns(value as 2 | 3)}
                        options={[2, 3]}
                        visibilityClassName="hidden md:flex lg:hidden"
                      />
                    </>
                  }
                />
              }
              desktopControls={
                <DesktopGridToggle
                  value={desktopGridColumns}
                  onChange={(value) => setDesktopGridColumns(value as 4 | 5)}
                />
              }
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
              <div className={gridClassName}>
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
                    sellerName={tool.posted_by_username}
                    sellerLogoUrl={tool.posted_by_avatar}
                    contactUrl={tool.telegram_url}
                    onViewDetails={handleViewDetails}
                    id={tool.id}
                    favoriteType="tool"
                    favoriteLabel={t("nav.tools")}
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

// app\pages\ai\AiPage.tsx
import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { DesktopGridToggle } from "../../components/DesktopGridToggle";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useLanguage } from "../../contexts/LanguageContext";
import { SlugFilter } from "../../components/filters/SlugFilter";
import { Pagination } from "../../components/Pagination";
import { normalizeProductListResponse } from "../../../lib/products";
import { useCatalogListing } from "../../lib/catalog/useCatalogListing";
import SlugCatalogResults from "../shared/SlugCatalogResults";

type DbCourse = {
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

export function AiPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) { 
  const { t } = useLanguage();
  const ALL_SLUG = "__all_ai__";

  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(1280);
  const [mobileGridColumns, setMobileGridColumns] = useState<1 | 2>(2);
  const [tabletGridColumns, setTabletGridColumns] = useState<2 | 3>(3);
  const [desktopGridColumns, setDesktopGridColumns] = useState<4 | 5>(4);
  const {
    pagedItems: pagedCourses,
    selectedSlug,
    setCurrentPage,
    setSelectedSlug,
    setSlugQuery,
    setSortBy,
    slugOptions,
    slugQuery,
    sortBy,
    sortedItems: sortedCourses,
    totalPages,
    visiblePage,
  } = useCatalogListing({
    items: courses,
    allSlug: ALL_SLUG,
    allLabel: t("ai.all"),
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
    fetch("/api/products?category=ai", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setCourses(normalizeProductListResponse(data) as DbCourse[]))
      .finally(() => setLoading(false));
  }, []);

  function handleViewDetails(slug: string): void {
    onOpenProductDetail(slug);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-10 text-white sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="mb-3 text-3xl font-bold md:mb-4 md:text-5xl">
            {t("ai.title")}
          </h1>
          <p className="text-base text-blue-100 sm:text-xl">
            {t("ai.subtitle")}
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
              title={selectedSlug === ALL_SLUG ? t("ai.all") : selectedSlug}
              subtitle={`${sortedCourses.length} ${t("courses.available")}`}
              searchValue={slugQuery}
              onSearchChange={setSlugQuery}
              searchPlaceholder={t("search.slug")}
              searchInputClassName="rounded-lg shadow-sm focus:ring-blue-500"
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
                  activeClassName="bg-blue-50 text-blue-600 font-medium"
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
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-300"
                    onClick={() => setSelectedSlug(ALL_SLUG)}
                  >
                    {t("courses.clearFilter")}
                  </Badge>
                ) : null
              }
            >
              {sortedCourses.length > 0 ? (
                <div className={gridClassName}>
                  {pagedCourses.map((c) => (
                    <CourseCard
                      key={c.id}
                      id={c.id}
                      title={c.title}
                      slug={c.slug}
                      image={c.image_url}
                      price={c.min_price}
                      originalPrice={c.min_original_price}
                      category={c.category}
                      stockQty={c.stock_qty}
                      isUnlimitedStock={c.is_unlimited_stock}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <SlidersHorizontal className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {t("courses.noResults")}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {t("courses.noResultsDesc")}
                  </p>
                  <Button
                    onClick={() => setSelectedSlug(ALL_SLUG)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    {t("ai.all")}
                  </Button>
                </div>
              )}
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


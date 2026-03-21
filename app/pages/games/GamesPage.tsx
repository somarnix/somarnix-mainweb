// app\pages\games\GamesPage.tsx
import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { DesktopGridToggle } from "../../components/DesktopGridToggle";
import { useLanguage } from "../../contexts/LanguageContext";
import { SlugFilter } from "../../components/filters/SlugFilter";
import { Pagination } from "../../components/Pagination";
import { normalizeProductListResponse } from "../../../lib/products";
import { useCatalogListing } from "../../lib/catalog/useCatalogListing";
import SlugCatalogResults from "../shared/SlugCatalogResults";

type DbGame = {
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

export function GamesPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) {
  const { t } = useLanguage();
  const ALL_SLUG = "__all_games__";

  const [games, setGames] = useState<DbGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(1280);
  const [mobileGridColumns, setMobileGridColumns] = useState<1 | 2>(2);
  const [tabletGridColumns, setTabletGridColumns] = useState<2 | 3>(3);
  const [desktopGridColumns, setDesktopGridColumns] = useState<4 | 5>(4);
  const {
    pagedItems: pagedGames,
    selectedSlug,
    setCurrentPage,
    setSelectedSlug,
    setSlugQuery,
    setSortBy,
    slugOptions,
    slugQuery,
    sortBy,
    sortedItems: sortedGames,
    totalPages,
    visiblePage,
  } = useCatalogListing({
    items: games,
    allSlug: ALL_SLUG,
    allLabel: t("games.all"),
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
    fetch("/api/products?category=game", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setGames(normalizeProductListResponse(data) as DbGame[]))
      .finally(() => setLoading(false));
  }, []);

  function handleViewDetails(slug: string): void {
    onOpenProductDetail(slug);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-10 text-white sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-3 flex items-center gap-3 md:mb-4">
            <Gamepad2 className="h-9 w-9 sm:h-12 sm:w-12" />
            <h1 className="text-3xl font-bold md:text-5xl">
              {t("games.title")}
            </h1>
          </div>
          <p className="text-base text-purple-100 sm:text-xl">
            {t("games.subtitle")}
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
              title={selectedSlug === ALL_SLUG ? t("games.all") : selectedSlug}
              subtitle={`${sortedGames.length} ${t("labels.games")} ${t("common.available")}`}
              searchValue={slugQuery}
              onSearchChange={setSlugQuery}
              searchPlaceholder={t("search.slug")}
              searchInputClassName="rounded-lg shadow-sm focus:ring-purple-500"
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
                  activeClassName="bg-purple-50 text-purple-600 font-medium"
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
                {pagedGames.map((g) => (
                  <CourseCard
                    key={g.id}
                    id={g.id}
                    title={g.title}
                    slug={g.slug}
                    image={g.image_url}
                    price={g.min_price}
                    originalPrice={g.min_original_price}
                    category={g.category}
                    stockQty={g.stock_qty}
                    isUnlimitedStock={g.is_unlimited_stock}
                    sellerName={g.posted_by_username}
                    sellerLogoUrl={g.posted_by_avatar}
                    contactUrl={g.telegram_url}
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

// app\pages\all-category
import { useEffect, useState } from "react";
import { CourseCard } from "../../components/CourseCard";
import { DesktopGridToggle } from "../../components/DesktopGridToggle";
import { useLanguage } from "../../contexts/LanguageContext";
import { AllFilter } from "../../components/filters/AllFilter";
import { Pagination } from "../../components/Pagination";
import { Search } from "../../components/Search";
import { normalizeProductListResponse } from "../../../lib/products";

/* ================= DB TYPE ================= */
type DbProduct = {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  min_price: number | null;
  min_original_price: number | null;
  category: string;
  type: "course" | "program" | "game" | "tool";
  stock_qty: number | null;
  is_unlimited_stock: 0 | 1 | null;
  students: number;
  rating: number;
  posted_by_username?: string | null;
  posted_by_avatar?: string | null;
  telegram_url?: string | null;
};

export function AllPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) {
  const { t } = useLanguage();

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedType, setSelectedType] = useState<
    "all" | "ai" | "program" | "game" | "tools"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [screenWidth, setScreenWidth] = useState(1280);
  const [mobileGridColumns, setMobileGridColumns] = useState<1 | 2>(2);
  const [tabletGridColumns, setTabletGridColumns] = useState<2 | 3>(3);
  const [desktopGridColumns, setDesktopGridColumns] = useState<4 | 5>(4);
  const [sortBy, setSortBy] = useState<
    "popular" | "price-low" | "price-high" | "rating"
  >("popular");

  useEffect(() => {
    const updateScreenWidth = () => setScreenWidth(window.innerWidth);
    updateScreenWidth();
    window.addEventListener("resize", updateScreenWidth);
    return () => window.removeEventListener("resize", updateScreenWidth);
  }, []);

  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setProducts(normalizeProductListResponse(data) as DbProduct[]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setItemsPerPage(mobileGridColumns === 2 ? 4 : 3);
        return;
      }
      if (width < 1024) {
        setItemsPerPage(tabletGridColumns === 3 ? 6 : 4);
        return;
      }
      setItemsPerPage(desktopGridColumns === 5 ? 10 : 8);
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, [desktopGridColumns, mobileGridColumns, tabletGridColumns]);

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

  /* ================= FILTER BY TYPE ================= */
  const filteredItems = products.filter((p) => {
    const category = String(p.category ?? "").toLowerCase();
    const type = String(p.type ?? "").toLowerCase();
    const title = String(p.title ?? "").toLowerCase();
    const slug = String(p.slug ?? "").toLowerCase();
    const query = searchTerm.trim().toLowerCase();

    const matchesType = (() => {
      if (selectedType === "all") return true;
      if (selectedType === "ai") return category === "ai";
      if (selectedType === "program") return category === "program" || type === "program";
      if (selectedType === "game") return category === "game" || type === "game";
      if (selectedType === "tools") return category === "tools" || category === "tool" || type === "tool";
      return true;
    })();

    const matchesSearch =
      query.length === 0 ? true : title.includes(query) || slug.includes(query);

    return matchesType && matchesSearch;
  });

  /* ================= SORT ================= */
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aOut =
      !a.is_unlimited_stock && typeof a.stock_qty === "number"
        ? a.stock_qty <= 0
        : false;
    const bOut =
      !b.is_unlimited_stock && typeof b.stock_qty === "number"
        ? b.stock_qty <= 0
        : false;
    if (aOut !== bOut) return aOut ? 1 : -1;
    switch (sortBy) {
      case "price-low":
        return (a.min_price ?? 0) - (b.min_price ?? 0);
      case "price-high":
        return (b.min_price ?? 0) - (a.min_price ?? 0);
      case "rating":
        return b.rating - a.rating;
      case "popular":
      default:
        return b.students - a.students;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
  const visiblePage = Math.min(currentPage, totalPages);
  const pagedItems = sortedItems.slice(
    (visiblePage - 1) * itemsPerPage,
    visiblePage * itemsPerPage
  );

  /* ================= CONTENT TYPES ================= */
  const contentTypes: Array<{
    id: "all" | "ai" | "program" | "game" | "tools";
    label: string;
  }> = [
    { id: "all", label: t("filters.all") },
    { id: "ai", label: t("filters.ai") },
    { id: "program", label: t("filters.programs") },
    { id: "game", label: t("filters.games") },
    { id: "tools", label: t("filters.tools") },
  ];

  /* ================= NAVIGATION ================= */
  const handleViewDetails = (slug: string) => {
    onOpenProductDetail(slug);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-10 text-white sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="mb-3 text-3xl font-bold md:mb-4 md:text-5xl">
            {t("all.title")}
          </h1>
          <p className="text-base text-blue-100 sm:text-xl">
            {t("all.subtitle")}
          </p>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="space-y-6">
          <main>
            {loading ? (
              <div className="text-center text-gray-500">{t("common.loading")}</div>
            ) : sortedItems.length > 0 ? (
              <>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedType === "all"
                        ? t("all.allProducts")
                        : contentTypes.find((type) => type.id === selectedType)?.label ??
                          selectedType}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {sortedItems.length} {t("all.products")} {t("all.available")}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-3 lg:w-[560px] sm:items-end">
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <Search
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder={t("search.slug")}
                        className="w-full sm:flex-1"
                        inputClassName="rounded-lg shadow-sm focus:ring-blue-500"
                      />
                      <DesktopGridToggle
                        value={desktopGridColumns}
                        onChange={(value) => setDesktopGridColumns(value as 4 | 5)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6 lg:hidden">
                  <AllFilter
                    contentTypes={contentTypes}
                    selectedType={selectedType}
                    onSelectType={setSelectedType}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
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
                </div>

                <div className={gridClassName}>
                  {pagedItems.map((item) => (
                    <CourseCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      slug={item.slug}
                      image={item.image_url}
                      price={item.min_price}
                      originalPrice={item.min_original_price}
                      category={item.category}
                      stockQty={item.stock_qty}
                      isUnlimitedStock={item.is_unlimited_stock}
                      sellerName={item.posted_by_username}
                      sellerLogoUrl={item.posted_by_avatar}
                      contactUrl={item.telegram_url}
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
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {t("all.noResults")}
                </h3>
                <p className="text-gray-600">
                  {t("all.noResultsDesc")}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// app\pages\tools - ai\ToolsPage.tsx
import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { useLanguage } from "../../contexts/LanguageContext";
import { SlugFilter } from "../../components/filters/SlugFilter";
import { Pagination } from "../../components/Pagination";
import { Search } from "../../components/Search";
import { normalizeProductListResponse } from "../../../lib/products";

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

  const [tools, setTools] = useState<DbTool[]>([]);
  const [loading, setLoading] = useState(true);

  const allLabel = "All Tools";
  const [selectedSlug, setSelectedSlug] = useState<string>(allLabel);
  const [slugQuery, setSlugQuery] = useState("");
  const [slugLimit, setSlugLimit] = useState(10);

  const [sortBy, setSortBy] = useState<
    "popular" | "price-low" | "price-high" | "rating"
  >("popular");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch("/api/products?category=tools")
      .then((res) => res.json())
      .then((data) => setTools(normalizeProductListResponse(data) as DbTool[]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const updateLimit = () => {
      setSlugLimit(window.innerWidth < 640 ? 5 : 10);
    };
    updateLimit();
    window.addEventListener("resize", updateLimit);
    return () => window.removeEventListener("resize", updateLimit);
  }, []);

  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth < 768 ? 3 : 6);
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  /* ================= FILTER ================= */
  const filteredTools =
    selectedSlug === allLabel
      ? tools
      : tools.filter((t) => t.slug === selectedSlug);
  const normalizedSlugQuery = slugQuery.trim().toLowerCase();
  const searchedTools = normalizedSlugQuery
    ? filteredTools.filter((tool) =>
        tool.slug.toLowerCase().includes(normalizedSlugQuery)
      )
    : filteredTools;

  /* ================= SORT ================= */
  const sortedTools = [...searchedTools].sort((a, b) => {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSlug, sortBy, slugQuery]);

  const totalPages = Math.max(1, Math.ceil(sortedTools.length / itemsPerPage));
  const pagedTools = sortedTools.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ================= CATEGORIES ================= */
  const allSlugs = Array.from(new Set(tools.map((t) => t.slug))).sort(
    (a, b) => a.localeCompare(b)
  );
  const filteredSlugs = normalizedSlugQuery
    ? allSlugs.filter((slug) =>
        slug.toLowerCase().includes(normalizedSlugQuery)
      )
    : allSlugs;
  const visibleSlugs = normalizedSlugQuery
    ? filteredSlugs
    : filteredSlugs.slice(0, slugLimit);

  /* ================= NAVIGATION ================= */
  const handleViewDetails = (slug: string) => {
    onOpenProductDetail(slug);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold">
              {t("tools.title")}
            </h1>
          </div>
          <p className="text-xl text-green-100">
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
              slugs={[allLabel, ...visibleSlugs]}
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
            {loading ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedSlug}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {sortedTools.length} {t("labels.tools")} {t("common.available")}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Search
                      value={slugQuery}
                      onChange={setSlugQuery}
                      placeholder={t("search.slug")}
                      className="w-full sm:w-64"
                      inputClassName="rounded-lg shadow-sm focus:ring-green-500"
                    />
                    {selectedSlug !== allLabel && (
                      <button
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-100 dark:border-gray-700"
                        onClick={() => setSelectedSlug(allLabel)}
                      >
                        {t("courses.clearFilter")}
                      </button>
                    )}
                  </div>
                </div>

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
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  className="mt-6"
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

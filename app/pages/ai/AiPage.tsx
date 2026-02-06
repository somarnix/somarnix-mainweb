// app\pages\ai\AiPage.tsx
import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useLanguage } from "../../contexts/LanguageContext";
import { SlugFilter } from "../../components/filters/SlugFilter";
import { Pagination } from "../../components/Pagination";
import { Search } from "../../components/Search";

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

  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const allLabel = "All AI";
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
    fetch("/api/products?category=ai")
      .then((res) => res.json())
      .then((data) => setCourses(data ?? []))
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
  const filteredCourses =
    selectedSlug === allLabel
      ? courses
      : courses.filter((c) => c.slug === selectedSlug);
  const normalizedSlugQuery = slugQuery.trim().toLowerCase();
  const searchedCourses = normalizedSlugQuery
    ? filteredCourses.filter((c) =>
        c.slug.toLowerCase().includes(normalizedSlugQuery)
      )
    : filteredCourses;

  /* ================= SORT ================= */
  const sortedCourses = [...searchedCourses].sort((a, b) => {
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

  const totalPages = Math.max(1, Math.ceil(sortedCourses.length / itemsPerPage));
  const pagedCourses = sortedCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ================= CATEGORIES ================= */
  const allSlugs = Array.from(new Set(courses.map((c) => c.slug))).sort(
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

  function handleViewDetails(slug: string): void {
    onOpenProductDetail(slug);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t("courses.title") || "Explore Our Courses"}
          </h1>
          <p className="text-xl text-blue-100">
            {t("courses.subtitle") ||
              "Discover courses in web development, design, business, and more"}
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
              slugLabel={t("courses.categories") || "Slugs"}
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
              activeClassName="bg-blue-50 text-blue-600 font-medium"
            />
          </aside>

          {/* ================= MAIN GRID ================= */}
          <main className="lg:col-span-3">
            {loading ? (
              <div className="text-center text-gray-500">
                Loading...
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedSlug}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {sortedCourses.length}{" "}
                      {t("courses.available")}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Search
                      value={slugQuery}
                      onChange={setSlugQuery}
                      placeholder={t("search.slug")}
                      className="w-full sm:w-64"
                      inputClassName="rounded-lg shadow-sm focus:ring-blue-500"
                    />
                    {selectedSlug !== allLabel && (
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-gray-300"
                        onClick={() => setSelectedSlug(allLabel)}
                      >
                        {t("courses.clearFilter")} ×
                      </Badge>
                    )}
                  </div>

                </div>

                {/* Grid */}
                {sortedCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      onClick={() => setSelectedSlug(allLabel)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {t("courses.viewAll")}
                    </Button>
                  </div>
                )}
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

// app\pages\programs\ProgramsPage.tsx
import { useEffect, useState } from "react";
import { Code } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { useLanguage } from "../../contexts/LanguageContext";
import { SlugFilter } from "../../components/filters/SlugFilter";
import { Pagination } from "../../components/Pagination";
import { Search } from "../../components/Search";
import { normalizeProductListResponse } from "../../../lib/products";

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

  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const allLabel = "All Programs";
  const [selectedSlug, setSelectedSlug] = useState(allLabel);
  const [slugQuery, setSlugQuery] = useState("");
  const [slugLimit, setSlugLimit] = useState(10);

  const [sortBy, setSortBy] = useState<
    "popular" | "price-low" | "price-high" | "rating"
    >("popular");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  
  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch("/api/products?category=program", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setPrograms(normalizeProductListResponse(data) as DbProgram[]))
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
  const filteredPrograms =
    selectedSlug === allLabel
      ? programs
      : programs.filter((p) => p.slug === selectedSlug);
  const normalizedSlugQuery = slugQuery.trim().toLowerCase();
  const searchedPrograms = normalizedSlugQuery
    ? filteredPrograms.filter((p) =>
        p.slug.toLowerCase().includes(normalizedSlugQuery)
      )
    : filteredPrograms;

  /* ================= SORT ================= */
  const sortedPrograms = [...searchedPrograms].sort((a, b) => {
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

  const totalPages = Math.max(1, Math.ceil(sortedPrograms.length / itemsPerPage));
  const visiblePage = Math.min(currentPage, totalPages);
  const pagedPrograms = sortedPrograms.slice(
    (visiblePage - 1) * itemsPerPage,
    visiblePage * itemsPerPage
  );

  /* ================= CATEGORIES ================= */
  const allSlugs = Array.from(new Set(programs.map((p) => p.slug))).sort(
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
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold">
              {t("programs.title")}
            </h1>
          </div>
          <p className="text-xl text-blue-100">
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

          {/* MAIN GRID */}
          <main className="lg:col-span-3">
            {loading ? (
              <div className="text-center text-gray-500">
                Loading...
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedSlug}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {sortedPrograms.length} {t("labels.programs")} {t("common.available")}
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
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

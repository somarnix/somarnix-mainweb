// app\pages\courses\CoursesPage.tsx
import { useEffect, useState } from "react";
import { Filter, SlidersHorizontal } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useLanguage } from "../../contexts/LanguageContext";
import { useRouter } from "next/navigation";

type DbCourse = {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  min_price: number | null;
  min_original_price: number | null;
  category: string;
  students: number;
  rating: number;
};

export function CoursesPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) { 
  const { t } = useLanguage();

  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] =
    useState<string>("All Courses");

  const [sortBy, setSortBy] = useState<
    "popular" | "price-low" | "price-high" | "rating"
  >("popular");

  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch("/api/products?type=course")
      .then((res) => res.json())
      .then((data) => setCourses(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const router = useRouter();

  /* ================= FILTER ================= */
  const filteredCourses =
    selectedCategory === "All Courses"
      ? courses
      : courses.filter((c) => c.category === selectedCategory);

  /* ================= SORT ================= */
  const sortedCourses = [...filteredCourses].sort((a, b) => {
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

  /* ================= CATEGORIES ================= */
  const categories = [
    "All Courses",
    ...Array.from(new Set(courses.map((c) => c.category))),
  ];

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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5" />
                <h2 className="text-lg font-bold">
                  {t("courses.filters")}
                </h2>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">
                  {t("courses.categories") || "Categories"}
                </h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-4 py-2 rounded-lg ${
                        selectedCategory === cat
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="font-semibold mb-3">
                  {t("courses.sortBy")}
                </h3>
                {[
                  ["popular", t("courses.popular")],
                  ["rating", t("courses.rating")],
                  ["price-low", t("courses.priceLow")],
                  ["price-high", t("courses.priceHigh")],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setSortBy(key as typeof sortBy)
                    }
                    className={`w-full text-left px-4 py-2 rounded-lg ${
                      sortBy === key
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
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
                      {selectedCategory}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {sortedCourses.length}{" "}
                      {t("courses.available")}
                    </p>
                  </div>

                  {selectedCategory !== "All Courses" && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-gray-300"
                      onClick={() =>
                        setSelectedCategory("All Courses")
                      }
                    >
                      {t("courses.clearFilter")} ×
                    </Badge>
                  )}
                </div>

                {/* Grid */}
                {sortedCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedCourses.map((c) => (
                      <CourseCard
                        key={c.id}
                        id={c.id}
                        title={c.title}
                        slug={c.slug}
                        image={c.image_url}
                        price={c.min_price}
                        originalPrice={c.min_original_price}
                        category={c.category}
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
                      onClick={() =>
                        setSelectedCategory("All Courses")
                      }
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {t("courses.viewAll")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

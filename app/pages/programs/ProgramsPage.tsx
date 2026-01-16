// app\pages\programs\ProgramsPage.tsx
import { useEffect, useState } from "react";
import { Filter, Code } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { useLanguage } from "../../contexts/LanguageContext";
import router from "next/router";
import { useRouter } from "next/navigation";

type DbProgram = {
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

export function ProgramsPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) {
  const { language, t } = useLanguage();

  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] =
    useState("All Programs");

  const [sortBy, setSortBy] = useState<
    "popular" | "price-low" | "price-high" | "rating"
    >("popular");
  
  const router = useRouter();

  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch("/api/products?type=program")
      .then((res) => res.json())
      .then((data) => setPrograms(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  /* ================= FILTER ================= */
  const filteredPrograms =
    selectedCategory === "All Programs"
      ? programs
      : programs.filter((p) => p.category === selectedCategory);

  /* ================= SORT ================= */
  const sortedPrograms = [...filteredPrograms].sort((a, b) => {
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
    "All Programs",
    ...Array.from(new Set(programs.map((p) => p.category))),
  ];

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
              {language === "km"
                ? "កម្មវិធីវិជ្ជាជីវៈ"
                : "Professional Programs"}
            </h1>
          </div>
          <p className="text-xl text-blue-100">
            {language === "km"
              ? "រកឃើញកម្មវិធីសម្រាប់ការងារអាជីព"
              : "Discover professional software for your career"}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* SIDEBAR */}
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
                  {language === "km" ? "ប្រភេទ" : "Categories"}
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

          {/* MAIN GRID */}
          <main className="lg:col-span-3">
            {loading ? (
              <div className="text-center text-gray-500">
                Loading...
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">
                    {selectedCategory}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {sortedPrograms.length}{" "}
                    {language === "km" ? "កម្មវិធី" : "programs"}{" "}
                    {t("courses.available")}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedPrograms.map((p) => (
                    <CourseCard
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      slug={p.slug}
                      image={p.image_url}
                      price={p.min_price}
                      originalPrice={p.min_original_price}
                      category={p.category}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

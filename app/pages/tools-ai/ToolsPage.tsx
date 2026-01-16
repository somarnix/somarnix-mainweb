// app\pages\tools - ai\ToolsPage.tsx
import { useEffect, useState } from "react";
import { Filter, Wrench } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { useLanguage } from "../../contexts/LanguageContext";

/* ================= DB TYPE ================= */
type DbTool = {
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

export function ToolsPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) {
  const { language, t } = useLanguage();

  const [tools, setTools] = useState<DbTool[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] =
    useState<string>("All Tools");

  const [sortBy, setSortBy] = useState<
    "popular" | "price-low" | "price-high" | "rating"
  >("popular");

  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch("/api/products?type=tool")
      .then((res) => res.json())
      .then((data) => setTools(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  /* ================= FILTER ================= */
  const filteredTools =
    selectedCategory === "All Tools"
      ? tools
      : tools.filter((t) => t.category === selectedCategory);

  /* ================= SORT ================= */
  const sortedTools = [...filteredTools].sort((a, b) => {
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
    "All Tools",
    ...Array.from(new Set(tools.map((t) => t.category))),
  ];

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
              {language === "km" ? "ឧបករណ៍" : "Productivity Tools"}
            </h1>
          </div>
          <p className="text-xl text-green-100">
            {language === "km"
              ? "រកឃើញឧបករណ៍ដើម្បីបង្កើនផលិតភាព"
              : "Discover tools to boost productivity and efficiency"}
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
                  {language === "km" ? "ប្រភេទ" : "Categories"}
                </h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-4 py-2 rounded-lg ${
                        selectedCategory === cat
                          ? "bg-green-50 text-green-600 font-medium"
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
                    onClick={() => setSortBy(key as typeof sortBy)}
                    className={`w-full text-left px-4 py-2 rounded-lg ${
                      sortBy === key
                        ? "bg-green-50 text-green-600 font-medium"
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
              <div className="text-center text-gray-500">Loading...</div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">
                    {selectedCategory}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {sortedTools.length}{" "}
                    {language === "km" ? "ឧបករណ៍" : "tools"}{" "}
                    {t("courses.available")}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedTools.map((tool) => (
                    <CourseCard
                      key={tool.id}
                      title={tool.title}
                      slug={tool.slug}
                      image={tool.image_url}
                      price={tool.min_price}
                      originalPrice={tool.min_original_price}
                      category={tool.category}
                      onViewDetails={handleViewDetails} id={0}                    />
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

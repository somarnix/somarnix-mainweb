// app\pages\all-category
import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { useLanguage } from "../../contexts/LanguageContext";
import { useRouter } from "next/navigation";

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
  students: number;
  rating: number;
};

export function AllPage({ onOpenProductDetail }: { onOpenProductDetail: (slug: string) => void }) {
  const { language, t } = useLanguage();

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedType, setSelectedType] = useState("All");
  const [sortBy, setSortBy] = useState<
    "popular" | "price-low" | "price-high" | "rating"
  >("popular");

  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const router = useRouter();

  /* ================= FILTER BY TYPE ================= */
  const filteredItems =
    selectedType === "All"
      ? products
      : products.filter((p) => {
          if (selectedType === "Courses") return p.type === "course";
          if (selectedType === "Programs") return p.type === "program";
          if (selectedType === "Games") return p.type === "game";
          if (selectedType === "Tools") return p.type === "tool";
          return true;
        });

  /* ================= SORT ================= */
  const sortedItems = [...filteredItems].sort((a, b) => {
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

  /* ================= CONTENT TYPES ================= */
  const contentTypes = [
    "All",
    language === "km" ? "វគ្គសិក្សា" : "Courses",
    language === "km" ? "កម្មវិធី" : "Programs",
    language === "km" ? "ហ្គេម" : "Games",
    language === "km" ? "ឧបករណ៍" : "Tools",
  ];

  /* ================= NAVIGATION ================= */
  const handleViewDetails = (slug: string) => {
    onOpenProductDetail(slug);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === "km"
              ? "រុករកផលិតផលទាំងអស់"
              : "Explore All Products"}
          </h1>
          <p className="text-xl text-blue-100">
            {language === "km"
              ? "រកឃើញវគ្គសិក្សា កម្មវិធី ហ្គេម និងឧបករណ៍"
              : "Discover courses, programs, games, and tools all in one place"}
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

              {/* Content Type */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">
                  {language === "km" ? "ប្រភេទ" : "Content Type"}
                </h3>
                <div className="space-y-2">
                  {contentTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`w-full text-left px-4 py-2 rounded-lg ${
                        selectedType === type
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {type}
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
              <div className="text-center text-gray-500">Loading...</div>
            ) : sortedItems.length > 0 ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">
                    {selectedType === "All"
                      ? language === "km"
                        ? "ទាំងអស់"
                        : "All Products"
                      : selectedType}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {sortedItems.length}{" "}
                    {language === "km" ? "ផលិតផល" : "products"}{" "}
                    {t("courses.available")}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedItems.map((item) => (
                    <CourseCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      slug={item.slug}
                      image={item.image_url}
                      price={item.min_price}
                      originalPrice={item.min_original_price}
                      category={item.category}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Filter className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {t("courses.noResults")}
                </h3>
                <p className="text-gray-600">
                  {t("courses.noResultsDesc")}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

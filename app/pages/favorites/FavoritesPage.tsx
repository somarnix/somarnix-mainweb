import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { CourseCard } from "../../components/CourseCard";
import { Pagination } from "../../components/Pagination";
import { Search } from "../../components/Search";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  FAVORITES_CHANGED_EVENT,
  readFavoriteItems,
  type FavoriteItem,
} from "../../lib/favorites";

interface FavoritesPageProps {
  onOpenProductDetail: (slug: string) => void;
  onOpenVideoDetail: (slug: string) => void;
}

export function FavoritesPage({
  onOpenProductDetail,
  onOpenVideoDetail,
}: FavoritesPageProps) {
  const { t } = useLanguage();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    const syncFavorites = () => {
      setFavorites(readFavoriteItems());
    };

    syncFavorites();
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
  }, []);

  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth < 1280 ? 6 : 12);
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const filteredFavorites = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return favorites;

    return favorites.filter((item) =>
      `${item.title} ${item.label ?? ""} ${item.category ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [favorites, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [favorites, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredFavorites.length / itemsPerPage));
  const visiblePage = Math.min(currentPage, totalPages);
  const pagedFavorites = useMemo(() => {
    const startIndex = (visiblePage - 1) * itemsPerPage;
    return filteredFavorites.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFavorites, itemsPerPage, visiblePage]);

  const handleOpenFavorite = (item: FavoriteItem) => {
    if (item.type === "video-course") {
      onOpenVideoDetail(item.slug);
      return;
    }
    onOpenProductDetail(item.slug);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("profile.favorite")}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("favorites.subtitle")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4">
        <div className="rounded-[1.6rem] bg-white p-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-950 dark:ring-gray-800 sm:rounded-[2rem] sm:p-4 lg:p-5">
          <Search
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("favorites.searchPlaceholder")}
            inputClassName="h-12 rounded-2xl border-gray-200 bg-white text-base shadow-sm dark:border-gray-800 dark:bg-gray-900"
          />

          <div className="mt-3 rounded-[1.35rem] bg-gradient-to-b from-gray-50 to-white px-3 py-3 ring-1 ring-gray-100 dark:from-gray-900 dark:to-gray-950 dark:ring-gray-800 sm:mt-4 sm:rounded-[1.75rem] sm:px-4 sm:py-4">
            <div className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-white px-3 py-3 shadow-sm ring-1 ring-gray-100 dark:bg-gray-950 dark:ring-gray-800 sm:rounded-2xl sm:px-4 sm:py-3">
              <div className="text-base text-gray-500 dark:text-gray-400 sm:text-lg">
                {t("favorites.foundItems", { count: filteredFavorites.length })}
              </div>
              <Heart className="h-5 w-5 text-gray-400" />
            </div>

            {filteredFavorites.length === 0 ? (
              <div className="flex min-h-[16rem] flex-col items-center justify-center px-4 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">
                  <Heart className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                  {favorites.length === 0 ? t("favorites.empty") : t("favorites.noMatch")}
                </h2>
                <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                  {favorites.length === 0
                    ? t("favorites.emptyHint")
                    : t("favorites.noMatchHint")}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3 md:mt-4 md:grid-cols-3 md:gap-4 xl:grid-cols-4 xl:gap-5">
                  {pagedFavorites.map((item, index) => (
                    <CourseCard
                      key={item.id}
                      id={(visiblePage - 1) * itemsPerPage + index + 1}
                      title={item.title}
                      slug={item.slug}
                      image={item.image}
                      price={item.price}
                      originalPrice={null}
                      category={item.category ?? item.label ?? undefined}
                      onViewDetails={() => handleOpenFavorite(item)}
                      favoriteType={item.type}
                      favoriteLabel={item.label ?? item.category ?? undefined}
                      ctaLabel={
                        item.type === "video-course"
                          ? t("courses.viewVideo")
                          : t("detail.buyNow")
                      }
                      ctaIcon={item.type === "video-course" ? "play" : "cart"}
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
          </div>
        </div>
      </div>
    </div>
  );
}

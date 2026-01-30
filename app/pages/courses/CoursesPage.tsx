import { useEffect, useMemo, useState } from "react";
import { Play, Eye, Calendar, Star } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { CoursesFilter } from "../../components/filters/CoursesFilter";
import { Pagination } from "../../components/Pagination";
import { Search } from "../../components/Search";

interface CoursesPageProps {
  onNavigate: (page: string) => void;
  onOpenVideoDetail?: (slug: string) => void;
}

export function CoursesPage({ onOpenVideoDetail }: CoursesPageProps) {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<"all" | "free" | "paid">(
    "all"
  );
  const [sortBy, setSortBy] = useState<
    "newest" | "popular" | "rating" | "price-low" | "price-high"
  >("popular");
  const [viewMode, setViewMode] = useState<
    "all" | "newest" | "popular" | "rating"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  useEffect(() => {
    const load = async () => {
      setCoursesLoading(true);
      try {
        const res = await fetch("/api/video-courses", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load video courses");
        }
        setCourses(Array.isArray(data.courses) ? data.courses : []);
        setCoursesError(null);
      } catch (err) {
        setCourses([]);
        setCoursesError(err instanceof Error ? err.message : String(err));
      } finally {
        setCoursesLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth < 768 ? 3 : 6);
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const normalize = (value: string) => value.trim().toLowerCase();

  const categories = useMemo(() => {
    const list = courses
      .map((course) => String(course.category ?? "").trim())
      .filter((value) => value);
    const unique = Array.from(new Set(list));
    return unique.map((name) => ({ id: normalize(name), name }));
  }, [courses]);

  const tags = useMemo(() => {
    const collected: { id: string; label: string }[] = [];
    courses.forEach((course) => {
      const raw = typeof course.tags === "string" ? course.tags : "";
      raw
        .split(",")
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag)
        .forEach((tag: string) =>
          collected.push({ id: normalize(tag), label: tag })
        );
    });
    const map = new Map<string, string>();
    collected.forEach((tag) => {
      if (!map.has(tag.id)) map.set(tag.id, tag.label);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [courses]);

  const levels = [
    { id: "all levels", label: t("filters.levelAll") },
    { id: "beginner", label: t("filters.levelBeginner") },
    { id: "advanced", label: t("filters.levelAdvanced") },
    { id: "pro", label: t("filters.levelPro") },
  ];

  const priceFilters: Array<{ id: "all" | "free" | "paid"; label: string }> = [
    { id: "all", label: t("filters.priceAll") },
    { id: "free", label: t("filters.priceFree") },
    { id: "paid", label: t("filters.pricePaid") },
  ];

  const sortOptions: Array<{
    id: "newest" | "popular" | "rating" | "price-low" | "price-high" | "all";
    label: string;
  }> = [
    { id: "newest", label: t("courses.newReleases") },
    { id: "popular", label: t("filters.mostPopular") },
    {
      id: "rating",
      label: t("filters.highestRated"),
    },
    {
      id: "price-low",
      label: t("filters.priceLowHigh"),
    },
    {
      id: "price-high",
      label: t("filters.priceHighLow"),
    },
    { id: "all", label: t("filters.allVideos") },
  ];

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = courses.filter((course) => {
      const courseCategory = normalize(String(course.category ?? ""));
      const courseTags =
        typeof course.tags === "string"
          ? course.tags
              .split(",")
              .map((tag: string) => normalize(tag))
              .filter((tag: string) => tag)
          : [];
      const courseLevel = normalize(String(course.level ?? ""));

      if (selectedCategories.length && !selectedCategories.includes(courseCategory)) {
        return false;
      }
      if (selectedTags.length && !selectedTags.some((tag) => courseTags.includes(tag))) {
        return false;
      }
      if (
        selectedLevels.length &&
        !selectedLevels.includes(courseLevel) &&
        !selectedLevels.includes("all levels")
      ) {
        return false;
      }
      const minPrice = Number(course.min_price ?? 0);
      if (selectedPrice === "free" && minPrice !== 0) return false;
      if (selectedPrice === "paid" && minPrice === 0) return false;
      if (term) {
        const hay = `${course.title ?? ""} ${course.description ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      const aPrice = Number(a.min_price ?? 0);
      const bPrice = Number(b.min_price ?? 0);
      const aRating = Number(a.rating ?? 0);
      const bRating = Number(b.rating ?? 0);
      const aStudents = Number(a.students_count ?? 0);
      const bStudents = Number(b.students_count ?? 0);
      if (sortBy === "popular") return bStudents - aStudents;
      if (sortBy === "rating") return bRating - aRating;
      if (sortBy === "price-low") return aPrice - bPrice;
      if (sortBy === "price-high") return bPrice - aPrice;
      return (
        new Date(String(b.upload_date ?? "")).getTime() -
        new Date(String(a.upload_date ?? "")).getTime()
      );
    });

    return result;
  }, [
    searchTerm,
    selectedCategories,
    selectedTags,
    selectedLevels,
    selectedPrice,
    sortBy,
    courses,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCategories,
    selectedTags,
    selectedLevels,
    selectedPrice,
    sortBy,
    viewMode,
  ]);

  const sortCourses = (items: any[], mode: typeof sortBy) => {
    return [...items].sort((a, b) => {
      const aPrice = Number(a.min_price ?? 0);
      const bPrice = Number(b.min_price ?? 0);
      const aRating = Number(a.rating ?? 0);
      const bRating = Number(b.rating ?? 0);
      const aStudents = Number(a.students_count ?? 0);
      const bStudents = Number(b.students_count ?? 0);
      if (mode === "popular") return bStudents - aStudents;
      if (mode === "rating") return bRating - aRating;
      if (mode === "price-low") return aPrice - bPrice;
      if (mode === "price-high") return bPrice - aPrice;
      return (
        new Date(String(b.upload_date ?? "")).getTime() -
        new Date(String(a.upload_date ?? "")).getTime()
      );
    });
  };

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / itemsPerPage));
  const pagedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCourses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCourses, currentPage, itemsPerPage]);

  const sectionCourses = useMemo(() => {
    if (viewMode === "newest") return sortCourses(filteredCourses, "newest");
    if (viewMode === "popular") return sortCourses(filteredCourses, "popular");
    if (viewMode === "rating") return sortCourses(filteredCourses, "rating");
    return filteredCourses;
  }, [filteredCourses, viewMode]);

  const sectionTotalPages = Math.max(
    1,
    Math.ceil(sectionCourses.length / itemsPerPage)
  );
  const pagedSectionCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sectionCourses.slice(startIndex, startIndex + itemsPerPage);
  }, [sectionCourses, currentPage, itemsPerPage]);

  const newestVideos = useMemo(() => {
    return [...filteredCourses]
      .sort(
        (a, b) =>
          new Date(String(b.upload_date ?? "")).getTime() -
          new Date(String(a.upload_date ?? "")).getTime()
      )
      .slice(0, 3);
  }, [filteredCourses]);

  const popularVideos = useMemo(() => {
    return [...filteredCourses]
      .sort((a, b) => Number(b.students_count ?? 0) - Number(a.students_count ?? 0))
      .slice(0, 3);
  }, [filteredCourses]);

  const toggleSelection = (
    value: string,
    selected: string[],
    setSelected: (next: string[]) => void
  ) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((item) => item !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const handleSortClick = (
    optionId: "newest" | "popular" | "rating" | "price-low" | "price-high" | "all"
  ) => {
    if (optionId === "all") {
      setViewMode("all");
      return;
    }
    if (optionId === "newest") {
      setSortBy("newest");
      setViewMode("newest");
      return;
    }
    if (optionId === "popular") {
      setSortBy("popular");
      setViewMode("popular");
      return;
    }
    if (optionId === "rating") {
      setSortBy("rating");
      setViewMode("rating");
      return;
    }
    setSortBy(optionId);
    setViewMode("all");
  };

  const handleSelectCategory = (value: string) => {
    if (!value) {
      setSelectedCategories([]);
      return;
    }
    toggleSelection(value, selectedCategories, setSelectedCategories);
  };

  const handleSelectTag = (value: string) => {
    toggleSelection(value, selectedTags, setSelectedTags);
  };

  const handleSelectLevel = (value: string) => {
    toggleSelection(value, selectedLevels, setSelectedLevels);
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSelectedTags([]);
    setSelectedLevels([]);
    setSelectedPrice("all");
    setSortBy("popular");
    setViewMode("all");
    setSearchTerm("");
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };

  const openVideo = (video: { slug?: string; id: string }) => {
    const targetSlug = video.slug ?? video.id;
    onOpenVideoDetail?.(targetSlug);
  };

  const renderVideoCard = (video: any) => (
    <div
      key={video.id}
      onClick={() => openVideo({ slug: video.slug, id: String(video.id) })}
      className="bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer overflow-hidden dark:bg-gray-900 dark:border-gray-800"
    >
      <div className="relative">
        <img
          src={video.thumbnail_url || "/placeholder.png"}
          alt={video.title}
          className="w-full h-44 object-cover"
        />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900 shadow dark:bg-gray-900/90 dark:text-gray-100">
          {video.category || t("labels.video")}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2 dark:text-gray-100">
            {video.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-300">
            <Star className="w-3 h-3 fill-blue-600" />
            <span>
              {Number(video.rating ?? 0).toFixed(1)} ({Number(video.rating_count ?? 0)})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>
              {formatViews(Number(video.students_count ?? 0))} {t("labels.students")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{Number(video.lesson_count ?? 0)} {t("labels.lessons")}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-600 font-semibold dark:text-blue-300">
            {Number(video.min_price ?? 0) === 0
              ? t("labels.free")
              : `$${Number(video.min_price ?? 0).toFixed(2)}`}
          </span>
          <div className="flex items-center gap-2">
            <img
              src={video.author_avatar_url || "/avatar-default.png"}
              alt={video.author_name || t("labels.instructor")}
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {video.author_name || t("labels.instructor")}
            </span>
          </div>
        </div>

        <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold py-2.5 flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />
          {t("courses.viewVideo")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="video-blog-page min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {t("courses.videoBlogTitle")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("courses.videoBlogSubtitle")}
            </p>
          </div>
          <Search
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("courses.searchVideos")}
            className="w-full md:max-w-sm"
            inputClassName="bg-gray-50 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-800"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <CoursesFilter
            categories={categories}
            tags={tags}
            levels={levels}
            priceFilters={priceFilters}
            sortOptions={sortOptions}
            selectedCategories={selectedCategories}
            selectedTags={selectedTags}
            selectedLevels={selectedLevels}
            selectedPrice={selectedPrice}
            sortBy={sortBy}
            viewMode={viewMode}
            onSelectCategory={handleSelectCategory}
            onSelectTag={handleSelectTag}
            onSelectLevel={handleSelectLevel}
            onSelectPrice={setSelectedPrice}
            onSortClick={handleSortClick}
            onClearFilters={handleClearFilters}
          />

          {/* ✅ RIGHT SIDE WRAPPED + STICKY */}
          <section className="md:col-span-8 lg:col-span-9 min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-10 lg:sticky lg:top-24 dark:border-gray-800 dark:bg-gray-900">
              {viewMode === "all" ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {t("courses.newReleases")}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("courses.latestUploads")}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {newestVideos.map(renderVideoCard)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {t("courses.popularVideos")}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("courses.mostWatched")}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {popularVideos.map(renderVideoCard)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {t("filters.allVideos")}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {filteredCourses.length}{" "}
                        {t("courses.videosAvailable")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {coursesLoading ? (
                        <div className="col-span-full text-sm text-gray-500 dark:text-gray-400">
                          {t("common.loading")}
                        </div>
                      ) : coursesError ? (
                        <div className="col-span-full text-sm text-red-600 dark:text-red-400">
                          {coursesError}
                        </div>
                      ) : (
                        pagedCourses.map(renderVideoCard)
                      )}
                    </div>

                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {viewMode === "newest"
                        ? t("courses.newReleases")
                        : viewMode === "popular"
                        ? t("courses.popularVideos")
                        : t("filters.highestRated")}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {sectionCourses.length}{" "}
                      {t("courses.videosAvailable")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {coursesLoading ? (
                      <div className="col-span-full text-sm text-gray-500 dark:text-gray-400">
                        {t("common.loading")}
                      </div>
                    ) : coursesError ? (
                      <div className="col-span-full text-sm text-red-600 dark:text-red-400">
                        {coursesError}
                      </div>
                    ) : (
                      pagedSectionCourses.map(renderVideoCard)
                    )}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={sectionTotalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

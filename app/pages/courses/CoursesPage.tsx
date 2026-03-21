import { useEffect, useMemo, useState } from "react";
import { Play, Eye, Calendar, Star, ArrowRight } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { CoursesFilter } from "../../components/filters/CoursesFilter";
import { DesktopGridToggle } from "../../components/DesktopGridToggle";
import { Pagination } from "../../components/Pagination";
import { Search } from "../../components/Search";
import CoursesVideoGrid from "./components/CoursesVideoGrid";
import { FavoriteToggleButton } from "../../components/FavoriteToggleButton";

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
  const [screenWidth, setScreenWidth] = useState(1280);
  const [mobileGridColumns, setMobileGridColumns] = useState<1 | 2>(2);
  const [tabletGridColumns, setTabletGridColumns] = useState<2 | 3>(3);
  const [desktopGridColumns, setDesktopGridColumns] = useState<4 | 5>(4);

  useEffect(() => {
    const load = async () => {
      setCoursesLoading(true);
      try {
        const res = await fetch("/api/video-courses", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || t("courses.loadError"));
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
  }, [t]);

  useEffect(() => {
    const updateScreenWidth = () => setScreenWidth(window.innerWidth);
    updateScreenWidth();
    window.addEventListener("resize", updateScreenWidth);
    return () => window.removeEventListener("resize", updateScreenWidth);
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

  const isPhone = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const courseGridClassName = isPhone
    ? mobileGridColumns === 2
      ? "grid grid-cols-2 gap-4"
      : "grid grid-cols-1 gap-4"
    : isTablet
    ? tabletGridColumns === 3
      ? "grid grid-cols-2 md:grid-cols-3 gap-6"
      : "grid grid-cols-2 gap-6"
    : `grid grid-cols-1 md:grid-cols-2 gap-6 ${
        desktopGridColumns === 5 ? "lg:grid-cols-4 xl:grid-cols-5" : "lg:grid-cols-4"
      }`;
  const featuredGridCount = isPhone
    ? mobileGridColumns === 2
      ? 4
      : 3
    : isTablet
    ? tabletGridColumns === 3
      ? 6
      : 4
    : desktopGridColumns === 5
    ? 5
    : 4;

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
      .slice(0, featuredGridCount);
  }, [featuredGridCount, filteredCourses]);

  const popularVideos = useMemo(() => {
    return [...filteredCourses]
      .sort((a, b) => Number(b.students_count ?? 0) - Number(a.students_count ?? 0))
      .slice(0, featuredGridCount);
  }, [featuredGridCount, filteredCourses]);

  const featuredCourse = useMemo(() => {
    return newestVideos[0] ?? popularVideos[0] ?? filteredCourses[0] ?? null;
  }, [filteredCourses, newestVideos, popularVideos]);

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
    setSelectedCategories((prev) =>
      prev.length === 1 && prev[0] === value ? [] : [value]
    );
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
        <FavoriteToggleButton
          item={{
            type: "video-course",
            title: String(video.title ?? ""),
            slug: String(video.slug ?? video.id),
            image: video.thumbnail_url || null,
            price: Number(video.min_price ?? 0),
            category: video.category || t("labels.video"),
            href: `/courses/${encodeURIComponent(String(video.slug ?? video.id))}`,
            label: t("nav.videoCourses"),
          }}
        />
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
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:mb-6 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {t("courses.videoBlogTitle")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("courses.videoBlogSubtitle")}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-[560px] lg:items-end">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Search
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t("courses.searchVideos")}
                className="w-full sm:flex-1"
                inputClassName="bg-gray-50 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-800"
              />
              <DesktopGridToggle
                value={tabletGridColumns}
                onChange={(value) => setTabletGridColumns(value as 2 | 3)}
                options={[2, 3]}
                visibilityClassName="hidden md:flex lg:hidden"
              />
              <DesktopGridToggle
                value={desktopGridColumns}
                onChange={(value) => setDesktopGridColumns(value as 4 | 5)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
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
          <DesktopGridToggle
            value={mobileGridColumns}
            onChange={(value) => setMobileGridColumns(value as 1 | 2)}
            options={[1, 2]}
            visibilityClassName="flex md:hidden"
          />

          {featuredCourse ? (
            <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.35),_transparent_34%),linear-gradient(135deg,_#1d0b4f_0%,_#2f0f7f_35%,_#14062d_100%)] px-5 py-6 text-white shadow-[0_24px_60px_rgba(37,0,99,0.28)] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
              <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:24px_24px]" />
              <div className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
              <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1.25fr)_380px] lg:gap-10">
                <div className="max-w-2xl">
                  <div className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-200/90">
                    {t("courses.videoBlogTitle")}
                  </div>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-6xl">
                    {featuredCourse.title || t("courses.popularVideos")}
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-violet-100/85 sm:text-base">
                    {featuredCourse.description || t("courses.videoBlogSubtitle")}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-violet-100/90">
                    <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                      {formatViews(Number(featuredCourse.students_count ?? 0))} {t("labels.students")}
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                      {Number(featuredCourse.lesson_count ?? 0)} {t("labels.lessons")}
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                      {Number(featuredCourse.rating ?? 0).toFixed(1)} {t("courseDetail.rating")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openVideo({ slug: featuredCourse.slug, id: String(featuredCourse.id) })}
                    className="mt-7 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-yellow-300"
                  >
                    {t("courses.viewVideo")}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => openVideo({ slug: featuredCourse.slug, id: String(featuredCourse.id) })}
                  className="group relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[2rem] bg-white text-left text-slate-900 shadow-[0_18px_50px_rgba(10,8,37,0.35)] transition hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                    <img
                      src={featuredCourse.thumbnail_url || "/placeholder.png"}
                      alt={featuredCourse.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {featuredCourse.category || t("labels.video")}
                    </div>
                  </div>
                  <div className="space-y-2 px-5 py-5">
                    <div className="line-clamp-2 text-2xl font-black tracking-tight text-slate-900">
                      {featuredCourse.title}
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{featuredCourse.author_name || t("labels.instructor")}</span>
                      <span className="font-semibold text-blue-600">
                        {Number(featuredCourse.min_price ?? 0) === 0
                          ? t("labels.free")
                          : `$${Number(featuredCourse.min_price ?? 0).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </section>
          ) : null}

          <section className="min-w-0">
            <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5 md:space-y-8 lg:space-y-10 dark:border-gray-800 dark:bg-gray-900">
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
                    <div className={courseGridClassName}>
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
                    <div className={courseGridClassName}>
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

                    <CoursesVideoGrid
                      loading={coursesLoading}
                      error={coursesError}
                      loadingLabel={t("common.loading")}
                      items={pagedCourses}
                      renderItem={renderVideoCard}
                      className={courseGridClassName}
                    />

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

                  <CoursesVideoGrid
                    loading={coursesLoading}
                    error={coursesError}
                    loadingLabel={t("common.loading")}
                    items={pagedSectionCourses}
                    renderItem={renderVideoCard}
                    className={courseGridClassName}
                  />

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

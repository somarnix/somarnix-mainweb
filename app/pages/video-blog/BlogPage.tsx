import { useMemo, useState } from "react";
import { Search, Play, Eye, Calendar, Star, Filter } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { videoCourses } from "./videoData";

interface BlogPageProps {
  onNavigate: (page: string) => void;
  onOpenVideoDetail?: (slug: string) => void;
}

export function BlogPage({ onNavigate, onOpenVideoDetail }: BlogPageProps) {
  const { language } = useLanguage();
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

  const categories = [
    { id: "3d animation", name: "3D Animation" },
    { id: "art & design", name: "Art & Design" },
    { id: "data science", name: "Data Science" },
    { id: "finance account", name: "Finance Account" },
    { id: "health and fitness", name: "Health and Fitness" },
    { id: "marketing", name: "Marketing" },
    { id: "mobile application", name: "Mobile Application" },
    { id: "seo", name: "SEO" },
    { id: "web development", name: "Web Development" },
  ];

  const tags = [
    "accounting",
    "adobe photoshop",
    "adobe xd",
    "app development",
    "graphic design",
    "health & fitness",
    "illustrations",
    "javascript",
    "php",
    "ui design",
    "ux design",
  ];

  const levels = ["all levels", "beginner", "intermediate", "expert"];

  const priceFilters: Array<{ id: "all" | "free" | "paid"; label: string }> = [
    { id: "all", label: "All" },
    { id: "free", label: "Free" },
    { id: "paid", label: "Paid" },
  ];

  const sortOptions: Array<{
    id: "popular" | "rating" | "price-low" | "price-high";
    label: string;
  }> = [
    { id: "popular", label: language === "km" ? "ពេញនិយម" : "Most Popular" },
    {
      id: "rating",
      label: language === "km" ? "ពេញចិត្តខ្ពស់" : "Highest Rated",
    },
    {
      id: "price-low",
      label: language === "km" ? "តម្លៃទាបទៅខ្ពស់" : "Price: Low to High",
    },
    {
      id: "price-high",
      label: language === "km" ? "តម្លៃខ្ពស់ទៅទាប" : "Price: High to Low",
    },
  ];

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = videoCourses.filter((course) => {
      if (
        selectedCategories.length &&
        !selectedCategories.includes(course.category)
      ) {
        return false;
      }
      if (
        selectedTags.length &&
        !selectedTags.some((tag) => course.tags.includes(tag))
      ) {
        return false;
      }
      if (
        selectedLevels.length &&
        !selectedLevels.includes(course.level) &&
        !selectedLevels.includes("all levels")
      ) {
        return false;
      }
      if (selectedPrice === "free" && course.price !== 0) return false;
      if (selectedPrice === "paid" && course.price === 0) return false;
      if (term) {
        const hay = `${course.title} ${course.description}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "popular") return b.views - a.views;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return (
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
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
  ]);

  const newestVideos = useMemo(
    () =>
      [...videoCourses]
        .sort(
          (a, b) =>
            new Date(b.uploadDate).getTime() -
            new Date(a.uploadDate).getTime()
        )
        .slice(0, 3),
    []
  );

  const popularVideos = useMemo(
    () => [...videoCourses].sort((a, b) => b.views - a.views).slice(0, 3),
    []
  );

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

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };

  const openVideo = (video: { slug?: string; id: string }) => {
    const targetSlug = video.slug ?? video.id;
    onOpenVideoDetail?.(targetSlug);
  };

  const renderVideoCard = (video: (typeof videoCourses)[number]) => (
    <div
      key={video.id}
      onClick={() => openVideo(video)}
      className="bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer overflow-hidden"
    >
      <div className="relative">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-44 object-cover"
        />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900 shadow">
          {video.category}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
            {video.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Star className="w-3 h-3 fill-blue-600" />
            <span>
              {video.rating.toFixed(1)} ({video.ratingCount})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{formatViews(video.students)} Students</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{video.lessons} Lessons</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-600 font-semibold">
            {video.price === 0 ? "Free" : `$${video.price.toFixed(2)}`}
          </span>
          <div className="flex items-center gap-2">
            <img
              src={video.authorAvatar}
              alt={video.author}
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="text-xs text-gray-500">{video.author}</span>
          </div>
        </div>

        <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold py-2.5 flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />
          {language === "km" ? "មើលវីដេអូ" : "View Video"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="video-blog-page min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <aside className="md:col-span-4 lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5 space-y-6 h-fit">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={language === "km" ? "ស្វែងរក" : "Search"}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-3/2">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Filter className="w-4 h-4" />
                  {language === "km" ? "តម្រង" : "Filters"}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {language === "km" ? "ប្រភេទ" : "Categories"}
                  </p>
                  <button
                    onClick={() => setSelectedCategories([])}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                      selectedCategories.length === 0
                        ? "bg-blue-50 text-blue-600"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {language === "km" ? "វីដេអូទាំងអស់" : "All Videos"}
                  </button>

                  {categories.map((category) => {
                    const isActive = selectedCategories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() =>
                          toggleSelection(
                            category.id,
                            selectedCategories,
                            setSelectedCategories
                          )
                        }
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                          isActive
                            ? "bg-blue-50 text-blue-600"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {language === "km" ? "តម្រៀបតាម" : "Sort By"}
                  </p>
                  <div className="space-y-2">
                    {sortOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSortBy(option.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
                          sortBy === option.id
                            ? "bg-blue-50 text-blue-600"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {language === "km" ? "ស្លាក" : "Tag"}
                  </p>
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() =>
                            toggleSelection(tag, selectedTags, setSelectedTags)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        {tag}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {language === "km" ? "កម្រិត" : "Level"}
                  </p>
                  <div className="space-y-2">
                    {levels.map((level) => (
                      <label
                        key={level}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLevels.includes(level)}
                          onChange={() =>
                            toggleSelection(
                              level,
                              selectedLevels,
                              setSelectedLevels
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        {level}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {language === "km" ? "តម្លៃ" : "Price"}
                  </p>
                  <div className="space-y-2">
                    {priceFilters.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <input
                          type="radio"
                          name="price"
                          checked={selectedPrice === option.id}
                          onChange={() => setSelectedPrice(option.id)}
                          className="h-4 w-4 border-gray-300 text-blue-600"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedCategories([]);
                setSelectedTags([]);
                setSelectedLevels([]);
                setSelectedPrice("all");
                setSortBy("popular");
                setSearchTerm("");
              }}
              className="w-full rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
            >
              {language === "km" ? "សម្អាតតម្រងទាំងអស់" : "Clear all filters"}
            </button>
          </aside>

          {/* ✅ RIGHT SIDE WRAPPED + STICKY */}
          <section className="md:col-span-8 lg:col-span-9 min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-10 lg:sticky lg:top-24">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {language === "km" ? "វីដេអូថ្មីៗ" : "New Releases"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {language === "km" ? "អាប់ដេតថ្មីៗ" : "Latest uploads"}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {newestVideos.map(renderVideoCard)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {language === "km" ? "វីដេអូពេញនិយម" : "Popular Videos"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {language === "km" ? "មើលច្រើនបំផុត" : "Most watched"}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {popularVideos.map(renderVideoCard)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {language === "km" ? "វីដេអូទាំងអស់" : "All Videos"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {filteredCourses.length}{" "}
                    {language === "km" ? "វីដេអូ" : "videos available"}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredCourses.map(renderVideoCard)}
                </div>

                <div className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-500">
                  <span>Page 1 of 3</span>
                  <div className="flex items-center gap-2">
                    <button className="w-7 h-7 rounded-full border border-gray-200 text-blue-600">
                      1
                    </button>
                    <button className="w-7 h-7 rounded-full border border-gray-200">
                      2
                    </button>
                    <button className="w-7 h-7 rounded-full border border-gray-200">
                      3
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

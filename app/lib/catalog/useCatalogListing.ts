import { useEffect, useMemo, useState } from "react";

export type CatalogSortMode = "popular" | "price-low" | "price-high" | "rating";

type CatalogListingItem = {
  slug: string;
  min_price: number | null;
  stock_qty: number | null;
  is_unlimited_stock: 0 | 1 | null;
  students: number;
  rating: number;
};

export function useCatalogListing<T extends CatalogListingItem>({
  items,
  allSlug,
  allLabel,
  mobileGridColumns = 2,
  tabletGridColumns = 3,
  desktopGridColumns = 4,
}: {
  items: T[];
  allSlug: string;
  allLabel: string;
  mobileGridColumns?: 1 | 2;
  tabletGridColumns?: 2 | 3;
  desktopGridColumns?: 4 | 5;
}) {
  const [selectedSlug, setSelectedSlug] = useState(allSlug);
  const [slugQuery, setSlugQuery] = useState("");
  const [slugLimit, setSlugLimit] = useState(10);
  const [sortBy, setSortBy] = useState<CatalogSortMode>("popular");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

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

  const normalizedSlugQuery = useMemo(() => slugQuery.trim().toLowerCase(), [slugQuery]);

  const filteredItems = useMemo(
    () => (selectedSlug === allSlug ? items : items.filter((item) => item.slug === selectedSlug)),
    [allSlug, items, selectedSlug]
  );

  const searchedItems = useMemo(
    () =>
      normalizedSlugQuery
        ? filteredItems.filter((item) => item.slug.toLowerCase().includes(normalizedSlugQuery))
        : filteredItems,
    [filteredItems, normalizedSlugQuery]
  );

  const sortedItems = useMemo(
    () =>
      [...searchedItems].sort((a, b) => {
        const aOut =
          !a.is_unlimited_stock && typeof a.stock_qty === "number" ? a.stock_qty <= 0 : false;
        const bOut =
          !b.is_unlimited_stock && typeof b.stock_qty === "number" ? b.stock_qty <= 0 : false;

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
      }),
    [searchedItems, sortBy]
  );

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
  const visiblePage = Math.min(currentPage, totalPages);
  const pagedItems = sortedItems.slice(
    (visiblePage - 1) * itemsPerPage,
    visiblePage * itemsPerPage
  );

  const allSlugs = useMemo(
    () => Array.from(new Set(items.map((item) => item.slug))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const filteredSlugs = useMemo(
    () =>
      normalizedSlugQuery
        ? allSlugs.filter((slug) => slug.toLowerCase().includes(normalizedSlugQuery))
        : allSlugs,
    [allSlugs, normalizedSlugQuery]
  );

  const visibleSlugs = normalizedSlugQuery ? filteredSlugs : filteredSlugs.slice(0, slugLimit);

  const slugOptions = useMemo(
    () => [{ value: allSlug, label: allLabel }, ...visibleSlugs.map((slug) => ({ value: slug, label: slug }))],
    [allLabel, allSlug, visibleSlugs]
  );

  return {
    pagedItems,
    selectedSlug,
    setCurrentPage,
    setSelectedSlug,
    setSlugQuery,
    setSortBy,
    slugOptions,
    slugQuery,
    sortBy,
    sortedItems,
    totalPages,
    visiblePage,
  };
}

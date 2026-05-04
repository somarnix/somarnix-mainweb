export const FAVORITES_STORAGE_KEY = "somarnix-favorites";
export const FAVORITES_CHANGED_EVENT = "somarnix-favorites-change";
export const OPEN_FAVORITES_EVENT = "somarnix-open-favorites";

export type FavoriteItemType =
  | "product"
  | "tool"
  | "program"
  | "ai"
  | "game"
  | "video-course";

export type FavoriteItemInput = {
  type: FavoriteItemType;
  title: string;
  slug: string;
  image: string | null;
  price: number | null;
  category?: string | null;
  href: string;
  label?: string | null;
};

export type FavoriteItem = FavoriteItemInput & {
  id: string;
  createdAt: string;
};

const isBrowser = () => typeof window !== "undefined";

export const buildFavoriteId = (type: FavoriteItemType, slug: string) =>
  `${type}:${slug}`;

const dispatchFavoritesChanged = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
};

export const readFavoriteItems = (): FavoriteItem[] => {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is FavoriteItem => {
      return (
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.type === "string" &&
        typeof item.title === "string" &&
        typeof item.slug === "string" &&
        typeof item.href === "string" &&
        typeof item.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
};

const writeFavoriteItems = (items: FavoriteItem[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  dispatchFavoritesChanged();
};

export const isFavoriteItem = (type: FavoriteItemType, slug: string) => {
  const id = buildFavoriteId(type, slug);
  return readFavoriteItems().some((item) => item.id === id);
};

export const toggleFavoriteItem = (input: FavoriteItemInput) => {
  const items = readFavoriteItems();
  const id = buildFavoriteId(input.type, input.slug);
  const existingIndex = items.findIndex((item) => item.id === id);

  if (existingIndex >= 0) {
    const nextItems = items.filter((item) => item.id !== id);
    writeFavoriteItems(nextItems);
    return { favorited: false, items: nextItems };
  }

  const nextItem: FavoriteItem = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  };
  const nextItems = [nextItem, ...items];
  writeFavoriteItems(nextItems);
  return { favorited: true, items: nextItems };
};

export const removeFavoriteItem = (id: string) => {
  const nextItems = readFavoriteItems().filter((item) => item.id !== id);
  writeFavoriteItems(nextItems);
  return nextItems;
};

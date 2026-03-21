type ProductLike = {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  min_price: number | null;
  min_original_price: number | null;
  category: string;
  type?: string;
  stock_qty: number | null;
  is_unlimited_stock: 0 | 1 | null;
  students: number;
  rating: number;
  posted_by_username?: string | null;
  posted_by_avatar?: string | null;
  telegram_url?: string | null;
};

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function normalizeProductListResponse(input: unknown): ProductLike[] {
  const rawItems =
    Array.isArray(input)
      ? input
      : input &&
          typeof input === "object" &&
          Array.isArray((input as { products?: unknown }).products)
        ? (input as { products: unknown[] }).products
        : [];

  return rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: toNumber(item.id),
      title: String(item.title ?? ""),
      slug: String(item.slug ?? ""),
      image_url:
        item.image_url === null || item.image_url === undefined ? null : String(item.image_url),
      min_price: toNullableNumber(item.min_price),
      min_original_price: toNullableNumber(item.min_original_price),
      category: String(item.category ?? ""),
      type: item.type === null || item.type === undefined ? undefined : String(item.type),
      stock_qty: toNullableNumber(item.stock_qty),
      is_unlimited_stock:
        item.is_unlimited_stock === null || item.is_unlimited_stock === undefined
          ? null
          : (toNumber(item.is_unlimited_stock) > 0 ? 1 : 0),
      students: toNumber(item.students ?? item.buyers_count),
      rating: toNumber(item.rating ?? item.avg_rating),
      posted_by_username:
        item.posted_by_username === null || item.posted_by_username === undefined
          ? null
          : String(item.posted_by_username),
      posted_by_avatar:
        item.posted_by_avatar === null || item.posted_by_avatar === undefined
          ? null
          : String(item.posted_by_avatar),
      telegram_url:
        item.telegram_url === null || item.telegram_url === undefined
          ? null
          : String(item.telegram_url),
    }));
}

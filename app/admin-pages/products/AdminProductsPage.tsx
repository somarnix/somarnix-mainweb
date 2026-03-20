/* eslint-disable @next/next/no-img-element */
// app/admin-pages/products/AdminProductsPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PaginationNext from "@/app/components/PaginationNext";
import { parseErrorMessage } from "@/app/lib/http/parseErrorMessage";

/* ================= TYPES ================= */

type Level = "beginner" | "advanced" | "pro";
type StatusFilter = "all" | "active" | "disabled";
type StockFilter = "all" | "in_stock" | "out_stock" | "unlimited";
type SortMode = "id_asc" | "id_desc" | "newest" | "price_low" | "price_high" | "title";

type Category = { id: number; name: string };

type Product = {
  id: number;
  title: string;
  slug: string;

  category_id?: number | null;
  category_name?: string | null;

  level?: Level | null;

  stock_qty?: number | null;
  is_unlimited_stock?: number | null;

  image_url?: string | null;
  order_fields_json?: string | null;

  min_price?: number | string | null;
  variant_count?: number | null;

  is_active: number;
  created_at?: string | null;
};

type Variant = {
  id: number;
  product_id: number;

  duration_label?: string | null;
  duration_note?: string | null;
  duration_days?: number | null;

  device_label?: string | null;
  device_type?: "any" | "pc" | "phone" | "both" | null;
  device_limit?: number | null;
  is_unlimited_device?: number | null;
  units_per_qty?: number | null;

  original_price?: number | string | null;
  price?: number | string | null;

  khqr?: string | null;
  usdqr?: string | null;

  is_active: number;
  created_at?: string | null;
};

type OrderField = {
  key: string;
  label: string;
  required: boolean;
  placeholder: string;
  type: "text" | "number" | "email" | "tel";
};

/* ================= HELPERS ================= */

function cls(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function formatMoney(v: unknown): string {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return "-";
  return `$${n.toFixed(2)}`;
}

const STATUS_OPTIONS = ["all", "active", "disabled"] as const;
const STOCK_OPTIONS = ["all", "in_stock", "out_stock", "unlimited"] as const;
const SORT_OPTIONS = ["id_asc", "id_desc", "newest", "price_low", "price_high", "title"] as const;

function isStatusFilter(v: string): v is StatusFilter {
  return (STATUS_OPTIONS as readonly string[]).includes(v);
}
function isStockFilter(v: string): v is StockFilter {
  return (STOCK_OPTIONS as readonly string[]).includes(v);
}
function isSortMode(v: string): v is SortMode {
  return (SORT_OPTIONS as readonly string[]).includes(v);
}

function toNumberOrNull(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

const DEFAULT_KH_QR = "/paymentQR/khmer_qr.jpg";
const USD_QR_NONE = "none";
const GLOBAL_MAX_DEVICES = 10;

function normalizeOrderFields(raw?: string | null): OrderField[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const r = item as Record<string, unknown>;
        const key = typeof r.key === "string" ? r.key.trim() : "";
        const label = typeof r.label === "string" ? r.label.trim() : "";
        if (!key || !label) return null;
        const required = r.required === true;
        const placeholder = typeof r.placeholder === "string" ? r.placeholder : "";
        const type =
          r.type === "number" || r.type === "email" || r.type === "tel"
            ? (r.type as OrderField["type"])
            : "text";
        return { key, label, required, placeholder, type };
      })
      .filter(Boolean) as OrderField[];
  } catch {
    return [];
  }
}

function serializeOrderFields(fields: OrderField[]): string | null {
  const cleaned = fields
    .map((f) => ({
      key: f.key.trim(),
      label: f.label.trim(),
      required: !!f.required,
      placeholder: f.placeholder?.trim() ?? "",
      type: f.type || "text",
    }))
    .map((f) => ({
      ...f,
      key: f.key || makeOrderKey(f.label),
    }))
    .filter((f) => f.key && f.label);
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

function makeOrderKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isToolsCategoryName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase() === "tools";
}

function normalizeToolSlugInput(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getNormalizedSlugForMode(value: string, toolsMode: boolean): string {
  return toolsMode ? normalizeToolSlugInput(value) : value.trim();
}

/* ================= PAGE ================= */

export default function AdminProductsPage({
  mode = "products",
}: {
  mode?: "products" | "tools";
} = {}) {
  const PAGE_SIZE = 10;
  const isToolsMode = mode === "tools";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= UI STATE ================= */
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [slugFilter, setSlugFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);

  /* ================= CREATE MODAL ================= */
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cSlug, setCSlug] = useState("");
  const [cCategoryId, setCCategoryId] = useState<number>(0);

  /* ================= EDIT MODAL ================= */
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const editModalBodyRef = useRef<HTMLDivElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // edit form fields
  const [fTitle, setFTitle] = useState("");
  const [fSlug, setFSlug] = useState("");
  const [fCategoryId, setFCategoryId] = useState<number>(0);
  const [fLevel, setFLevel] = useState<Level>("beginner");
  const [fStockQty, setFStockQty] = useState<number>(0);
  const [fUnlimitedStock, setFUnlimitedStock] = useState<number>(0);
  const [fImageUrl, setFImageUrl] = useState<string>("");
  const [fOrderFieldsJson, setFOrderFieldsJson] = useState<string>("");
  const [fOrderFields, setFOrderFields] = useState<OrderField[]>([]);

  /* ================= VARIANTS (NEW) ================= */
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsSaving, setVariantsSaving] = useState(false);

  // create variant form (inside edit modal)
  const [vDurationLabel, setVDurationLabel] = useState("");
  const [vDurationNote, setVDurationNote] = useState("");
  const [vAccessType, setVAccessType] = useState<"lifetime" | "months">("months");
  const [vDurationDays, setVDurationDays] = useState<string>("");

  const [vDeviceLabel, setVDeviceLabel] = useState("");
  const [vDeviceType, setVDeviceType] = useState<"any" | "pc" | "phone" | "both">("any");
  const [vDeviceLimit, setVDeviceLimit] = useState<string>("");
  const [vUnlimitedDevice, setVUnlimitedDevice] = useState<number>(0);

  const [vOriginalPrice, setVOriginalPrice] = useState<string>("");
  const [vPrice, setVPrice] = useState<string>("");
  const [vUnitsPerQty, setVUnitsPerQty] = useState<string>("1");
  const [vKhQr, setVKhQr] = useState<string>(DEFAULT_KH_QR);
  const [vUsdQr, setVUsdQr] = useState<string>(USD_QR_NONE);

  /* ================= LOAD CATEGORIES ================= */

  const loadCategories = async () => {
    const res = await fetch("/api/admin/categories", { credentials: "include" });
    const data: unknown = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to load categories"));

    const cats =
      typeof data === "object" && data !== null && "categories" in data
        ? (data as { categories?: unknown }).categories
        : null;

    if (!Array.isArray(cats)) {
      setCategories([]);
      return;
    }

    const mapped: Category[] = cats
      .map((x) => {
        if (typeof x !== "object" || x === null) return null;
        const r = x as Record<string, unknown>;
        const id = Number(r.id);
        const name = r.name;
        if (!Number.isFinite(id) || id <= 0) return null;
        if (typeof name !== "string" || !name.trim()) return null;
        return { id, name };
      })
      .filter(Boolean) as Category[];

    setCategories(mapped);

    if (mapped.length > 0) {
      setCCategoryId((prev) => (prev === 0 ? mapped[0].id : prev));
      setFCategoryId((prev) => (prev === 0 ? mapped[0].id : prev));
    }
  };

  /* ================= LOAD PRODUCTS ================= */

  const sanitizeProducts = (raw: unknown): Product[] => {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((x) => {
        if (typeof x !== "object" || x === null) return null;
        const r = x as Record<string, unknown>;

        const id = Number(r.id);
        if (!Number.isFinite(id) || id <= 0) return null;

        const title = typeof r.title === "string" ? r.title : "";
        const slug = typeof r.slug === "string" ? r.slug : "";

        const category_id = toNumberOrNull(r.category_id);
        const category_name = typeof r.category_name === "string" ? r.category_name : null;

        const level =
          typeof r.level === "string" && ["beginner", "advanced", "pro"].includes(r.level)
            ? (r.level as Level)
            : null;

        const stock_qty = toNumberOrNull(r.stock_qty);
        const is_unlimited_stock = toNumberOrNull(r.is_unlimited_stock);

        const image_url = typeof r.image_url === "string" ? r.image_url : null;
        const order_fields_json =
          typeof r.order_fields_json === "string" ? r.order_fields_json : null;

        const min_price = r.min_price as number | string | null;
        const variant_count = toNumberOrNull(r.variant_count);

        const is_active = Number(r.is_active) ? 1 : 0;
        const created_at = typeof r.created_at === "string" ? r.created_at : null;

        return {
          id,
          title,
          slug,
          category_id,
          category_name,
          level,
          stock_qty,
          is_unlimited_stock,
          image_url,
          order_fields_json,
          min_price,
          variant_count,
          is_active,
          created_at,
        };
      })
      .filter(Boolean) as Product[];
  };

  const loadProducts = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      setError(null);

      try {
        await loadCategories();
      } catch (e) {
        console.error(e);
        setCategories([]);
      }

      const res = await fetch("/api/admin/products", { credentials: "include" });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to load products"));

      const p =
        typeof data === "object" && data !== null && "products" in data
          ? (data as { products?: unknown }).products
          : null;

      setProducts(sanitizeProducts(p));
    } catch (err: unknown) {
      setProducts([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editOpen || !editing || !editModalBodyRef.current) return;
    const scrollEl = editModalBodyRef.current;
    requestAnimationFrame(() => {
      scrollEl.scrollTop = 0;
    });
  }, [editOpen, editing]);

  /* ================= UPLOAD IMAGE ================= */

  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/products/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseErrorMessage(data, "Upload failed"));

    const url =
      typeof data === "object" && data !== null && "url" in data
        ? (data as { url?: unknown }).url
        : null;

    if (typeof url === "string" && url.trim()) return url;
    throw new Error("Upload failed (no url)");
  };

  /* ================= QUICK SAVE FIELD ================= */

  const quickSave = async (productId: number, patch: Record<string, unknown>) => {
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new Error("Invalid product id (UI)");
    }

    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to save"));
  };

  /* ================= CREATE PRODUCT ================= */

  const openCreate = () => {
    if (scopedCategories.length === 0) {
      alert("No categories loaded. Check admin login or database.");
      return;
    }

    setCTitle("");
    setCSlug("");
    setCCategoryId(scopedCategories[0].id);
    setCreating(false);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreating(false);
  };

  const createProduct = async () => {
    try {
      const slug = getNormalizedSlugForMode(cSlug, isToolsMode);
      if (!cTitle.trim()) throw new Error("Title is required");
      if (!slug) throw new Error("Slug is required");
      if (!cCategoryId || cCategoryId <= 0) {
        throw new Error("Invalid category. Please select a category.");
      }

      setCreating(true);

      const payload = {
        title: cTitle.trim(),
        slug,
        category_id: Number(cCategoryId),
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        if (
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
        ) {
          throw new Error((data as { error: string }).error);
        }
        throw new Error("Failed to create product");
      }

      await loadProducts(); // force full refresh
      setSort("newest");    // ensure visible on top
      closeCreate();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unexpected error occurred";
      alert(message);
      setCreating(false);
    }
  };

  /* ================= TOGGLE ACTIVE ================= */

  const toggleActive = async (p: Product) => {
    try {
      const next = p.is_active ? 0 : 1;

      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: next } : x)));

      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: next }),
      });

      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        setProducts((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, is_active: p.is_active } : x))
        );
        throw new Error(parseErrorMessage(data, "Failed to update product"));
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  /* ================= VARIANTS API (NEW) ================= */

  const sanitizeVariants = (raw: unknown): Variant[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((x) => {
        if (typeof x !== "object" || x === null) return null;
        const r = x as Record<string, unknown>;

        const id = Number(r.id);
        const product_id = Number(r.product_id);
        if (!Number.isFinite(id) || id <= 0) return null;
        if (!Number.isFinite(product_id) || product_id <= 0) return null;

        const duration_label = typeof r.duration_label === "string" ? r.duration_label : null;
        const duration_note = typeof r.duration_note === "string" ? r.duration_note : null;
        const duration_days = toNumberOrNull(r.duration_days);

        const device_label = typeof r.device_label === "string" ? r.device_label : null;
        const device_type =
          typeof r.device_type === "string" &&
          ["any", "pc", "phone", "both"].includes(r.device_type)
            ? (r.device_type as Variant["device_type"])
            : null;
        const device_limit = toNumberOrNull(r.device_limit);
        const is_unlimited_device = toNumberOrNull(r.is_unlimited_device);
        const units_per_qty = toNumberOrNull(r.units_per_qty);

        const original_price = r.original_price as number | string | null;
        const price = r.price as number | string | null;
        const khqr = typeof r.khqr === "string" ? r.khqr : null;
        const usdqr = typeof r.usdqr === "string" ? r.usdqr : null;

        const is_active = Number(r.is_active) ? 1 : 0;
        const created_at = typeof r.created_at === "string" ? r.created_at : null;

        return {
          id,
          product_id,
          duration_label,
          duration_note,
          duration_days,
          device_label,
          device_type,
          device_limit,
          is_unlimited_device,
          units_per_qty,
          original_price,
          price,
          khqr,
          usdqr,
          is_active,
          created_at,
        };
      })
      .filter(Boolean) as Variant[];
  };

  const loadVariants = async (productId: number) => {
    if (!Number.isFinite(productId) || productId <= 0) return;
    try {
      setVariantsLoading(true);
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        credentials: "include",
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to load variants"));

      const raw =
        typeof data === "object" && data !== null && "variants" in data
          ? (data as { variants?: unknown }).variants
          : null;

      setVariants(sanitizeVariants(raw));
    } catch (err: unknown) {
      console.error(err);
      setVariants([]);
    } finally {
      setVariantsLoading(false);
    }
  };

  const createVariant = async (productId: number) => {
    // Products require duration; tools can use duration or device label.
    const normalizedDurationLabel =
      vDurationLabel.trim() ||
      (isToolsMode ? (vAccessType === "lifetime" ? "Lifetime" : "Monthly") : "");
    const hasDuration = !!normalizedDurationLabel.trim();
    const hasDevice = isToolsMode && !!vDeviceLabel.trim();
    if (!hasDuration && !hasDevice) {
      alert(
        isToolsMode
          ? "Variant must have duration label or device label."
          : "Variant must have duration label."
      );
      return;
    }

    // price
    const priceNum = Number(vPrice);
    const origNum = Number(vOriginalPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      alert("Invalid price");
      return;
    }
    if (!Number.isFinite(origNum) || origNum < 0) {
      alert("Invalid original price");
      return;
    }

    const dDays = vDurationDays.trim() ? Number(vDurationDays) : null;
    if (!isToolsMode && dDays !== null && (!Number.isFinite(dDays) || dDays < 0)) {
      alert("Invalid duration days");
      return;
    }
    if (
      isToolsMode &&
      vAccessType === "months" &&
      (dDays === null || !Number.isFinite(dDays) || dDays <= 0)
    ) {
      alert("Monthly plan needs duration days > 0");
      return;
    }
    const finalDurationDays = isToolsMode ? (vAccessType === "months" ? dDays : null) : dDays;
    const unitsPerQtyRaw = vUnitsPerQty.trim() ? Number(vUnitsPerQty) : 1;
    if (!isToolsMode && (!Number.isFinite(unitsPerQtyRaw) || unitsPerQtyRaw < 1)) {
      alert("Bundle units must be >= 1");
      return;
    }
    const finalUnitsPerQty = isToolsMode ? 1 : Math.floor(unitsPerQtyRaw);

    const dLimit = vDeviceLimit.trim() ? Number(vDeviceLimit) : null;
    if (!isToolsMode && dLimit !== null && (!Number.isFinite(dLimit) || dLimit < 0)) {
      alert("Invalid device limit");
      return;
    }
    let finalDeviceLimit: number | null = null;
    if (isToolsMode) {
      if (vUnlimitedDevice) {
        finalDeviceLimit = GLOBAL_MAX_DEVICES;
      } else if (
        dLimit === null ||
        !Number.isFinite(dLimit) ||
        dLimit < 1 ||
        dLimit > GLOBAL_MAX_DEVICES
      ) {
        alert(`Device limit must be between 1 and ${GLOBAL_MAX_DEVICES}`);
        return;
      } else {
        finalDeviceLimit = Math.floor(dLimit);
      }
    }

    try {
      setVariantsSaving(true);

      const payload = {
        duration_label: hasDuration ? normalizedDurationLabel : null,
        duration_note: vDurationNote.trim() ? vDurationNote.trim() : null,
        duration_days: finalDurationDays,
        device_label: isToolsMode && hasDevice ? vDeviceLabel.trim() : null,
        device_type: isToolsMode ? vDeviceType : "any",
        device_limit: isToolsMode ? finalDeviceLimit : null,
        is_unlimited_device: isToolsMode && vUnlimitedDevice ? 1 : 0,
        original_price: origNum,
        price: priceNum,
        units_per_qty: finalUnitsPerQty,
        khqr: vKhQr && vKhQr.trim() ? vKhQr : DEFAULT_KH_QR,
        usdqr: vUsdQr && vUsdQr !== USD_QR_NONE ? vUsdQr : USD_QR_NONE,
      };

      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to create variant"));

      // clear form
      setVDurationLabel("");
      setVDurationNote("");
      setVAccessType("months");
      setVDurationDays("");
      setVDeviceLabel("");
      setVDeviceType("any");
      setVDeviceLimit("");
      setVUnlimitedDevice(0);
      setVOriginalPrice("");
      setVPrice("");
      setVUnitsPerQty("1");
      setVKhQr(DEFAULT_KH_QR);
      setVUsdQr(USD_QR_NONE);

      await loadVariants(productId);
      await loadProducts({ silent: true }); // update min_price + variant_count
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setVariantsSaving(false);
    }
  };

  const updateVariant = async (
    variantId: number,
    productId: number,
    patch: Record<string, unknown>
  ) => {
    if (!Number.isFinite(variantId) || variantId <= 0) return;
    if (!Number.isFinite(productId) || productId <= 0) return;

    const res = await fetch(
      `/api/admin/products/${productId}/variants/${variantId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      }
    );

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to update variant"));
  };

  const disableVariant = async (variantId: number, productId: number) => {
    if (!Number.isFinite(variantId) || variantId <= 0) return;
    if (!Number.isFinite(productId) || productId <= 0) return;

    const res = await fetch(
      `/api/admin/products/${productId}/variants/${variantId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to disable variant"));

    await loadVariants(productId);
    await loadProducts({ silent: true });
  };

  /* ================= OPEN / CLOSE EDIT ================= */

  const openEdit = (p: Product) => {
    if (!Number.isFinite(Number(p.id)) || Number(p.id) <= 0) {
      alert("Invalid product id. Refresh the page.");
      return;
    }

    setEditing(p);

    setFTitle(p.title ?? "");
    setFSlug(p.slug ?? "");

    // ✅ FIX: category_id fallback must be a real category id (not 0)
    const safeCategoryId =
      Number.isFinite(Number(p.category_id)) && Number(p.category_id) > 0
        ? Number(p.category_id)
        : scopedCategories.length > 0
          ? scopedCategories[0].id
          : 0;

    setFCategoryId(safeCategoryId);

    setFLevel((p.level as Level) || "beginner");
    setFStockQty(Number.isFinite(Number(p.stock_qty)) ? Number(p.stock_qty) : 0);
    setFUnlimitedStock(p.is_unlimited_stock ? 1 : 0);

    setFImageUrl(typeof p.image_url === "string" ? p.image_url : "");
    const rawOrderFields =
      typeof p.order_fields_json === "string" ? p.order_fields_json : "";
    setFOrderFieldsJson(rawOrderFields);
    setFOrderFields(normalizeOrderFields(rawOrderFields));

    // reset variants UI state
    setVariants([]);
    setVDurationLabel("");
    setVDurationNote("");
    setVAccessType("months");
    setVDurationDays("");
    setVDeviceLabel("");
    setVDeviceType("any");
    setVDeviceLimit("");
    setVUnlimitedDevice(0);
    setVOriginalPrice("");
    setVPrice("");
    setVUnitsPerQty("1");
    setVKhQr(DEFAULT_KH_QR);
    setVUsdQr(USD_QR_NONE);
    setEditingVariant(null);
    setShowVariants(false);

    setEditOpen(true);

    // load variants
    void loadVariants(p.id);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setSaving(false);
    setUploading(false);
    setFOrderFieldsJson("");
    setFOrderFields([]);

    // variants
    setVariants([]);
    setVariantsLoading(false);
    setVariantsSaving(false);
    setVDurationLabel("");
    setVDurationNote("");
    setVAccessType("months");
    setVDurationDays("");
    setVDeviceLabel("");
    setVDeviceType("any");
    setVDeviceLimit("");
    setVUnlimitedDevice(0);
    setVOriginalPrice("");
    setVPrice("");
    setVUnitsPerQty("1");
    setVKhQr(DEFAULT_KH_QR);
    setVUsdQr(USD_QR_NONE);
    setEditingVariant(null);
    setShowVariants(false);
  };

  const copyProduct = async (p: Product) => {
    const ok = confirm(`Copy product "${p.title}"?`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/products/${p.id}/copy`, {
        method: "POST",
        credentials: "include",
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseErrorMessage(data, "Failed to copy product"));
      }
      await loadProducts({ silent: true });
      setSort("newest");
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const deleteProduct = async (p: Product) => {
    const ok = confirm(`Delete product "${p.title}"? This will expire access for users.`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseErrorMessage(data, "Failed to delete product"));
      }
      await loadProducts({ silent: true });
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const saveEdit = async () => {
    if (!editing) return;

    if (!Number.isFinite(Number(editing.id)) || Number(editing.id) <= 0) {
      alert("Invalid product id. Refresh products first.");
      return;
    }

    // ✅ FIX: prevent sending category_id = 0
    if (!Number.isFinite(Number(fCategoryId)) || Number(fCategoryId) <= 0) {
      alert("Please select a category first.");
      return;
    }

    try {
      setSaving(true);
      const slug = getNormalizedSlugForMode(fSlug, isToolsMode);
      if (!slug) throw new Error("Slug is required");

      const payload = {
        title: fTitle.trim(),
        slug,
        category_id: Number(fCategoryId),
        level: fLevel,
        stock_qty: Number(fStockQty),
        is_unlimited_stock: fUnlimitedStock ? 1 : 0,
        image_url: fImageUrl && fImageUrl.trim() ? fImageUrl.trim() : null,
        order_fields_json: serializeOrderFields(fOrderFields),
      };

      const res = await fetch(`/api/admin/products/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to save product"));

      const categoryName = categories.find((c) => c.id === payload.category_id)?.name ?? null;

      setProducts((prev) =>
        prev.map((x) =>
          x.id === editing.id
            ? {
                ...x,
                title: payload.title || x.title,
                slug: payload.slug || x.slug,
                category_id: payload.category_id,
                category_name: categoryName ?? x.category_name ?? null,
                level: payload.level,
                stock_qty: payload.stock_qty,
                is_unlimited_stock: payload.is_unlimited_stock,
                image_url: payload.image_url,
                order_fields_json: payload.order_fields_json,
              }
            : x
        )
      );

      closeEdit();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
      setSaving(false);
    }
  };

  const [showVariants, setShowVariants] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const scopedCategories = useMemo(
    () =>
      categories.filter((c) =>
        isToolsMode ? isToolsCategoryName(c.name) : !isToolsCategoryName(c.name)
      ),
    [categories, isToolsMode]
  );
  const scopedProducts = useMemo(
    () =>
      products.filter((p) =>
        isToolsMode
          ? isToolsCategoryName(p.category_name)
          : !isToolsCategoryName(p.category_name)
      ),
    [products, isToolsMode]
  );
  const slugOptions = useMemo(() => {
    const set = new Set<string>(["all"]);
    for (const p of scopedProducts) {
      const slug = String(p.slug || "").trim();
      if (slug) set.add(slug);
    }
    return Array.from(set);
  }, [scopedProducts]);
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(["all"]);
    for (const p of scopedProducts) {
      const c = String(p.category_name || "").trim().toLowerCase();
      if (c) set.add(c);
    }
    return Array.from(set);
  }, [scopedProducts]);
  /* ================= FILTER + SORT ================= */

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = scopedProducts.slice();

    if (status !== "all") {
      arr = arr.filter((p) => (status === "active" ? !!p.is_active : !p.is_active));
    }

    if (stockFilter !== "all") {
      arr = arr.filter((p) => {
        const isUnlimited = Number(p.is_unlimited_stock) === 1;
        const qty = Number.isFinite(Number(p.stock_qty)) ? Number(p.stock_qty) : 0;
        if (stockFilter === "unlimited") return isUnlimited;
        if (stockFilter === "in_stock") return !isUnlimited && qty > 0;
        if (stockFilter === "out_stock") return !isUnlimited && qty <= 0;
        return true;
      });
    }

    if (slugFilter !== "all") {
      arr = arr.filter((p) => String(p.slug || "") === slugFilter);
    }

    if (categoryFilter !== "all") {
      arr = arr.filter((p) => String(p.category_name || "").trim().toLowerCase() === categoryFilter);
    }

    if (needle) {
      arr = arr.filter((p) => {
        const t = (p.title || "").toLowerCase();
        const s = (p.slug || "").toLowerCase();
        const c = (p.category_name || "").toLowerCase();
        return t.includes(needle) || s.includes(needle) || c.includes(needle);
      });
    }

    const getMinPrice = (p: Product) => {
      const v = p.min_price;
      const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
      return Number.isFinite(n) ? n : Infinity;
    };

    arr.sort((a, b) => {
      if (sort === "id_asc") return a.id - b.id;
      if (sort === "id_desc") return b.id - a.id;
      if (sort === "title") return (a.title || "").localeCompare(b.title || "");
      if (sort === "price_low") return getMinPrice(a) - getMinPrice(b);
      if (sort === "price_high") return getMinPrice(b) - getMinPrice(a);

      const ad = a.created_at ? new Date(a.created_at).getTime() : a.id * 1000;
      const bd = b.created_at ? new Date(b.created_at).getTime() : b.id * 1000;

      if (bd !== ad) return bd - ad;
      return b.id - a.id;

    });

    return arr;
  }, [scopedProducts, q, status, stockFilter, slugFilter, categoryFilter, sort]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [q, status, stockFilter, slugFilter, categoryFilter, sort]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const exportFilteredToExcel = () => {
    const headers = ["ID", "Title", "Slug", "Category", "Price", "Stock", "Status", "Created"];
    const rows = filtered.map((p) => {
      const qty = Number.isFinite(Number(p.stock_qty)) ? Number(p.stock_qty) : 0;
      const stockLabel = p.is_unlimited_stock
        ? "Unlimited stock"
        : qty > 0
          ? `In stock (${qty})`
          : "Out stock";
      return [
        `#${p.id}`,
        p.title || "-",
        p.slug || "-",
        p.category_name || "-",
        p.min_price == null ? "No price" : formatMoney(p.min_price),
        stockLabel,
        p.is_active ? "Active" : "Disabled",
        p.created_at ? new Date(p.created_at).toLocaleString() : "-",
      ];
    });

    const tableHeader = `<tr>${headers
      .map((h) => `<th style="background:#0f766e;color:#fff;font-weight:700;text-align:left;padding:9px 10px;border:1px solid #cbd5e1;">${escapeHtml(h)}</th>`)
      .join("")}</tr>`;
    const tableBody = rows
      .map(
        (row, rowIndex) =>
          `<tr>${row
            .map((cell) => {
              const background = rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc";
              return `<td style="vertical-align:top;text-align:left;padding:8px 10px;border:1px solid #e2e8f0;background:${background};">${escapeHtml(cell)}</td>`;
            })
            .join("")}</tr>`
      )
      .join("");

    const generatedAt = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const filterSummary = [
      `Mode: ${isToolsMode ? "tools" : "products"}`,
      `Status: ${status}`,
      `Stock: ${stockFilter}`,
      `Slug: ${slugFilter}`,
      `Category: ${categoryFilter}`,
      `Sort: ${sort}`,
      `Search: ${q.trim() || "-"}`,
    ].join(" | ");

    const html = `
<html>
  <head><meta charset="utf-8" /></head>
  <body style="background:#ffffff;margin:16px;">
    <div style="font-family:Calibri,Arial,sans-serif;">
      <h2 style="margin:0 0 4px 0;color:#0f172a;">${isToolsMode ? "Tools" : "Products"} Report</h2>
      <p style="margin:0 0 2px 0;color:#475569;font-size:12px;">Generated: ${escapeHtml(generatedAt)}</p>
      <p style="margin:0 0 10px 0;color:#475569;font-size:12px;">${escapeHtml(filterSummary)}</p>
    </div>
    <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12px;min-width:1100px;">
      ${tableHeader}
      ${tableBody}
    </table>
  </body>
</html>`;

    const blob = new Blob([`\uFEFF${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isToolsMode ? "tools" : "products"}_report.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const startEditingVariant = (v: Variant) => {
    setEditingVariant(v);

    setVDurationLabel(v.duration_label ?? "");
    setVDurationNote(v.duration_note ?? "");
    setVAccessType(
      typeof v.duration_days === "number" && v.duration_days > 0 ? "months" : "lifetime"
    );
    setVDurationDays(typeof v.duration_days === "number" ? String(v.duration_days) : "");

    setVDeviceLabel(v.device_label ?? "");
    setVDeviceType(
      v.device_type && ["any", "pc", "phone", "both"].includes(v.device_type)
        ? (v.device_type as "any" | "pc" | "phone" | "both")
        : "any"
    );
    const unlimited = v.is_unlimited_device ? 1 : 0;
    setVUnlimitedDevice(unlimited);
    setVDeviceLimit(
      unlimited
        ? String(GLOBAL_MAX_DEVICES)
        : typeof v.device_limit === "number"
          ? String(v.device_limit)
          : ""
    );

    setVOriginalPrice(v.original_price != null ? String(v.original_price) : "");
    setVPrice(v.price != null ? String(v.price) : "");
    setVUnitsPerQty(
      typeof v.units_per_qty === "number" && Number.isFinite(v.units_per_qty)
        ? String(Math.max(1, Math.floor(v.units_per_qty)))
        : "1"
    );
    setVKhQr(v.khqr ?? DEFAULT_KH_QR);
    setVUsdQr(v.usdqr ?? USD_QR_NONE);
  };

  const toggleVariantStatus = async (v: Variant) => {
    try {
      await updateVariant(v.id, v.product_id, {
        is_active: v.is_active ? 0 : 1,
      });
      await loadVariants(v.product_id);
      await loadProducts({ silent: true });
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const removeVariant = async (v: Variant) => {
    const ok = confirm("Remove this variant?");
    if (!ok) return;
    try {
      await disableVariant(v.id, v.product_id);
      await loadVariants(v.product_id);
      await loadProducts({ silent: true });
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  /* ================= RENDER ================= */

  if (loading) return <div className="p-6 text-gray-500">Loading products...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isToolsMode ? "Tools" : "Products"}</h1>
          <div className="text-sm text-gray-500">
            Filtered: <span className="font-medium text-gray-700">{totalFiltered}</span>
            <span className="mx-1 text-gray-400">/</span>
            Total: <span className="font-medium text-gray-700">{scopedProducts.length}</span>
            {refreshing ? <span className="ml-2">Refreshing…</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title / slug / category…"
            className="w-full rounded-lg border px-3 py-2 text-sm sm:col-span-2 lg:w-[320px]"
          />

          <select
            value={status}
            onChange={(e) => {
              const v = e.target.value;
              if (isStatusFilter(v)) setStatus(v);
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm lg:w-auto"
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="disabled">Disabled only</option>
          </select>

          <select
            value={stockFilter}
            onChange={(e) => {
              const v = e.target.value;
              if (isStockFilter(v)) setStockFilter(v);
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm lg:w-auto"
          >
            <option value="all">Stock: All</option>
            <option value="in_stock">Stock: In stock</option>
            <option value="out_stock">Stock: Out stock</option>
            <option value="unlimited">Stock: Unlimited</option>
          </select>

          <select
            value={slugFilter}
            onChange={(e) => setSlugFilter(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm sm:col-span-2 lg:w-[320px]"
          >
            <option value="all">Slug: All</option>
            {slugOptions
              .filter((s) => s !== "all")
              .map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
          </select>

          {!isToolsMode ? (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm capitalize lg:w-[220px]"
            >
              <option value="all">Category: All</option>
              {categoryOptions
                .filter((c) => c !== "all")
                .map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
            </select>
          ) : null}

          <select
            value={sort}
            onChange={(e) => {
              const v = e.target.value;
              if (isSortMode(v)) setSort(v);
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm lg:w-auto"
          >
            <option value="id_desc">Sort: ID (Newest)</option>
            <option value="id_asc">Sort: ID (Oldest)</option>
            <option value="newest">Sort: Newest</option>
            <option value="title">Sort: Title</option>
            <option value="price_low">Sort: Price (Low)</option>
            <option value="price_high">Sort: Price (High)</option>
          </select>

          <button
            onClick={() => {
              setQ("");
              setStatus("all");
              setStockFilter("all");
              setSlugFilter("all");
              setCategoryFilter("all");
              setSort("newest");
              setPage(1);
              void loadProducts({ silent: true });
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 lg:w-auto"
          >
            Refresh
          </button>

          <button
            onClick={exportFilteredToExcel}
            className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 lg:w-auto"
            disabled={filtered.length === 0}
          >
            Export Excel
          </button>

          <button
            onClick={openCreate}
            className="w-full rounded-lg bg-black px-3 py-2 text-sm text-white hover:opacity-90 sm:col-span-2 lg:w-auto"
          >
            {isToolsMode ? "+ New Tool" : "+ New Product"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b bg-gray-50 text-sm text-gray-600">
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              pagedProducts.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-600">
                    #{p.id}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-gray-50">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="h-full w-full block object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{p.title}</div>
                        <div className="text-xs text-gray-500">{p.slug}</div>
                        {p.level ? (
                          <div className="mt-1 inline-flex text-xs px-2 py-0.5 rounded-full border bg-white">
                            {p.level}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-sm text-gray-700">
                    {p.category_name || <span className="text-gray-400">-</span>}
                    {typeof p.variant_count === "number" ? (
                      <div className="text-xs text-gray-500">Variants: {p.variant_count}</div>
                    ) : null}
                  </td>

                  <td className="p-3 text-sm">
                    <span className={cls("font-medium", p.min_price == null && "text-gray-400")}>
                      {p.min_price == null ? "No price" : formatMoney(p.min_price)}
                    </span>
                  </td>

                  <td className="p-3 text-sm text-gray-700">
                    {p.is_unlimited_stock ? (
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                        Unlimited stock
                      </span>
                    ) : (() => {
                      const qty = Number.isFinite(Number(p.stock_qty)) ? Number(p.stock_qty) : 0;
                      if (qty > 0) {
                        return (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            In stock ({qty})
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Out stock
                        </span>
                      );
                    })()}
                  </td>

                  <td className="p-3 text-sm">
                    {p.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-green-700 bg-green-50 border border-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-red-700 bg-red-50 border border-red-200">
                        Disabled
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          openEdit(p);
                        }}
                        className="text-sm px-3 py-1.5 rounded-lg border hover:bg-white"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleActive(p)}
                        className="text-sm px-3 py-1.5 rounded-lg border hover:bg-white"
                      >
                        {p.is_active ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => copyProduct(p)}
                        className="text-sm px-3 py-1.5 rounded-lg border hover:bg-white"
                      >
                        Copy
                      </button>

                      <button
                        onClick={() => deleteProduct(p)}
                        className="text-sm px-3 py-1.5 rounded-lg border text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        <div className="divide-y md:hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No products found</div>
          ) : (
            pagedProducts.map((p) => (
              <div key={p.id} className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-gray-50">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="block h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900">{p.title}</div>
                        <div className="truncate text-xs text-gray-500">{p.slug}</div>
                      </div>
                      <div className="text-right text-xs text-gray-500">#{p.id}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.level ? (
                        <span className="inline-flex rounded-full border bg-white px-2 py-0.5 text-xs">
                          {p.level}
                        </span>
                      ) : null}
                      {p.is_active ? (
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Category</div>
                    <div className="mt-1 font-medium text-gray-900">
                      {p.category_name || <span className="text-gray-400">-</span>}
                    </div>
                    {typeof p.variant_count === "number" ? (
                      <div className="mt-1 text-xs text-gray-500">Variants: {p.variant_count}</div>
                    ) : null}
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Price</div>
                    <div className={cls("mt-1 font-medium", p.min_price == null && "text-gray-400")}>
                      {p.min_price == null ? "No price" : formatMoney(p.min_price)}
                    </div>
                  </div>
                </div>

                <div>
                  {p.is_unlimited_stock ? (
                    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                      Unlimited stock
                    </span>
                  ) : (() => {
                    const qty = Number.isFinite(Number(p.stock_qty)) ? Number(p.stock_qty) : 0;
                    if (qty > 0) {
                      return (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          In stock ({qty})
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Out stock
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm hover:bg-white sm:flex-none"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(p)}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm hover:bg-white sm:flex-none"
                  >
                    {p.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => copyProduct(p)}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm hover:bg-white sm:flex-none"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => deleteProduct(p)}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50 sm:flex-none"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {filtered.length > PAGE_SIZE ? (
        <PaginationNext
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={totalFiltered}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          enableKeyboardShortcuts
        />
      ) : null}

      {/* ================= CREATE MODAL ================= */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-2 sm:items-center sm:p-4">
          <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-lg max-h-[calc(100vh-2rem)]">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {isToolsMode ? "Create Tool" : "Create Product"}
                </div>
                <div className="text-xs text-gray-500">Title + slug + category</div>
              </div>
              <button
                onClick={closeCreate}
                className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto overscroll-contain p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Title</label>
                <input
                  value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Slug</label>
                <input
                  value={cSlug}
                  onChange={(e) =>
                    setCSlug(isToolsMode ? normalizeToolSlugInput(e.target.value) : e.target.value)
                  }
                  placeholder={isToolsMode ? "promt-ai" : undefined}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
                {isToolsMode ? (
                  <p className="mt-1 text-xs text-gray-500">
                    For tools, slug must match the folder name in <code>app/pages/tools-ai</code>.
                    Example: <code>promt-ai</code>, <code>video-editor</code>, <code>dog</code>.
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Category</label>
                <select
                  value={String(cCategoryId)}
                  onChange={(e) => setCCategoryId(Number(e.target.value))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {scopedCategories.length === 0 ? (
                    <option value="0">No categories (insert product_categories first)</option>
                  ) : (
                    scopedCategories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white p-4">
              <button
                onClick={closeCreate}
                className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-50"
                disabled={creating}
              >
                Cancel
              </button>

              <button
                onClick={createProduct}
                disabled={
                  creating ||
                  scopedCategories.length === 0 ||
                  !cTitle.trim() ||
                  !cSlug.trim() ||
                  cCategoryId <= 0
                }
                className="text-sm px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>

            </div>
          </div>
        </div>
      ) : null}

      {/* ================= EDIT MODAL ================= */}
      {editOpen && editing ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-2 sm:p-4 lg:p-6">
          <div className="flex min-h-full items-start justify-center lg:items-center">
            <div className="my-2 flex w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-lg sm:my-4 lg:my-6 lg:max-h-[calc(100dvh-6rem)]">
            <div className="shrink-0 flex items-center justify-between border-b px-4 py-3 lg:px-5 lg:py-3">
              <div>
                <div className="text-lg font-semibold">Edit Product</div>
                <div className="text-xs text-gray-500">ID: {editing.id}</div>
              </div>
              <button
                onClick={closeEdit}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div
              ref={editModalBodyRef}
              className="modal-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pr-2 sm:p-4 sm:pr-3 md:grid-cols-2 lg:gap-3"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Title</label>
                <input
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Slug</label>
                <input
                  value={fSlug}
                  onChange={(e) =>
                    setFSlug(isToolsMode ? normalizeToolSlugInput(e.target.value) : e.target.value)
                  }
                  placeholder={isToolsMode ? "promt-ai" : undefined}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
                {isToolsMode ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Tool slug is the route link: <code>/tools-ai/{fSlug || "your-tool"}</code>.
                    Keep it the same as the tool folder name.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-xs text-gray-600">Category</label>
                <select
                  value={String(fCategoryId)}
                  onChange={(e) => setFCategoryId(Number(e.target.value))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {scopedCategories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600">Level</label>
                <select
                  value={fLevel}
                  onChange={(e) => setFLevel(e.target.value as Level)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="beginner">beginner</option>
                  <option value="advanced">advanced</option>
                  <option value="pro">pro</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600">Stock Qty</label>
                <input
                  type="number"
                  value={String(fStockQty)}
                  onChange={(e) => setFStockQty(Number(e.target.value))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  disabled={!!fUnlimitedStock}
                  min={0}
                />
              </div>

              <div className="flex items-center gap-2 md:mt-6">
                <input
                  type="checkbox"
                  checked={!!fUnlimitedStock}
                  onChange={(e) => setFUnlimitedStock(e.target.checked ? 1 : 0)}
                />
                <span className="text-sm text-gray-700">Unlimited stock</span>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="text-xs text-gray-600">Order Fields</label>
                  <div className="mt-1 text-xs text-gray-500">
                    Add fields customers must fill before buying. Leave empty if not needed.
                  </div>
                </div>

                <div className="space-y-2">
                  {fOrderFields.length === 0 && (
                    <div className="rounded-lg border border-dashed p-3 text-xs text-gray-500">
                      No order fields added.
                    </div>
                  )}

                  {fOrderFields.map((field, idx) => (
                    <div
                      key={`${field.key}-${idx}`}
                      className="grid grid-cols-1 md:grid-cols-5 gap-2 rounded-lg border p-3"
                    >
                      <input
                        value={field.label}
                        onChange={(e) => {
                          const nextLabel = e.target.value;
                          setFOrderFields((prev) =>
                            prev.map((f, i) =>
                              i === idx
                                ? {
                                    ...f,
                                    label: nextLabel,
                                    key: f.key.trim()
                                      ? f.key
                                      : makeOrderKey(nextLabel),
                                  }
                                : f
                            )
                          );
                        }}
                        placeholder="Label (e.g. User ID)"
                        className="border rounded-md px-2 py-1 text-xs md:col-span-2"
                      />
                      <input
                        value={field.key}
                        onChange={(e) =>
                          setFOrderFields((prev) =>
                            prev.map((f, i) =>
                              i === idx ? { ...f, key: e.target.value } : f
                            )
                          )
                        }
                        placeholder="Key (e.g. user_id)"
                        className="border rounded-md px-2 py-1 text-xs md:col-span-1"
                      />
                      <select
                        value={field.type}
                        onChange={(e) =>
                          setFOrderFields((prev) =>
                            prev.map((f, i) =>
                              i === idx
                                ? { ...f, type: e.target.value as OrderField["type"] }
                                : f
                            )
                          )
                        }
                        className="border rounded-md px-2 py-1 text-xs md:col-span-1"
                      >
                        <option value="text">text</option>
                        <option value="number">number</option>
                        <option value="email">email</option>
                        <option value="tel">tel</option>
                      </select>
                      <div className="flex flex-wrap items-center gap-2 md:col-span-1">
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              setFOrderFields((prev) =>
                                prev.map((f, i) =>
                                  i === idx ? { ...f, required: e.target.checked } : f
                                )
                              )
                            }
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setFOrderFields((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-xs text-red-600 hover:text-red-700 md:ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        value={field.placeholder}
                        onChange={(e) =>
                          setFOrderFields((prev) =>
                            prev.map((f, i) =>
                              i === idx ? { ...f, placeholder: e.target.value } : f
                            )
                          )
                        }
                        placeholder="Placeholder (optional)"
                        className="border rounded-md px-2 py-1 text-xs md:col-span-5"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFOrderFields((prev) => [
                        ...prev,
                        {
                          key: "",
                          label: "",
                          required: false,
                          placeholder: "",
                          type: "text",
                        },
                      ])
                    }
                    className="text-xs px-3 py-1.5 rounded border hover:bg-gray-50"
                  >
                    Add field
                  </button>
                </div>
              </div>

              {/* IMAGE UPLOAD + AUTO SAVE */}
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Product Image</label>

                <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !editing) return;

                      try {
                        setUploading(true);
                        const url = await uploadImage(file);

                        setFImageUrl(url);
                        await quickSave(editing.id, { image_url: url });

                        setProducts((prev) =>
                          prev.map((x) => (x.id === editing.id ? { ...x, image_url: url } : x))
                        );
                      } catch (err: unknown) {
                        alert(getErrorMessage(err));
                      } finally {
                        setUploading(false);
                        e.currentTarget.value = "";
                      }
                    }}
                  />

                  {uploading ? <span className="text-sm text-gray-500">Uploading...</span> : null}
                </div>

                {fImageUrl ? (
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
                    {/* Image preview */}
                    <img
                      src={fImageUrl}
                      alt="Product image preview"
                      width={120}
                      height={120}
                      className="h-28 w-28 shrink-0 rounded-lg border object-cover sm:h-[120px] sm:w-[120px]"
                    />
                    {/* Text UNDER image */}
                    <div className="min-w-0 flex flex-col gap-1 text-xs leading-tight text-gray-500">
                      <span>Image uploaded</span>
                      <span className="text-gray-400">
                        Click “Upload image” to replace
                      </span>
                      {/* Remove button */}
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={async () => {
                          if (!editing) return;
                          try {
                            setUploading(true);
                            setFImageUrl("");
                            await quickSave(editing.id, { image_url: null });
                            setProducts((prev) =>
                              prev.map((x) =>
                                x.id === editing.id ? { ...x, image_url: null } : x
                              )
                            );
                          } catch (err) {
                            alert(getErrorMessage(err));
                          } finally {
                            setUploading(false);
                          }
                        }}
                        className="self-start rounded border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-400">
                    No image uploaded
                  </div>
                )}
              </div>

              {/* ================= VARIANTS SECTION ================= */}
              <div className="md:col-span-2">
                {/* Header toggle */}
                <button
                  type="button"
                  onClick={() => setShowVariants(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-gray-50 hover:bg-gray-100 transition"
                >
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Variants
                      </div>
                      <div className="text-xs text-gray-500">
                        {isToolsMode
                          ? "Manage prices, duration & device options"
                          : "Manage prices and duration"}
                      </div>
                    </div>

                  <div className="text-sm font-medium text-gray-700">
                    {showVariants ? "Hide ▲" : "Manage ▼"}
                  </div>
                </button>

                {/* Collapsible body */}
                {showVariants && (
                  <div className="mt-4 space-y-4">

                    {/* Create Variant */}
                    <div className="rounded-xl border bg-white p-4">
                      <div className="text-sm font-semibold mb-3">
                        Add Variant
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">Duration Label</label>
                          <input
                            value={vDurationLabel}
                            onChange={(e) => setVDurationLabel(e.target.value)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">Duration Note</label>
                          <input
                            value={vDurationNote}
                            onChange={(e) => setVDurationNote(e.target.value)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

                        {isToolsMode ? (
                          <div>
                            <label className="text-xs text-gray-600">Access Type</label>
                            <select
                              value={vAccessType}
                              onChange={(e) => {
                                const next = e.target.value === "lifetime" ? "lifetime" : "months";
                                setVAccessType(next);
                                if (next === "lifetime") setVDurationDays("");
                              }}
                              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                            >
                              <option value="lifetime">Lifetime</option>
                              <option value="months">Monthly (days)</option>
                            </select>
                          </div>
                        ) : null}

                        {!isToolsMode || vAccessType === "months" ? (
                          <div>
                            <label className="text-xs text-gray-600">Duration Days</label>
                            <input
                              type="number"
                              min={1}
                              value={vDurationDays}
                              onChange={(e) => setVDurationDays(e.target.value)}
                              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="text-xs text-gray-600">Duration Days</label>
                            <input
                              value="Lifetime"
                              disabled
                              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500"
                            />
                          </div>
                        )}

                        {isToolsMode ? (
                          <>
                            <div>
                              <label className="text-xs text-gray-600">Device Label</label>
                              <input
                                value={vDeviceLabel}
                                onChange={(e) => setVDeviceLabel(e.target.value)}
                                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-600">Device Type</label>
                              <select
                                value={vDeviceType}
                                onChange={(e) =>
                                  setVDeviceType(
                                    e.target.value as "any" | "pc" | "phone" | "both"
                                  )
                                }
                                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                              >
                                <option value="any">Any device</option>
                                <option value="pc">PC only</option>
                                <option value="phone">Phone only</option>
                                <option value="both">PC + Phone</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs text-gray-600">Device Limit</label>
                              <input
                                type="number"
                                min={1}
                                max={GLOBAL_MAX_DEVICES}
                                value={vDeviceLimit}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setVDeviceLimit(raw);
                                  const limit = Number(raw);
                                  if (Number.isFinite(limit) && limit >= GLOBAL_MAX_DEVICES) {
                                    setVDeviceLimit(String(GLOBAL_MAX_DEVICES));
                                    setVUnlimitedDevice(1);
                                  } else {
                                    setVUnlimitedDevice(0);
                                  }
                                }}
                                disabled={!!vUnlimitedDevice}
                                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="flex items-center gap-2 mt-6">
                              <input
                                type="checkbox"
                                checked={!!vUnlimitedDevice}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setVUnlimitedDevice(checked ? 1 : 0);
                                  if (checked) setVDeviceLimit(String(GLOBAL_MAX_DEVICES));
                                }}
                              />
                              <span className="text-sm">
                                Unlimited device (max {GLOBAL_MAX_DEVICES})
                              </span>
                            </div>
                          </>
                        ) : null}

                        <div>
                          <label className="text-xs text-gray-600">Original Price</label>
                          <input
                            type="number"
                            value={vOriginalPrice}
                            onChange={(e) => setVOriginalPrice(e.target.value)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">Price</label>
                          <input
                            type="number"
                            value={vPrice}
                            onChange={(e) => setVPrice(e.target.value)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

                        {!isToolsMode ? (
                          <div>
                            <label className="text-xs text-gray-600">Bundle Units / Qty</label>
                            <input
                              type="number"
                              min={1}
                              value={vUnitsPerQty}
                              onChange={(e) => setVUnitsPerQty(e.target.value)}
                              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                        ) : null}

                        <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <div className="text-xs font-semibold text-gray-700">Payment QR</div>
                          <p className="mt-2 text-sm text-gray-600">
                            Payment QR is generated automatically at checkout from the order amount.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          className="text-xs px-3 py-1.5 rounded border"
                          onClick={() => {
    setVDurationLabel("");
    setVDurationNote("");
    setVAccessType("months");
    setVDurationDays("");
    setVDeviceLabel("");
    setVDeviceType("any");
    setVDeviceLimit("");
                            setVUnlimitedDevice(0);
    setVOriginalPrice("");
    setVPrice("");
    setVUnitsPerQty("1");
    setVKhQr(DEFAULT_KH_QR);
                            setVUsdQr(USD_QR_NONE);
                          }}
                        >
                          Clear
                        </button>

                      <button
                        type="button"
                        disabled={variantsSaving}
                        onClick={async () => {
                          if (!editing) return;

                          const normalizedDurationLabel =
                            vDurationLabel.trim() ||
                            (isToolsMode ? (vAccessType === "lifetime" ? "Lifetime" : "Monthly") : "");
                          const durationDaysRaw = vDurationDays.trim() ? Number(vDurationDays) : null;
                          if (
                            isToolsMode &&
                            vAccessType === "months" &&
                            (durationDaysRaw === null ||
                              !Number.isFinite(durationDaysRaw) ||
                              durationDaysRaw <= 0)
                          ) {
                            alert("Monthly plan needs duration days > 0");
                            return;
                          }
                          const finalDurationDays = isToolsMode
                            ? (vAccessType === "months" ? durationDaysRaw : null)
                            : durationDaysRaw;
                          const unitsPerQtyRaw = vUnitsPerQty.trim() ? Number(vUnitsPerQty) : 1;
                          if (
                            !isToolsMode &&
                            (!Number.isFinite(unitsPerQtyRaw) || unitsPerQtyRaw < 1)
                          ) {
                            alert("Bundle units must be >= 1");
                            return;
                          }
                          const finalUnitsPerQty = isToolsMode
                            ? 1
                            : Math.floor(unitsPerQtyRaw);
                          const deviceLimitRaw = vDeviceLimit.trim() ? Number(vDeviceLimit) : null;
                          let finalDeviceLimit: number | null = null;
                          if (isToolsMode) {
                            if (vUnlimitedDevice) {
                              finalDeviceLimit = GLOBAL_MAX_DEVICES;
                            } else if (
                              deviceLimitRaw === null ||
                              !Number.isFinite(deviceLimitRaw) ||
                              deviceLimitRaw < 1 ||
                              deviceLimitRaw > GLOBAL_MAX_DEVICES
                            ) {
                              alert(`Device limit must be between 1 and ${GLOBAL_MAX_DEVICES}`);
                              return;
                            } else {
                              finalDeviceLimit = Math.floor(deviceLimitRaw);
                            }
                          }

                          const payload = {
                            duration_label: normalizedDurationLabel || null,
                            duration_note: vDurationNote.trim() || null,
                            duration_days: finalDurationDays,
                            device_label:
                              isToolsMode && vDeviceLabel.trim() ? vDeviceLabel.trim() : null,
                            device_type: isToolsMode ? vDeviceType : "any",
                            device_limit: isToolsMode ? finalDeviceLimit : null,
                            is_unlimited_device: isToolsMode && vUnlimitedDevice ? 1 : 0,
                            original_price: Number(vOriginalPrice),
                            price: Number(vPrice),
                            units_per_qty: finalUnitsPerQty,
                            khqr: vKhQr && vKhQr.trim() ? vKhQr : DEFAULT_KH_QR,
                            usdqr: vUsdQr && vUsdQr !== USD_QR_NONE ? vUsdQr : USD_QR_NONE,
                          };

                          try {
                            setVariantsSaving(true);

                            if (editingVariant) {
                              // 🔥 EDIT EXISTING VARIANT
                              await updateVariant(
                                editingVariant.id,
                                editingVariant.product_id,
                                payload
                              );
                            } else {
                              // ➕ CREATE NEW VARIANT
                              await createVariant(editing.id);
                              return;
                            }

                            // reset
                            setEditingVariant(null);
                            setVDurationLabel("");
                            setVDurationNote("");
                            setVAccessType("months");
                            setVDurationDays("");
                            setVDeviceLabel("");
                            setVDeviceType("any");
                            setVDeviceLimit("");
                            setVUnlimitedDevice(0);
                            setVOriginalPrice("");
                            setVPrice("");
                            setVUnitsPerQty("1");
                            setVKhQr(DEFAULT_KH_QR);
                            setVUsdQr(USD_QR_NONE);

                            await loadVariants(editing.id);
                            await loadProducts({ silent: true });
                          } catch (err) {
                            alert(getErrorMessage(err));
                          } finally {
                            setVariantsSaving(false);
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded bg-black text-white"
                      >
                        {editingVariant ? "Save Changes" : "Add Variant"}
                      </button>

                      </div>
                    </div>

                    {/* Variants List */}
                    <div className="overflow-hidden rounded-xl border bg-white">
                      <div className="hidden overflow-x-auto lg:block">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="p-2 text-left">Variant</th>
                            <th className="p-2 text-left">Price</th>
                            <th className="p-2 text-left">Status</th>
                            <th className="p-2 text-right">Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {variantsLoading ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-gray-500">
                                Loading variants...
                              </td>
                            </tr>
                          ) : variants.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-gray-500">
                                No variants yet
                              </td>
                            </tr>
                          ) : (
                            variants.map((v) => (
                              <tr key={v.id} className="border-b last:border-b-0">
                                <td className="p-2">
                                  <div className="font-medium">
                                    {v.duration_label || (isToolsMode ? v.device_label : null) || `Variant #${v.id}`}
                                  </div>
                                  {isToolsMode ? (
                                    <div className="text-[11px] text-gray-500 mt-1">
                                      {typeof v.duration_days === "number" && v.duration_days > 0
                                        ? `Monthly (${v.duration_days} days)`
                                        : "Lifetime"}{" "}
                                      | Max devices:{" "}
                                      {v.is_unlimited_device
                                        ? `Unlimited (max ${GLOBAL_MAX_DEVICES})`
                                        : Math.max(1, Number(v.device_limit ?? 1))}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-gray-500 mt-1">
                                      Bundle units: {Math.max(1, Number(v.units_per_qty ?? 1))}
                                    </div>
                                  )}
                                </td>

                                <td className="p-2">
                                  <div>{formatMoney(v.price)}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatMoney(v.original_price)}
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-1">
                                    Payment QR is generated automatically at checkout.
                                  </div>
                                </td>

                                <td className="p-2">
                                  {v.is_active ? "Active" : "Disabled"}
                                </td>

<td className="p-2">
  <div className="flex justify-end gap-2">

    {/* EDIT PRICE */}
    <button
      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
      onClick={() => startEditingVariant(v)}
    >
      Edit
    </button>

    {/* ENABLE / DISABLE */}
    <button
      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
      onClick={() => {
        void toggleVariantStatus(v);
      }}
    >
      {v.is_active ? "Disable" : "Enable"}
    </button>

    {/* REMOVE */}
    <button
      className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
      onClick={() => {
        void removeVariant(v);
      }}
    >
      Remove
    </button>

  </div>
</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      </div>

                      <div className="divide-y lg:hidden">
                        {variantsLoading ? (
                          <div className="p-4 text-gray-500">Loading variants...</div>
                        ) : variants.length === 0 ? (
                          <div className="p-4 text-gray-500">No variants yet</div>
                        ) : (
                          variants.map((v) => (
                            <div key={v.id} className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">
                                    {v.duration_label || (isToolsMode ? v.device_label : null) || `Variant #${v.id}`}
                                  </div>
                                  {isToolsMode ? (
                                    <div className="mt-1 text-[11px] text-gray-500">
                                      {typeof v.duration_days === "number" && v.duration_days > 0
                                        ? `Monthly (${v.duration_days} days)`
                                        : "Lifetime"}{" "}
                                      | Max devices:{" "}
                                      {v.is_unlimited_device
                                        ? `Unlimited (max ${GLOBAL_MAX_DEVICES})`
                                        : Math.max(1, Number(v.device_limit ?? 1))}
                                    </div>
                                  ) : (
                                    <div className="mt-1 text-[11px] text-gray-500">
                                      Bundle units: {Math.max(1, Number(v.units_per_qty ?? 1))}
                                    </div>
                                  )}
                                </div>
                                <span className={cls(
                                  "inline-flex rounded-full border px-2 py-0.5 text-xs",
                                  v.is_active
                                    ? "border-green-200 bg-green-50 text-green-700"
                                    : "border-red-200 bg-red-50 text-red-700"
                                )}>
                                  {v.is_active ? "Active" : "Disabled"}
                                </span>
                              </div>

                              <div className="rounded-lg border bg-gray-50 p-3">
                                <div className="font-medium">{formatMoney(v.price)}</div>
                                <div className="text-xs text-gray-500">{formatMoney(v.original_price)}</div>
                                <div className="mt-1 text-[11px] text-gray-500">
                                  Payment QR is generated automatically at checkout.
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="flex-1 rounded border px-3 py-2 text-xs hover:bg-gray-50 sm:flex-none"
                                  onClick={() => startEditingVariant(v)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="flex-1 rounded border px-3 py-2 text-xs hover:bg-gray-50 sm:flex-none"
                                  onClick={() => {
                                    void toggleVariantStatus(v);
                                  }}
                                >
                                  {v.is_active ? "Disable" : "Enable"}
                                </button>
                                <button
                                  className="flex-1 rounded border px-3 py-2 text-xs text-red-600 hover:bg-red-50 sm:flex-none"
                                  onClick={() => {
                                    void removeVariant(v);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
              {/* ================= END VARIANTS ================= */}
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t bg-white px-4 py-3 lg:px-5">
              <button
                onClick={closeEdit}
                className="text-sm px-4 py-2 rounded-lg border hover:bg-gray-50"
                disabled={saving || uploading || variantsSaving}
              >
                Cancel
              </button>

              <button
                onClick={saveEdit}
                className="text-sm px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-50"
                disabled={saving || uploading || variantsSaving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



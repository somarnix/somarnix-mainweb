/* eslint-disable @next/next/no-img-element */
// app/admin-pages/products/AdminProductsPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ================= TYPES ================= */

type Level = "beginner" | "advanced" | "pro";
type StatusFilter = "all" | "active" | "disabled";
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

  original_price?: number | string | null;
  price?: number | string | null;

  khqr?: string | null;
  usdqr?: string | null;

  is_active: number;
  created_at?: string | null;
};

type QrImageOption = {
  filename: string;
  label: string;
  url: string;
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

function parseErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const v = (data as { error?: unknown }).error;
    if (typeof v === "string" && v.trim()) return v;
  }
  return fallback;
}

const STATUS_OPTIONS = ["all", "active", "disabled"] as const;
const SORT_OPTIONS = ["id_asc", "id_desc", "newest", "price_low", "price_high", "title"] as const;

function isStatusFilter(v: string): v is StatusFilter {
  return (STATUS_OPTIONS as readonly string[]).includes(v);
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

/* ================= PAGE ================= */

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= UI STATE ================= */
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");

  /* ================= CREATE MODAL ================= */
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cSlug, setCSlug] = useState("");
  const [cCategoryId, setCCategoryId] = useState<number>(0);

  /* ================= EDIT MODAL ================= */
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
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

  /* ================= VARIANTS (NEW) ================= */
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsSaving, setVariantsSaving] = useState(false);

  // create variant form (inside edit modal)
  const [vDurationLabel, setVDurationLabel] = useState("");
  const [vDurationNote, setVDurationNote] = useState("");
  const [vDurationDays, setVDurationDays] = useState<string>("");

  const [vDeviceLabel, setVDeviceLabel] = useState("");
  const [vDeviceType, setVDeviceType] = useState<"any" | "pc" | "phone" | "both">("any");
  const [vDeviceLimit, setVDeviceLimit] = useState<string>("");
  const [vUnlimitedDevice, setVUnlimitedDevice] = useState<number>(0);

  const [vOriginalPrice, setVOriginalPrice] = useState<string>("");
  const [vPrice, setVPrice] = useState<string>("");
  const [vKhQr, setVKhQr] = useState<string>(DEFAULT_KH_QR);
  const [vUsdQr, setVUsdQr] = useState<string>(USD_QR_NONE);


  const [usdQrOptions, setUsdQrOptions] = useState<QrImageOption[]>([]);
  const [usdQrLoading, setUsdQrLoading] = useState(false);
  const [usdQrUploading, setUsdQrUploading] = useState(false);
  const usdQrUploadInputRef = useRef<HTMLInputElement | null>(null);

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

  const loadUsdQrOptions = async () => {
    try {
      setUsdQrLoading(true);
      const res = await fetch("/api/admin/payment-qr/usd", { credentials: "include" });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to load USD QR images"));

      const filesRaw =
        typeof data === "object" && data !== null && "files" in data
          ? (data as { files?: unknown }).files
          : null;

      const mapped: QrImageOption[] = Array.isArray(filesRaw)
        ? filesRaw
            .map((item) => {
              if (typeof item !== "object" || item === null) return null;
              const r = item as Record<string, unknown>;
              const filename = typeof r.filename === "string" ? r.filename : null;
              const label = typeof r.label === "string" ? r.label : null;
              const url = typeof r.url === "string" ? r.url : null;
              if (!filename || !label || !url) return null;
              return { filename, label, url };
            })
            .filter(Boolean) as QrImageOption[]
        : [];

      setUsdQrOptions(mapped);
    } catch (err) {
      console.error(err);
      setUsdQrOptions([]);
    } finally {
      setUsdQrLoading(false);
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
    void loadUsdQrOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const uploadUsdQrImage = async (file: File) => {
    const suggested = file.name?.split(".")?.[0] ?? "";
    const customName = window
      .prompt("USD QR name (example: 3$). Same name replaces the old image.", suggested)
      ?.trim();

    if (!customName) {
      alert("USD QR name is required.");
      if (usdQrUploadInputRef.current) usdQrUploadInputRef.current.value = "";
      return;
    }

    try {
      setUsdQrUploading(true);
      const form = new FormData();
      form.append("file", file);
      form.append("name", customName);

      const res = await fetch("/api/admin/payment-qr/usd", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to upload USD QR"));

      const url =
        typeof data === "object" && data !== null && "url" in data
          ? (data as { url?: unknown }).url
          : null;

      if (typeof url === "string" && url.trim()) {
        setVUsdQr(url);
      }

      await loadUsdQrOptions();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setUsdQrUploading(false);
      if (usdQrUploadInputRef.current) {
        usdQrUploadInputRef.current.value = "";
      }
    }
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
    if (categories.length === 0) {
      alert("No categories loaded. Check admin login or database.");
      return;
    }

    setCTitle("");
    setCSlug("");
    setCCategoryId(categories[0].id); // ✅ always valid
    setCreating(false);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreating(false);
  };

  const createProduct = async () => {
    try {
      if (!cTitle.trim()) throw new Error("Title is required");
      if (!cSlug.trim()) throw new Error("Slug is required");
      if (!cCategoryId || cCategoryId <= 0) {
        throw new Error("Invalid category. Please select a category.");
      }

      setCreating(true);

      const payload = {
        title: cTitle.trim(),
        slug: cSlug.trim(),
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
    // must have at least duration_label or device_label (API requirement)
    const hasDuration = !!vDurationLabel.trim();
    const hasDevice = !!vDeviceLabel.trim();
    if (!hasDuration && !hasDevice) {
      alert("Variant must have duration label or device label.");
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
    if (dDays !== null && (!Number.isFinite(dDays) || dDays < 0)) {
      alert("Invalid duration days");
      return;
    }

    const dLimit = vDeviceLimit.trim() ? Number(vDeviceLimit) : null;
    if (dLimit !== null && (!Number.isFinite(dLimit) || dLimit < 0)) {
      alert("Invalid device limit");
      return;
    }

    try {
      setVariantsSaving(true);

      const payload = {
        duration_label: hasDuration ? vDurationLabel.trim() : null,
        duration_note: vDurationNote.trim() ? vDurationNote.trim() : null,
        duration_days: dDays,
        device_label: hasDevice ? vDeviceLabel.trim() : null,
        device_type: vDeviceType,
        device_limit: dLimit,
        is_unlimited_device: vUnlimitedDevice ? 1 : 0,
        original_price: origNum,
        price: priceNum,
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
      setVDurationDays("");
      setVDeviceLabel("");
      setVDeviceType("any");
      setVDeviceLimit("");
      setVUnlimitedDevice(0);
      setVOriginalPrice("");
      setVPrice("");
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
        : categories.length > 0
          ? categories[0].id
          : 0;

    setFCategoryId(safeCategoryId);

    setFLevel((p.level as Level) || "beginner");
    setFStockQty(Number.isFinite(Number(p.stock_qty)) ? Number(p.stock_qty) : 0);
    setFUnlimitedStock(p.is_unlimited_stock ? 1 : 0);

    setFImageUrl(typeof p.image_url === "string" ? p.image_url : "");

    // reset variants UI state
    setVariants([]);
    setVDurationLabel("");
    setVDurationNote("");
    setVDurationDays("");
    setVDeviceLabel("");
    setVDeviceLimit("");
    setVUnlimitedDevice(0);
    setVOriginalPrice("");
    setVPrice("");
    setVKhQr(DEFAULT_KH_QR);
    setVUsdQr(USD_QR_NONE);
    setEditingVariant(null);

    setEditOpen(true);

    // load variants
    void loadVariants(p.id);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setSaving(false);
    setUploading(false);

    // variants
    setVariants([]);
    setVariantsLoading(false);
    setVariantsSaving(false);
    setVDurationLabel("");
    setVDurationNote("");
    setVDurationDays("");
    setVDeviceLabel("");
    setVDeviceType("any");
    setVDeviceLimit("");
    setVUnlimitedDevice(0);
    setVOriginalPrice("");
    setVPrice("");
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

      const payload = {
        title: fTitle.trim(),
        slug: fSlug.trim(),
        category_id: Number(fCategoryId),
        level: fLevel,
        stock_qty: Number(fStockQty),
        is_unlimited_stock: fUnlimitedStock ? 1 : 0,
        image_url: fImageUrl && fImageUrl.trim() ? fImageUrl.trim() : null,
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
  /* ================= FILTER + SORT ================= */

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = products.slice();

    if (status !== "all") {
      arr = arr.filter((p) => (status === "active" ? !!p.is_active : !p.is_active));
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
  }, [products, q, status, sort]);

  /* ================= RENDER ================= */

  if (loading) return <div className="p-6 text-gray-500">Loading products...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <div className="text-sm text-gray-500">
            Total: <span className="font-medium text-gray-700">{products.length}</span>
            {refreshing ? <span className="ml-2">Refreshing…</span> : null}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title / slug / category…"
            className="w-full md:w-[320px] border rounded-lg px-3 py-2 text-sm"
          />

          <select
            value={status}
            onChange={(e) => {
              const v = e.target.value;
              if (isStatusFilter(v)) setStatus(v);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="disabled">Disabled only</option>
          </select>

          <select
            value={sort}
            onChange={(e) => {
              const v = e.target.value;
              if (isSortMode(v)) setSort(v);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="id_desc">Sort: ID (Newest)</option>
            <option value="id_asc">Sort: ID (Oldest)</option>
            <option value="newest">Sort: Newest</option>
            <option value="title">Sort: Title</option>
            <option value="price_low">Sort: Price (Low)</option>
            <option value="price_high">Sort: Price (High)</option>
          </select>

          <button
            onClick={() => loadProducts({ silent: true })}
            className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>

          <button
            onClick={openCreate}
            className="rounded-lg px-3 py-2 text-sm bg-black text-black hover:opacity-90"
          >
            + New Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
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
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
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
                      <span className="text-gray-600">Unlimited</span>
                    ) : (
                      <span>{Number.isFinite(Number(p.stock_qty)) ? Number(p.stock_qty) : 0}</span>
                    )}
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
                          console.log("EDIT CLICK:", p);
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

      {/* ================= CREATE MODAL ================= */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Create Product</div>
                <div className="text-xs text-gray-500">Title + slug + category</div>
              </div>
              <button
                onClick={closeCreate}
                className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-auto">
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
                  onChange={(e) => setCSlug(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Category</label>
                <select
                  value={String(cCategoryId)}
                  onChange={(e) => setCCategoryId(Number(e.target.value))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {categories.length === 0 ? (
                    <option value="0">No categories (insert product_categories first)</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2">
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
                  categories.length === 0 ||
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Edit Product</div>
                <div className="text-xs text-gray-500">ID: {editing.id}</div>
              </div>
              <button
                onClick={closeEdit}
                className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-auto">
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
                  onChange={(e) => setFSlug(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">Category</label>
                <select
                  value={String(fCategoryId)}
                  onChange={(e) => setFCategoryId(Number(e.target.value))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
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

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={!!fUnlimitedStock}
                  onChange={(e) => setFUnlimitedStock(e.target.checked ? 1 : 0)}
                />
                <span className="text-sm text-gray-700">Unlimited stock</span>
              </div>

              {/* IMAGE UPLOAD + AUTO SAVE */}
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Product Image</label>

                <div className="mt-1 flex items-center gap-3">
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
                  <div className="mt-2 flex items-start gap-3">
                    {/* Image preview */}
                    <img
                      src={fImageUrl}
                      alt="Product image preview"
                      width={120}
                      height={120}
                      className="rounded-lg border object-cover"
                    />
                    {/* Text UNDER image */}
                    <div className="flex flex-col text-xs text-gray-500 leading-tight">
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
                        className="ml-auto text-xs px-2 py-1 rounded border hover:bg-gray-50"
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
                      Manage prices, duration & device options
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

                        <div>
                          <label className="text-xs text-gray-600">Duration Days</label>
                          <input
                            type="number"
                            value={vDurationDays}
                            onChange={(e) => setVDurationDays(e.target.value)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

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
                            value={vDeviceLimit}
                            onChange={(e) => setVDeviceLimit(e.target.value)}
                            disabled={!!vUnlimitedDevice}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="flex items-center gap-2 mt-6">
                          <input
                            type="checkbox"
                            checked={!!vUnlimitedDevice}
                            onChange={(e) => setVUnlimitedDevice(e.target.checked ? 1 : 0)}
                          />
                          <span className="text-sm">Unlimited device</span>
                        </div>

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

                        <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <div className="text-xs font-semibold text-gray-700 mb-3">
                            QR Payment
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-600 mb-1">KHQR (Auto)</div>
                              <div className="flex items-center gap-3">
                                <img
                                  src={vKhQr || DEFAULT_KH_QR}
                                  alt="KHQR"
                                  className="w-20 h-20 rounded-lg border object-cover bg-white"
                                />
                                <div className="text-xs text-gray-500 break-all">
                                  {vKhQr || DEFAULT_KH_QR}
                                </div>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-2">
                                Always uses the default Khmer QR for every variant.
                              </p>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 mb-1">USD QR</div>
                              <select
                                value={vUsdQr}
                                onChange={(e) => setVUsdQr(e.target.value)}
                                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                              >
                                <option value={USD_QR_NONE}>None</option>
                                {usdQrOptions.map((opt) => (
                                  <option key={opt.filename} value={opt.url}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {usdQrLoading ? (
                                <p className="text-[11px] text-gray-500 mt-1">Loading USD QR list...</p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-gray-100"
                                  onClick={() => usdQrUploadInputRef.current?.click()}
                                  disabled={usdQrUploading}
                                >
                                  {usdQrUploading ? "Uploading..." : "Upload / Replace"}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs px-3 py-1.5 rounded border"
                                  onClick={() => {
                                    void loadUsdQrOptions();
                                  }}
                                  disabled={usdQrLoading}
                                >
                                  Refresh List
                                </button>
                              </div>
                              <input
                                type="file"
                                ref={usdQrUploadInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    void uploadUsdQrImage(file);
                                  }
                                }}
                              />
                              {vUsdQr !== USD_QR_NONE ? (
                                <div className="mt-2 flex items-center gap-3">
                                  <img
                                    src={vUsdQr}
                                    alt="USD QR preview"
                                    className="w-20 h-20 rounded-lg border object-cover bg-white"
                                  />
                                  <div className="text-xs text-gray-500 break-all">{vUsdQr}</div>
                                </div>
                              ) : (
                                <p className="text-[11px] text-gray-500 mt-2">
                                  No USD QR selected for this variant.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          className="text-xs px-3 py-1.5 rounded border"
                          onClick={() => {
    setVDurationLabel("");
    setVDurationNote("");
    setVDurationDays("");
    setVDeviceLabel("");
    setVDeviceType("any");
    setVDeviceLimit("");
                            setVUnlimitedDevice(0);
                            setVOriginalPrice("");
                            setVPrice("");
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

                          // SAME validation you already have
                          const payload = {
                            duration_label: vDurationLabel.trim() || null,
                            duration_note: vDurationNote.trim() || null,
                            duration_days: vDurationDays ? Number(vDurationDays) : null,
                            device_label: vDeviceLabel.trim() || null,
                            device_type: vDeviceType,
                            device_limit: vDeviceLimit ? Number(vDeviceLimit) : null,
                            is_unlimited_device: vUnlimitedDevice ? 1 : 0,
                            original_price: Number(vOriginalPrice),
                            price: Number(vPrice),
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
                            setVDurationDays("");
                            setVDeviceLabel("");
                            setVDeviceType("any");
                            setVDeviceLimit("");
                            setVUnlimitedDevice(0);
                            setVOriginalPrice("");
                            setVPrice("");
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
                    <div className="rounded-xl border bg-white overflow-hidden">
                      <table className="w-full text-sm">
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
                                    {v.duration_label || v.device_label}
                                  </div>
                                </td>

                                <td className="p-2">
                                  <div>{formatMoney(v.price)}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatMoney(v.original_price)}
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-1">
                                    KHQR: {v.khqr || DEFAULT_KH_QR}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    USD QR:{" "}
                                    {v.usdqr && v.usdqr !== USD_QR_NONE ? v.usdqr : "none"}
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
      onClick={() => {
        setEditingVariant(v);

        setVDurationLabel(v.duration_label ?? "");
        setVDurationNote(v.duration_note ?? "");
        setVDurationDays(
          typeof v.duration_days === "number" ? String(v.duration_days) : ""
        );

        setVDeviceLabel(v.device_label ?? "");
        setVDeviceType(
          v.device_type && ["any", "pc", "phone", "both"].includes(v.device_type)
            ? (v.device_type as "any" | "pc" | "phone" | "both")
            : "any"
        );
        setVDeviceLimit(
          typeof v.device_limit === "number" ? String(v.device_limit) : ""
        );
        setVUnlimitedDevice(v.is_unlimited_device ? 1 : 0);

        setVOriginalPrice(
          v.original_price != null ? String(v.original_price) : ""
        );
        setVPrice(v.price != null ? String(v.price) : "");
        setVKhQr(v.khqr ?? DEFAULT_KH_QR);
        setVUsdQr(v.usdqr ?? USD_QR_NONE);
      }}
    >
      Edit
    </button>

    {/* ENABLE / DISABLE */}
    <button
      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
      onClick={async () => {
        try {
          await updateVariant(v.id, v.product_id, {
            is_active: v.is_active ? 0 : 1,
          });
          await loadVariants(v.product_id);
          await loadProducts({ silent: true });
        } catch (err) {
          alert(getErrorMessage(err));
        }
      }}
    >
      {v.is_active ? "Disable" : "Enable"}
    </button>

    {/* REMOVE */}
    <button
      className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
      onClick={async () => {
        const ok = confirm("Remove this variant?");
        if (!ok) return;
        try {
          await disableVariant(v.id, v.product_id);
          await loadVariants(v.product_id);
          await loadProducts({ silent: true });
        } catch (err) {
          alert(getErrorMessage(err));
        }
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

                  </div>
                )}
              </div>
              {/* ================= END VARIANTS ================= */}
            </div>

            <div className="p-4 border-t flex items-center justify-end gap-2">
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
      ) : null}
    </div>
  );
}

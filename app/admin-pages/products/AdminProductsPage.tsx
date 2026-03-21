/* eslint-disable @next/next/no-img-element */
// app/admin-pages/products/AdminProductsPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PaginationNext from "@/app/components/PaginationNext";
import { parseErrorMessage } from "@/app/lib/http/parseErrorMessage";
import {
  EMBEDDED_CUSTOM_HANDLER_OPTIONS,
  generateToolSlug,
  getDefaultLicenseRequired,
  getDefaultPlanType,
  MAX_TOOL_DEVICES,
  TOOL_TEMPLATE_OPTIONS,
  type EmbeddedCustomHandlerKey,
  type ToolLicenseType,
  type ToolPlanType,
  type ToolRunMode,
  type ToolStatus,
  type ToolTemplateType,
} from "@/app/lib/tool-templates";

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
const VALID_EMBEDDED_HANDLER_VALUES = EMBEDDED_CUSTOM_HANDLER_OPTIONS.map((option) => option.value);

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

function getCategoryLabel(name: string | null | undefined): string {
  const normalized = (name ?? "").trim().toLowerCase();
  switch (normalized) {
    case "course":
    case "ai":
      return "AI";
    case "program":
      return "Programs";
    case "game":
      return "Games";
    case "tools":
      return "Tools";
    default:
      return name?.trim() || "-";
  }
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
  const [cDescription, setCDescription] = useState("");
  const [cImageUrl, setCImageUrl] = useState("");
  const [cImageUploading, setCImageUploading] = useState(false);
  const [cTemplateType, setCTemplateType] = useState<ToolTemplateType>("downloadable_exe");
  const [cStatus, setCStatus] = useState<ToolStatus>("draft");
  const [cPlanType, setCPlanType] = useState<ToolPlanType>("one_time");
  const [cPrice, setCPrice] = useState("");
  const [cOriginalPrice, setCOriginalPrice] = useState("");
  const [cDurationDays, setCDurationDays] = useState("");
  const [cMaxDevices, setCMaxDevices] = useState("1");
  const [cLoginRequired, setCLoginRequired] = useState(true);
  const [cPurchaseRequired, setCPurchaseRequired] = useState(true);
  const [cLicenseRequired, setCLicenseRequired] = useState(true);
  const [cToolAssetUrl, setCToolAssetUrl] = useState("");
  const [cToolAssetUploading, setCToolAssetUploading] = useState(false);
  const [cPlatform, setCPlatform] = useState("Windows");
  const [cVersion, setCVersion] = useState("");
  const [cReleaseNotes, setCReleaseNotes] = useState("");
  const [cInstallInstructions, setCInstallInstructions] = useState("");
  const [cOfflineUseAllowed, setCOfflineUseAllowed] = useState(true);
  const [cActivationRequired, setCActivationRequired] = useState(true);
  const [cRunMode, setCRunMode] = useState<ToolRunMode>("external_url");
  const [cLaunchUrl, setCLaunchUrl] = useState("");
  const [cIntroText, setCIntroText] = useState("");
  const [cUsageInstructions, setCUsageInstructions] = useState("");
  const [cAllowGuestPreview, setCAllowGuestPreview] = useState(false);
  const [cLicenseType, setCLicenseType] = useState<ToolLicenseType>("single_device");
  const [cActivationInstructions, setCActivationInstructions] = useState("");
  const [cDeliveryInstructions, setCDeliveryInstructions] = useState("");
  const [cCustomHandlerKey, setCCustomHandlerKey] =
    useState<EmbeddedCustomHandlerKey>("prompt-ai-studio");
  const [cCustomInstructions, setCCustomInstructions] = useState("");
  const [cEnableFileUpload, setCEnableFileUpload] = useState(false);
  const [cEnableDownloadOutput, setCEnableDownloadOutput] = useState(false);
  const [cEnableTabs, setCEnableTabs] = useState(true);

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
    if (!isToolsMode) return;
    setCLicenseRequired(getDefaultLicenseRequired(cTemplateType));
    setCPlanType(getDefaultPlanType(cTemplateType));
    if (cTemplateType === "license_only") {
      setCLoginRequired(true);
      setCPurchaseRequired(true);
      setCActivationRequired(true);
      setCLicenseType("single_device");
    }
    if (cTemplateType === "online_web") {
      setCActivationRequired(false);
    }
    if (cTemplateType === "embedded_custom" && !VALID_EMBEDDED_HANDLER_VALUES.includes(cCustomHandlerKey)) {
      setCCustomHandlerKey("prompt-ai-studio");
    }
  }, [cCustomHandlerKey, cTemplateType, isToolsMode]);

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

  const uploadToolAsset = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/tool-assets/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseErrorMessage(data, "Tool file upload failed"));

    const url =
      typeof data === "object" && data !== null && "url" in data
        ? (data as { url?: unknown }).url
        : null;

    if (typeof url === "string" && url.trim()) return url;
    throw new Error("Tool file upload failed (no url)");
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
    setCDescription("");
    setCImageUrl("");
    setCImageUploading(false);
    setCTemplateType("downloadable_exe");
    setCStatus("draft");
    setCPlanType("one_time");
    setCPrice("");
    setCOriginalPrice("");
    setCDurationDays("");
    setCMaxDevices("1");
    setCLoginRequired(true);
    setCPurchaseRequired(true);
    setCLicenseRequired(true);
    setCToolAssetUrl("");
    setCToolAssetUploading(false);
    setCPlatform("Windows");
    setCVersion("");
    setCReleaseNotes("");
    setCInstallInstructions("");
    setCOfflineUseAllowed(true);
    setCActivationRequired(true);
    setCRunMode("external_url");
    setCLaunchUrl("");
    setCIntroText("");
    setCUsageInstructions("");
    setCAllowGuestPreview(false);
    setCLicenseType("single_device");
    setCActivationInstructions("");
    setCDeliveryInstructions("");
    setCCustomHandlerKey("prompt-ai-studio");
    setCCustomInstructions("");
    setCEnableFileUpload(false);
    setCEnableDownloadOutput(false);
    setCEnableTabs(true);
    setCreating(false);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreating(false);
    setCImageUploading(false);
    setCToolAssetUploading(false);
  };

  const createProduct = async () => {
    try {
      if (!cTitle.trim()) throw new Error("Title is required");
      if (!cCategoryId || cCategoryId <= 0) {
        throw new Error("Invalid category. Please select a category.");
      }

      setCreating(true);

      if (isToolsMode) {
        const autoSlug = generateToolSlug(cTitle);
        if (!autoSlug) throw new Error("Tool name must produce a valid slug");

        const payload = {
          title: cTitle.trim(),
          category_id: Number(cCategoryId),
          description: cDescription.trim(),
          image_url: cImageUrl.trim() || null,
          status: cStatus,
          template_type: cTemplateType,
          price: Number(cPrice),
          original_price: cOriginalPrice.trim() ? Number(cOriginalPrice) : null,
          plan_type: cPlanType,
          duration_days: cDurationDays.trim() ? Number(cDurationDays) : null,
          max_devices: cMaxDevices.trim() ? Number(cMaxDevices) : 1,
          login_required: cLoginRequired,
          purchase_required: cPurchaseRequired,
          license_required: cLicenseRequired,
          platform: cPlatform,
          version: cVersion.trim(),
          download_url: cToolAssetUrl.trim(),
          release_notes: cReleaseNotes.trim(),
          installation_instructions: cInstallInstructions.trim(),
          offline_use_allowed: cOfflineUseAllowed,
          activation_required: cActivationRequired,
          run_mode: cRunMode,
          launch_url: cLaunchUrl.trim(),
          intro_text: cIntroText.trim(),
          usage_instructions: cUsageInstructions.trim(),
          allow_guest_preview: cAllowGuestPreview,
          license_type: cLicenseType,
          activation_instructions: cActivationInstructions.trim(),
          delivery_instructions: cDeliveryInstructions.trim(),
          custom_handler_key: cCustomHandlerKey,
          custom_instructions: cCustomInstructions.trim(),
          enable_file_upload: cEnableFileUpload,
          enable_download_output: cEnableDownloadOutput,
          enable_tabs: cEnableTabs,
        };

        const res = await fetch("/api/admin/tools/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(parseErrorMessage(data, "Failed to create tool"));
      } else {
        const slug = getNormalizedSlugForMode(cSlug, false);
        if (!slug) throw new Error("Slug is required");

        const payload = {
          title: cTitle.trim(),
          slug,
          category_id: Number(cCategoryId),
          image_url: cImageUrl.trim() || null,
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
      }

      await loadProducts();
      setSort("newest");
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
  const createToolSlugPreview = useMemo(() => generateToolSlug(cTitle), [cTitle]);
  const canCreateTool = useMemo(() => {
    if (!isToolsMode) return false;
    if (!cTitle.trim() || !createToolSlugPreview || cCategoryId <= 0) return false;
    if (!cPrice.trim() || !Number.isFinite(Number(cPrice)) || Number(cPrice) < 0) return false;
    if (cTemplateType === "downloadable_exe" && !cToolAssetUrl.trim()) return false;
    if (cTemplateType === "online_web" && !cLaunchUrl.trim()) return false;
    return true;
  }, [
    cCategoryId,
    cLaunchUrl,
    cPrice,
    cTemplateType,
    cTitle,
    cToolAssetUrl,
    createToolSlugPreview,
    isToolsMode,
  ]);
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
        getCategoryLabel(p.category_name),
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
                value={q ?? ""}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title / slug / category…"
            className="w-full rounded-lg border px-3 py-2 text-sm sm:col-span-2 lg:w-[320px]"
          />

          <select
                value={status ?? "all"}
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
                value={stockFilter ?? "all"}
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
                value={slugFilter ?? "all"}
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
                value={categoryFilter ?? "all"}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm capitalize lg:w-[220px]"
            >
              <option value="all">Category: All</option>
              {categoryOptions
                .filter((c) => c !== "all")
                .map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {getCategoryLabel(c)}
                  </option>
                ))}
            </select>
          ) : null}

          <select
                value={sort ?? "newest"}
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
                    {p.category_name ? getCategoryLabel(p.category_name) : <span className="text-gray-400">-</span>}
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
                      {p.category_name ? getCategoryLabel(p.category_name) : <span className="text-gray-400">-</span>}
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-0 sm:p-4">
          <div className="flex min-h-full items-start justify-center sm:items-center">
            <div
              className={cls(
                "flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-lg sm:h-auto sm:min-h-0 sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl",
                isToolsMode ? "sm:max-w-5xl" : "sm:max-w-xl"
              )}
            >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {isToolsMode ? "Create Tool" : "Create Product"}
                </div>
                <div className="text-xs text-gray-500">
                  {isToolsMode
                    ? "Template-driven tool setup with automatic product, tool definition, and first price row."
                    : "Title + slug + category"}
                </div>
              </div>
              <button
                onClick={closeCreate}
                className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {!isToolsMode ? (
              <>
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y p-4 pb-24 md:grid-cols-2 sm:pb-4">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Title</label>
                <input
                  value={cTitle ?? ""}
                  onChange={(e) => setCTitle(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Slug</label>
                <input
                  value={cSlug ?? ""}
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
                  value={String(cCategoryId ?? 0)}
                  onChange={(e) => setCCategoryId(Number(e.target.value))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {scopedCategories.length === 0 ? (
                    <option value="0">No categories (insert product_categories first)</option>
                  ) : (
                    scopedCategories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {getCategoryLabel(c.name)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-gray-600">Product Image URL</label>
                  {cImageUploading ? (
                    <span className="text-[11px] text-gray-500">Uploading image...</span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-col gap-2 md:flex-row">
                  <input
                    value={cImageUrl ?? ""}
                    onChange={(e) => setCImageUrl(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="/productimg/my-product.jpg or https://..."
                  />
                  <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setCImageUploading(true);
                          const url = await uploadImage(file);
                          setCImageUrl(url);
                        } catch (err) {
                          alert(getErrorMessage(err));
                        } finally {
                          setCImageUploading(false);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
                {cImageUrl ? (
                  <div className="mt-3 flex items-start gap-3">
                    <img
                      src={cImageUrl}
                      alt="Product image preview"
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg border object-cover"
                    />
                    <div className="min-w-0 text-xs text-gray-500">
                      <div>Image preview</div>
                      <div className="mt-1 break-all text-gray-400">{cImageUrl}</div>
                    </div>
                  </div>
                ) : null}
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
              </>
            ) : null}

            {isToolsMode ? (
              <>
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y p-4 pb-24 sm:pb-4 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-900">1. Choose Template</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {TOOL_TEMPLATE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setCTemplateType(option.value)}
                            className={cls(
                              "rounded-2xl border p-4 text-left transition",
                              cTemplateType === option.value
                                ? "border-black bg-gray-50 shadow-sm"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-gray-900">{option.label}</div>
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                                {option.badge}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">{option.description}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-900">2. Basic Info</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600">Tool Name</label>
                          <input
                            value={cTitle ?? ""}
                            onChange={(e) => setCTitle(e.target.value)}
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder="Video Editor Pro"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600">Short Description</label>
                          <textarea
                            value={cDescription ?? ""}
                            onChange={(e) => setCDescription(e.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder="Describe what the customer gets and how they use it."
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">Category</label>
                          <select
                            value={String(cCategoryId ?? 0)}
                            onChange={(e) => setCCategoryId(Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          >
                            {scopedCategories.length === 0 ? (
                              <option value="0">No categories loaded</option>
                            ) : (
                              scopedCategories.map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                  {getCategoryLabel(c.name)}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">Status</label>
                          <select
                            value={cStatus ?? "draft"}
                            onChange={(e) => setCStatus(e.target.value as ToolStatus)}
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-600">Slug Preview</label>
                          <div className="mt-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            {createToolSlugPreview || "Slug will be generated from the tool name"}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-xs text-gray-600">Thumbnail / Cover Image</label>
                            {cImageUploading ? (
                              <span className="text-[11px] text-gray-500">Uploading image...</span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-col gap-2 md:flex-row">
                            <input
                              value={cImageUrl ?? ""}
                              onChange={(e) => setCImageUrl(e.target.value)}
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="/productimg/my-tool.jpg or https://..."
                            />
                            <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                              Upload image
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    setCImageUploading(true);
                                    const url = await uploadImage(file);
                                    setCImageUrl(url);
                                  } catch (err) {
                                    alert(getErrorMessage(err));
                                  } finally {
                                    setCImageUploading(false);
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-900">3. Access &amp; Sales</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs text-gray-600">Plan Type</label>
                          <select
                            value={cPlanType ?? "one_time"}
                            onChange={(e) => setCPlanType(e.target.value as ToolPlanType)}
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          >
                            <option value="one_time">One-time</option>
                            <option value="subscription">Subscription</option>
                            <option value="time_limited">Time-limited</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">Duration (days)</label>
                          <input
                            value={cDurationDays ?? ""}
                            onChange={(e) => setCDurationDays(e.target.value)}
                            type="number"
                            min="1"
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder={cPlanType === "one_time" ? "Leave blank for lifetime" : "30"}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">Price</label>
                          <input
                            value={cPrice ?? ""}
                            onChange={(e) => setCPrice(e.target.value)}
                            type="number"
                            min="0"
                            step="0.01"
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder="9.99"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">Original Price</label>
                          <input
                            value={cOriginalPrice ?? ""}
                            onChange={(e) => setCOriginalPrice(e.target.value)}
                            type="number"
                            min="0"
                            step="0.01"
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder="19.99"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">
                            Max Devices (1-{MAX_TOOL_DEVICES})
                          </label>
                          <input
                            value={cMaxDevices ?? ""}
                            onChange={(e) => setCMaxDevices(e.target.value)}
                            type="number"
                            min="1"
                            max={String(MAX_TOOL_DEVICES)}
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">License Type</label>
                          <select
                            value={cLicenseType ?? "single_device"}
                            onChange={(e) => setCLicenseType(e.target.value as ToolLicenseType)}
                            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          >
                            <option value="single_device">Single device</option>
                            <option value="multi_device">Multi-device</option>
                            <option value="unlimited">Unlimited</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={cLoginRequired}
                            onChange={(e) => setCLoginRequired(e.target.checked)}
                          />
                          Login required
                        </label>

                        <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={cPurchaseRequired}
                            onChange={(e) => setCPurchaseRequired(e.target.checked)}
                          />
                          Purchase required
                        </label>

                        <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={cLicenseRequired}
                            onChange={(e) => setCLicenseRequired(e.target.checked)}
                          />
                          License required
                        </label>

                        <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={cActivationRequired}
                            onChange={(e) => setCActivationRequired(e.target.checked)}
                          />
                          Activation required
                        </label>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-900">4. Tool Content</div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {cTemplateType === "downloadable_exe" ? (
                          <>
                            <div>
                              <label className="text-xs text-gray-600">Primary Platform</label>
                              <select
                                value={cPlatform ?? "Windows"}
                                onChange={(e) => setCPlatform(e.target.value)}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              >
                                <option value="Windows">Windows</option>
                                <option value="Mac">Mac</option>
                                <option value="Linux">Linux</option>
                                <option value="Android">Android</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs text-gray-600">Version</label>
                              <input
                                value={cVersion ?? ""}
                                onChange={(e) => setCVersion(e.target.value)}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                                placeholder="1.0.0"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <div className="flex items-center justify-between gap-3">
                                <label className="text-xs text-gray-600">Download File / URL</label>
                                {cToolAssetUploading ? (
                                  <span className="text-[11px] text-gray-500">Uploading file...</span>
                                ) : null}
                              </div>
                              <div className="mt-1 flex flex-col gap-2 md:flex-row">
                                <input
                                  value={cToolAssetUrl ?? ""}
                                  onChange={(e) => setCToolAssetUrl(e.target.value)}
                                  className="w-full rounded-lg border px-3 py-2 text-sm"
                                  placeholder="Upload a file or paste an external download URL"
                                />
                                <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                                  Upload file
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      try {
                                        setCToolAssetUploading(true);
                                        const url = await uploadToolAsset(file);
                                        setCToolAssetUrl(url);
                                      } catch (err) {
                                        alert(getErrorMessage(err));
                                      } finally {
                                        setCToolAssetUploading(false);
                                        e.currentTarget.value = "";
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-600">Installation Instructions</label>
                              <textarea
                                value={cInstallInstructions ?? ""}
                                onChange={(e) => setCInstallInstructions(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-600">Release Notes</label>
                              <textarea
                                value={cReleaseNotes ?? ""}
                                onChange={(e) => setCReleaseNotes(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              />
                            </div>

                            <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm md:col-span-2">
                              <input
                                type="checkbox"
                                checked={cOfflineUseAllowed}
                                onChange={(e) => setCOfflineUseAllowed(e.target.checked)}
                              />
                              Offline use allowed
                            </label>
                          </>
                        ) : null}

                        {cTemplateType === "online_web" ? (
                          <>
                            <div>
                              <label className="text-xs text-gray-600">Run Mode</label>
                              <select
                                value={cRunMode ?? "external_url"}
                                onChange={(e) => setCRunMode(e.target.value as ToolRunMode)}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              >
                                <option value="external_url">External URL</option>
                                <option value="internal_page">Internal page</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs text-gray-600">Launch URL</label>
                              <input
                                value={cLaunchUrl ?? ""}
                                onChange={(e) => setCLaunchUrl(e.target.value)}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                                placeholder="https://tool.example.com"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-600">Intro Text</label>
                              <textarea
                                value={cIntroText ?? ""}
                                onChange={(e) => setCIntroText(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-600">Usage Instructions</label>
                              <textarea
                                value={cUsageInstructions ?? ""}
                                onChange={(e) => setCUsageInstructions(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              />
                            </div>

                            <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm md:col-span-2">
                              <input
                                type="checkbox"
                                checked={cAllowGuestPreview}
                                onChange={(e) => setCAllowGuestPreview(e.target.checked)}
                              />
                              Allow guest preview
                            </label>
                          </>
                        ) : null}

                        {cTemplateType === "license_only" ? (
                          <>
                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-600">Activation Instructions</label>
                              <textarea
                                value={cActivationInstructions ?? ""}
                                onChange={(e) => setCActivationInstructions(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-600">Delivery Instructions</label>
                              <textarea
                                value={cDeliveryInstructions ?? ""}
                                onChange={(e) => setCDeliveryInstructions(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              />
                            </div>
                          </>
                        ) : null}

                        {cTemplateType === "embedded_custom" ? (
                          <>
                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-600">Custom Tool Type</label>
                              <select
                                value={cCustomHandlerKey ?? "prompt-ai-studio"}
                                onChange={(e) =>
                                  setCCustomHandlerKey(e.target.value as EmbeddedCustomHandlerKey)
                                }
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              >
                                {EMBEDDED_CUSTOM_HANDLER_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <p className="mt-1 text-xs text-gray-500">
                                {
                                  EMBEDDED_CUSTOM_HANDLER_OPTIONS.find(
                                    (option) => option.value === cCustomHandlerKey
                                  )?.description
                                }
                              </p>
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-xs text-gray-600">Custom Instructions</label>
                              <textarea
                                value={cCustomInstructions ?? ""}
                                onChange={(e) => setCCustomInstructions(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                              />
                            </div>

                            <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                              <input
                                type="checkbox"
                                checked={cEnableFileUpload}
                                onChange={(e) => setCEnableFileUpload(e.target.checked)}
                              />
                              Enable file upload
                            </label>

                            <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                              <input
                                type="checkbox"
                                checked={cEnableDownloadOutput}
                                onChange={(e) => setCEnableDownloadOutput(e.target.checked)}
                              />
                              Enable download output
                            </label>

                            <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm md:col-span-2">
                              <input
                                type="checkbox"
                                checked={cEnableTabs}
                                onChange={(e) => setCEnableTabs(e.target.checked)}
                              />
                              Enable tabs
                            </label>
                          </>
                        ) : null}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-4">
                    <section className="rounded-2xl border border-gray-200 p-4">
                      <div className="text-sm font-semibold text-gray-900">Review</div>
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <div className="flex items-center justify-between gap-3">
                          <span>Template</span>
                          <span className="font-medium text-gray-900">
                            {
                              TOOL_TEMPLATE_OPTIONS.find((option) => option.value === cTemplateType)
                                ?.label
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Slug</span>
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800">
                            {createToolSlugPreview || "--"}
                          </code>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Status</span>
                          <span className="font-medium text-gray-900">
                            {cStatus === "published" ? "Published" : "Draft"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Price</span>
                          <span className="font-medium text-gray-900">
                            {cPrice.trim() ? formatMoney(Number(cPrice)) : "--"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>License</span>
                          <span className="font-medium text-gray-900">
                            {cLicenseRequired ? "Required" : "Not required"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Login</span>
                          <span className="font-medium text-gray-900">
                            {cLoginRequired ? "Required" : "Open"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Purchase</span>
                          <span className="font-medium text-gray-900">
                            {cPurchaseRequired ? "Required" : "Open"}
                          </span>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
                      When you click create, admin will automatically:
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        <li>generate the slug from the tool name</li>
                        <li>create the product row</li>
                        <li>create the tool definition from the selected template</li>
                        <li>create the first tool price row</li>
                      </ul>
                    </section>
                  </div>
                </div>

                <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white p-4">
                  <button
                    onClick={closeCreate}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                    disabled={creating || cImageUploading || cToolAssetUploading}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={createProduct}
                    disabled={
                      creating ||
                      cImageUploading ||
                      cToolAssetUploading ||
                      scopedCategories.length === 0 ||
                      !canCreateTool
                    }
                    className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {creating ? "Creating Tool..." : "Create Tool"}
                  </button>
                </div>
              </>
            ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ================= EDIT MODAL ================= */}
      {editOpen && editing ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-0 sm:p-4 lg:p-6">
          <div className="flex min-h-full items-start justify-center lg:items-center">
            <div className="flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-white shadow-lg sm:my-4 sm:h-auto sm:min-h-0 sm:max-w-3xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl lg:my-6 lg:max-h-[calc(100dvh-6rem)]">
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
              className="modal-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y p-3 pr-2 pb-24 sm:p-4 sm:pr-3 sm:pb-4 md:grid-cols-2 lg:gap-3"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Title</label>
                <input
                  value={fTitle ?? ""}
                  onChange={(e) => setFTitle(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Slug</label>
                <input
                  value={fSlug ?? ""}
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
                  value={String(fCategoryId ?? 0)}
                  onChange={(e) => setFCategoryId(Number(e.target.value))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {scopedCategories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {getCategoryLabel(c.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600">Level</label>
                <select
                  value={fLevel ?? "beginner"}
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
                  value={String(fStockQty ?? 0)}
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
                        value={field.label ?? ""}
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
                        value={field.key ?? ""}
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
                        value={field.type ?? "text"}
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
                            checked={!!field.required}
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
                        value={field.placeholder ?? ""}
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

                <div className="mt-1 space-y-3">
                  <input
                    value={fImageUrl ?? ""}
                    onChange={(e) => setFImageUrl(e.target.value)}
                    placeholder="/productimg/my-product.jpg or https://..."
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                            value={vDurationLabel ?? ""}
                            onChange={(e) => setVDurationLabel(e.target.value)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">Duration Note</label>
                          <input
                            value={vDurationNote ?? ""}
                            onChange={(e) => setVDurationNote(e.target.value)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

                        {isToolsMode ? (
                          <div>
                            <label className="text-xs text-gray-600">Access Type</label>
                            <select
                            value={vAccessType ?? "months"}
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
                            value={vDurationDays ?? ""}
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
                            value={vDeviceLabel ?? ""}
                                onChange={(e) => setVDeviceLabel(e.target.value)}
                                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-600">Device Type</label>
                              <select
                            value={vDeviceType ?? "any"}
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
                            value={vDeviceLimit ?? ""}
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
                            value={vOriginalPrice ?? ""}
                            onChange={(e) => setVOriginalPrice(e.target.value)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">Price</label>
                          <input
                            type="number"
                            value={vPrice ?? ""}
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
                            value={vUnitsPerQty ?? "1"}
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



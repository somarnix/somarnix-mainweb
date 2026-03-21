/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/app/lib/http/parseErrorMessage";

type Level = "beginner" | "advanced" | "pro";

type VideoCourse = {
  id: number;
  title: string;
  slug: string;
  category?: string | null;
  tags?: string | null;
  description?: string | null;
  level: Level;
  author_name?: string | null;
  author_avatar_url?: string | null;
  telegram_url?: string | null;
  rating?: number | string | null;
  rating_count?: number | null;
  students_count?: number | null;
  upload_date?: string | null;
  thumbnail_url?: string | null;
  hero_url?: string | null;
  learning_outcomes?: string | null;
  preview_mode?: "count" | "manual";
  preview_count?: number;
  min_price?: number | string | null;
  plan_count?: number | null;
  is_active: number;
  posted_by?: number | null;
  posted_by_name?: string | null;
  posted_by_username?: string | null;
};

type Section = {
  id: number;
  title: string;
  position: number;
};

type Lesson = {
  id: number;
  section_id: number;
  title: string;
  video_url: string;
  duration_label: string | null;
  position: number;
  is_free_preview: number;
  is_active: number;
};

type CoursePlan = {
  id: number;
  name: string;
  access_type: "lifetime" | "months";
  duration_days: number | null;
  price: number | string;
  device_count?: number;
  max_devices?: number | null;
  is_unlimited_device?: number;
  khqr?: string | null;
  usdqr?: string | null;
  is_active: number;
};

type SubscriptionPlan = {
  id: number;
  name: string;
  duration_days: number;
  price: number | string;
  description?: string | null;
  features?: string | null;
  access_courses?: number;
  access_ai_tools?: number;
  access_downloads?: number;
  khqr?: string | null;
  usdqr?: string | null;
  is_active: number;
};

type PromotionComboItem = {
  item_type: "course" | "tool" | "product";
  item_id: number;
  variant_id?: number | null;
  qty?: number;
};

type PromotionCombo = {
  id: number;
  title: string;
  description?: string | null;
  price: number | string;
  original_price?: number | string | null;
  thumbnail_url?: string | null;
  khqr?: string | null;
  usdqr?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  is_active: number;
  items: PromotionComboItem[];
};

type PromotionFormItem = {
  row_id: string;
  item_type: "course" | "tool" | "product";
  item_id: number | null;
  variant_id: number | null;
  qty: number;
};

type ProductRecord = {
  id: number;
  title: string;
  mode?: "license" | "inventory" | null;
  category_name?: string | null;
  is_active?: number;
};

type ProductVariantRecord = {
  id: number;
  duration_label?: string | null;
  duration_days?: number | null;
  price?: number | string | null;
  is_active?: number;
};

function makePromotionFormItem(seed?: Partial<Omit<PromotionFormItem, "row_id">>): PromotionFormItem {
  return {
    row_id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    item_type: seed?.item_type ?? "tool",
    item_id: seed?.item_id ?? null,
    variant_id: seed?.variant_id ?? null,
    qty: Math.max(1, Math.floor(seed?.qty ?? 1)),
  };
}

function formatMoney(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return "-";
  return `$${n.toFixed(2)}`;
}

function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = String(value).replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return normalized.length >= 16 ? normalized.slice(0, 16) : "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const DEFAULT_KH_QR = "/paymentQR/khmer_qr.jpg";
const USD_QR_NONE = "none";

function splitFeatureLines(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function AdminVideoCoursesPage({
  courseId,
  initialManagementTab = "courses",
  onBack,
}: {
  courseId?: number;
  initialManagementTab?: "courses" | "subscriptions" | "promotions";
  onBack?: () => void;
} = {}) {
  const GLOBAL_LOGIN_MAX_DEVICES = 10;
  const [courses, setCourses] = useState<VideoCourse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [plans, setPlans] = useState<CoursePlan[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createLevel, setCreateLevel] = useState<Level>("beginner");

  const [editCourse, setEditCourse] = useState<VideoCourse | null>(null);

  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionPosition, setSectionPosition] = useState(0);
  const [sectionEditingId, setSectionEditingId] = useState<number | null>(null);
  const [sectionEditTitle, setSectionEditTitle] = useState("");
  const [sectionEditPosition, setSectionEditPosition] = useState(0);

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSectionId, setLessonSectionId] = useState<number | null>(null);
  const [lessonUrl, setLessonUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonPosition, setLessonPosition] = useState(0);
  const [lessonFree, setLessonFree] = useState(false);
  const [lessonEditingId, setLessonEditingId] = useState<number | null>(null);
  const [lessonEditTitle, setLessonEditTitle] = useState("");
  const [lessonEditSectionId, setLessonEditSectionId] = useState<number | null>(null);
  const [lessonEditUrl, setLessonEditUrl] = useState("");
  const [lessonEditDuration, setLessonEditDuration] = useState("");
  const [lessonEditPosition, setLessonEditPosition] = useState(0);
  const [lessonEditFree, setLessonEditFree] = useState(false);

  const [planName, setPlanName] = useState("Lifetime");
  const [planAccessType, setPlanAccessType] = useState<"lifetime" | "months">("lifetime");
  const [planDurationDays, setPlanDurationDays] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planMaxDevices, setPlanMaxDevices] = useState("3");
  const [planUnlimitedDevice, setPlanUnlimitedDevice] = useState(false);
  const [planKhqr, setPlanKhqr] = useState("/paymentQR/khmer_qr.jpg");
  const [planUsdqr, setPlanUsdqr] = useState("none");
  const [editingPlan, setEditingPlan] = useState<CoursePlan | null>(null);
  const promotionCoursePlansLoadedRef = useRef<Set<number>>(new Set());
  const promotionProductVariantsLoadedRef = useRef<Set<number>>(new Set());

  const [subName, setSubName] = useState("");
  const [subDuration, setSubDuration] = useState("");
  const [subPrice, setSubPrice] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subFeatures, setSubFeatures] = useState("");
  const [subAccessCourses, setSubAccessCourses] = useState(true);
  const [subAccessAiTools, setSubAccessAiTools] = useState(false);
  const [subAccessDownloads, setSubAccessDownloads] = useState(false);
  const [subKhqr, setSubKhqr] = useState(DEFAULT_KH_QR);
  const [subUsdqr, setSubUsdqr] = useState(USD_QR_NONE);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionPlan | null>(null);
  const [managementTab, setManagementTab] = useState<"courses" | "subscriptions" | "promotions">(
    initialManagementTab
  );
  const [promotions, setPromotions] = useState<PromotionCombo[]>([]);
  const [promotionTitle, setPromotionTitle] = useState("");
  const [promotionDescription, setPromotionDescription] = useState("");
  const [promotionPrice, setPromotionPrice] = useState("");
  const [promotionOriginalPrice, setPromotionOriginalPrice] = useState("");
  const [promotionThumbnail, setPromotionThumbnail] = useState("");
  const [promotionKhqr, setPromotionKhqr] = useState(DEFAULT_KH_QR);
  const [promotionUsdqr, setPromotionUsdqr] = useState(USD_QR_NONE);
  const [promotionStartAt, setPromotionStartAt] = useState("");
  const [promotionEndAt, setPromotionEndAt] = useState("");
  const [promotionItems, setPromotionItems] = useState<PromotionFormItem[]>([
    makePromotionFormItem({ item_type: "tool" }),
  ]);
  const [promotionProducts, setPromotionProducts] = useState<ProductRecord[]>([]);
  const [promotionCoursePlans, setPromotionCoursePlans] = useState<Record<number, CoursePlan[]>>({});
  const [promotionProductVariants, setPromotionProductVariants] = useState<
    Record<number, ProductVariantRecord[]>
  >({});
  const [promotionActive, setPromotionActive] = useState(true);
  const [editingPromotion, setEditingPromotion] = useState<PromotionCombo | null>(null);
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [promotionPanel, setPromotionPanel] = useState<"form" | "results">("form");

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedId) ?? null,
    [courses, selectedId]
  );
  const activePromotionCourses = useMemo(
    () => courses.filter((course) => Number(course.is_active) === 1),
    [courses]
  );
  const activeToolProducts = useMemo(
    () =>
      promotionProducts.filter((product) => {
        const mode = String(product.mode || "").toLowerCase();
        const category = String(product.category_name || "").toLowerCase();
        return Number(product.is_active ?? 1) === 1 && (mode === "license" || category === "tools");
      }),
    [promotionProducts]
  );
  const activeInventoryProducts = useMemo(
    () =>
      promotionProducts.filter((product) => {
        const mode = String(product.mode || "").toLowerCase();
        const category = String(product.category_name || "").toLowerCase();
        return Number(product.is_active ?? 1) === 1 && mode !== "license" && category !== "tools";
      }),
    [promotionProducts]
  );
  const getPostedByLabel = (course: VideoCourse | null | undefined) => {
    if (!course) return "Unknown";
    const fullName = (course.posted_by_name || "").trim();
    return fullName || course.posted_by_username || (course.posted_by ? `User #${course.posted_by}` : "Unknown");
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/video-courses", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load courses");
      setCourses(data.courses ?? []);
      if (!selectedId && data.courses?.length) {
        setSelectedId(data.courses[0].id);
        setEditCourse(data.courses[0]);
      } else if (selectedId) {
        const updated = (data.courses ?? []).find((c: VideoCourse) => c.id === selectedId);
        if (updated) setEditCourse(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async (courseId: number) => {
    const res = await fetch(`/api/admin/video-courses/${courseId}/sections`, {
      credentials: "include",
    });
    const data = await res.json();
    setSections(res.ok ? data.sections ?? [] : []);
  };

  const loadLessons = async (courseId: number) => {
    const res = await fetch(`/api/admin/video-courses/${courseId}/lessons`, {
      credentials: "include",
    });
    const data = await res.json();
    setLessons(res.ok ? data.lessons ?? [] : []);
  };

  const loadPlans = async (courseId: number) => {
    const res = await fetch(`/api/admin/video-courses/${courseId}/plans`, {
      credentials: "include",
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPlans([]);
      toast.error(parseErrorMessage(data, "Failed to load plans"));
      return;
    }
    const plansRaw =
      typeof data === "object" && data !== null && "plans" in data
        ? (data as { plans?: unknown }).plans
        : [];
    setPlans(Array.isArray(plansRaw) ? (plansRaw as CoursePlan[]) : []);
  };

  const loadSubscriptionPlans = async () => {
    const res = await fetch("/api/admin/video-subscriptions", { credentials: "include" });
    const data = await res.json();
    setSubscriptionPlans(res.ok ? data.plans ?? [] : []);
  };

  const loadPromotions = async () => {
    const res = await fetch("/api/admin/promotions", { credentials: "include" });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(parseErrorMessage(data, "Failed to load promotions"));
      setPromotions([]);
      return;
    }
    const rows =
      typeof data === "object" && data !== null && "promotions" in data
        ? (data as { promotions?: unknown }).promotions
        : [];
    setPromotions(Array.isArray(rows) ? (rows as PromotionCombo[]) : []);
  };

  const loadPromotionProducts = async () => {
    const res = await fetch("/api/admin/products", { credentials: "include" });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(parseErrorMessage(data, "Failed to load products"));
      setPromotionProducts([]);
      return;
    }
    const rows =
      typeof data === "object" && data !== null && "products" in data
        ? (data as { products?: unknown }).products
        : [];
    setPromotionProducts(Array.isArray(rows) ? (rows as ProductRecord[]) : []);
  };

  const resetPromotionForm = () => {
    setEditingPromotion(null);
    setPromotionTitle("");
    setPromotionDescription("");
    setPromotionPrice("");
    setPromotionOriginalPrice("");
    setPromotionThumbnail("");
    setPromotionKhqr(DEFAULT_KH_QR);
    setPromotionUsdqr(USD_QR_NONE);
    setPromotionStartAt("");
    setPromotionEndAt("");
    setPromotionItems([makePromotionFormItem({ item_type: "tool" })]);
    setPromotionActive(true);
  };

  const savePromotion = async () => {
    const items = promotionItems
      .map((item) => ({
        item_type: item.item_type,
        item_id: Number(item.item_id),
        variant_id: item.variant_id === null ? null : Number(item.variant_id),
        qty: Math.max(1, Number(item.qty) || 1),
      }))
      .filter(
        (item) =>
          ["course", "tool", "product"].includes(item.item_type) &&
          Number.isFinite(item.item_id) &&
          item.item_id > 0
      ) as PromotionComboItem[];
    if (!promotionTitle.trim()) {
      throw new Error("Promotion title is required");
    }
    const priceNum = Number(promotionPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      throw new Error("Invalid promotion price");
    }
    const originalRaw = promotionOriginalPrice.trim();
    const originalNum = originalRaw === "" ? null : Number(originalRaw);
    if (originalNum !== null && (!Number.isFinite(originalNum) || originalNum < 0)) {
      throw new Error("Invalid promotion original price");
    }
    if (items.length === 0) {
      throw new Error("Add at least one combo item");
    }
    const startAtRaw = promotionStartAt.trim();
    const endAtRaw = promotionEndAt.trim();
    if (startAtRaw && endAtRaw) {
      const startMs = new Date(startAtRaw).getTime();
      const endMs = new Date(endAtRaw).getTime();
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs) {
        throw new Error("End time must be after start time");
      }
    }
    const hasMissingCoursePlan = items.some(
      (item) => item.item_type === "course" && (item.variant_id === null || item.variant_id === undefined)
    );
    if (hasMissingCoursePlan) {
      throw new Error("Each course item must select a plan");
    }
    const hasMissingProductVariant = items.some(
      (item) => (item.item_type === "tool" || item.item_type === "product") && item.variant_id === null
    );
    if (hasMissingProductVariant) {
      throw new Error("Each tool/product item must select a variant");
    }

    const payload = {
      title: promotionTitle.trim(),
      description: promotionDescription.trim() || null,
      price: priceNum,
      original_price: originalNum,
      thumbnail_url: promotionThumbnail.trim() || null,
      khqr: promotionKhqr.trim() || DEFAULT_KH_QR,
      usdqr: promotionUsdqr.trim() || USD_QR_NONE,
      start_at: startAtRaw || null,
      end_at: endAtRaw || null,
      is_active: promotionActive ? 1 : 0,
      items,
    };

    const endpoint = editingPromotion
      ? `/api/admin/promotions/${editingPromotion.id}`
      : "/api/admin/promotions";
    const method = editingPromotion ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, "Failed to save promotion"));
    }
  };

  const addPromotionItem = () => {
    setPromotionItems((prev) => [...prev, makePromotionFormItem({ item_type: "tool" })]);
  };

  const removePromotionItem = (rowId: string) => {
    setPromotionItems((prev) => {
      const next = prev.filter((item) => item.row_id !== rowId);
      return next.length > 0 ? next : [makePromotionFormItem({ item_type: "tool" })];
    });
  };

  const updatePromotionItem = (
    rowId: string,
    patch: Partial<Omit<PromotionFormItem, "row_id">>
  ) => {
    setPromotionItems((prev) =>
      prev.map((item) => {
        if (item.row_id !== rowId) return item;
        return {
          ...item,
          ...patch,
        };
      })
    );
  };

  useEffect(() => {
    void loadCourses();
    void loadSubscriptionPlans();
    void loadPromotions();
    void loadPromotionProducts();
  }, []);

  useEffect(() => {
    if (courseId && (!selectedId || selectedId !== courseId)) {
      setSelectedId(courseId);
    }
  }, [courseId, selectedId]);

  useEffect(() => {
    if (courseId) setManagementTab("courses");
  }, [courseId]);
  useEffect(() => {
    if (courseId) return;
    setManagementTab(initialManagementTab);
  }, [courseId, initialManagementTab]);
  useEffect(() => {
    if (!selectedId) return;
    void loadSections(selectedId);
    void loadLessons(selectedId);
    void loadPlans(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const loadMissing = async () => {
      for (const item of promotionItems) {
        if (!item.item_id || item.item_id <= 0) continue;
        if (item.item_type === "course") {
          if (promotionCoursePlansLoadedRef.current.has(item.item_id)) continue;
          promotionCoursePlansLoadedRef.current.add(item.item_id);
          const res = await fetch(`/api/admin/video-courses/${item.item_id}/plans`, {
            credentials: "include",
          });
          const data: unknown = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast.error(parseErrorMessage(data, "Failed to load course plans"));
            continue;
          }
          const rows =
            typeof data === "object" && data !== null && "plans" in data
              ? (data as { plans?: unknown }).plans
              : [];
          setPromotionCoursePlans((prev) => ({
            ...prev,
            [item.item_id as number]: Array.isArray(rows) ? (rows as CoursePlan[]) : [],
          }));
          continue;
        }
        if (promotionProductVariantsLoadedRef.current.has(item.item_id)) continue;
        promotionProductVariantsLoadedRef.current.add(item.item_id);
        const res = await fetch(`/api/admin/products/${item.item_id}/variants`, {
          credentials: "include",
        });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(parseErrorMessage(data, "Failed to load variants"));
          continue;
        }
        const rows =
          typeof data === "object" && data !== null && "variants" in data
            ? (data as { variants?: unknown }).variants
            : [];
        setPromotionProductVariants((prev) => ({
          ...prev,
          [item.item_id as number]: Array.isArray(rows) ? (rows as ProductVariantRecord[]) : [],
        }));
      }
    };
    void loadMissing();
  }, [promotionItems]);

  useEffect(() => {
    for (const item of promotionItems) {
      if (item.item_type === "course") continue;
      if (item.variant_id !== null) continue;
      if (!item.item_id) continue;
      const variants = promotionProductVariants[item.item_id];
      if (!variants || variants.length === 0) continue;
      const active = variants.filter((variant) => Number(variant.is_active) === 1);
      if (active.length === 0) continue;
      setPromotionItems((prev) =>
        prev.map((row) =>
          row.row_id === item.row_id && row.variant_id === null
            ? { ...row, variant_id: Number(active[0].id) }
            : row
        )
      );
    }
  }, [promotionItems, promotionProductVariants]);

  useEffect(() => {
    for (const item of promotionItems) {
      if (item.item_type !== "course") continue;
      if (item.variant_id !== null) continue;
      if (!item.item_id) continue;
      const plans = promotionCoursePlans[item.item_id];
      if (!plans || plans.length === 0) continue;
      const active = plans.filter((plan) => Number(plan.is_active) === 1);
      if (active.length === 0) continue;
      setPromotionItems((prev) =>
        prev.map((row) =>
          row.row_id === item.row_id && row.variant_id === null
            ? { ...row, variant_id: Number(active[0].id) }
            : row
        )
      );
    }
  }, [promotionItems, promotionCoursePlans]);

  useEffect(() => {
    if (!selectedCourse) {
      setEditCourse(null);
      return;
    }
    setEditCourse((prev) => (prev?.id === selectedCourse.id ? prev : selectedCourse));
  }, [selectedCourse]);

  const createCourse = async () => {
    if (savingCourse) return;
    setSavingCourse(true);
    const res = await fetch("/api/admin/video-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: createTitle,
        slug: createSlug,
        level: createLevel,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Create failed");
      setSavingCourse(false);
      return;
    }
    setCreateOpen(false);
    setCreateTitle("");
    setCreateSlug("");
    setCreateLevel("beginner");
    await loadCourses();
    toast.success("Course created");
    setSavingCourse(false);
  };

  const saveCourse = async () => {
    if (!editCourse) return;
    if (savingCourse) return;
    setSavingCourse(true);
    const res = await fetch(`/api/admin/video-courses/${editCourse.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editCourse),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Save failed");
      setSavingCourse(false);
      return;
    }
    await loadCourses();
    toast.success("Course saved");
    setSavingCourse(false);
  };

  const addSection = async () => {
    if (!selectedId) return;
    if (savingSection) return;
    setSavingSection(true);
    const res = await fetch(`/api/admin/video-courses/${selectedId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: sectionTitle,
        position: sectionPosition,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to add section");
      setSavingSection(false);
      return;
    }
    setSectionTitle("");
    setSectionPosition(0);
    await loadSections(selectedId);
    toast.success("Section saved");
    setSavingSection(false);
  };

  const startEditSection = (section: Section) => {
    setSectionEditingId(section.id);
    setSectionEditTitle(section.title);
    setSectionEditPosition(section.position);
  };

  const cancelEditSection = () => {
    setSectionEditingId(null);
    setSectionEditTitle("");
    setSectionEditPosition(0);
  };

  const saveEditSection = async () => {
    if (!selectedId || !sectionEditingId) return;
    if (savingSection) return;
    setSavingSection(true);
    const res = await fetch(
      `/api/admin/video-courses/${selectedId}/sections/${sectionEditingId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: sectionEditTitle,
          position: sectionEditPosition,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to update section");
      setSavingSection(false);
      return;
    }
    await loadSections(selectedId);
    toast.success("Section updated");
    setSavingSection(false);
    cancelEditSection();
  };

  const deleteSection = async (sectionId: number) => {
    if (!selectedId) return;
    if (savingSection) return;
    setSavingSection(true);
    const res = await fetch(`/api/admin/video-courses/${selectedId}/sections/${sectionId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to delete section");
      setSavingSection(false);
      return;
    }
    await loadSections(selectedId);
    await loadLessons(selectedId);
    toast.success("Section deleted");
    setSavingSection(false);
    if (sectionEditingId === sectionId) {
      cancelEditSection();
    }
  };

  const addLesson = async () => {
    if (!selectedId || !lessonSectionId) return;
    if (savingLesson) return;
    setSavingLesson(true);
    const res = await fetch(`/api/admin/video-courses/${selectedId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        section_id: lessonSectionId,
        title: lessonTitle,
        video_url: lessonUrl,
        duration_label: lessonDuration || null,
        position: lessonPosition,
        is_free_preview: lessonFree ? 1 : 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to add lesson");
      setSavingLesson(false);
      return;
    }
    setLessonTitle("");
    setLessonUrl("");
    setLessonDuration("");
    setLessonPosition(0);
    setLessonFree(false);
    await loadLessons(selectedId);
    toast.success("Lesson saved");
    setSavingLesson(false);
  };

  const startEditLesson = (lesson: Lesson) => {
    setLessonEditingId(lesson.id);
    setLessonEditSectionId(lesson.section_id);
    setLessonEditTitle(lesson.title);
    setLessonEditUrl(lesson.video_url);
    setLessonEditDuration(lesson.duration_label ?? "");
    setLessonEditPosition(lesson.position ?? 0);
    setLessonEditFree(lesson.is_free_preview === 1);
  };

  const cancelEditLesson = () => {
    setLessonEditingId(null);
    setLessonEditSectionId(null);
    setLessonEditTitle("");
    setLessonEditUrl("");
    setLessonEditDuration("");
    setLessonEditPosition(0);
    setLessonEditFree(false);
  };

  const saveEditLesson = async () => {
    if (!selectedId || !lessonEditingId || !lessonEditSectionId) return;
    if (savingLesson) return;
    setSavingLesson(true);
    const res = await fetch(
      `/api/admin/video-courses/${selectedId}/lessons/${lessonEditingId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          section_id: lessonEditSectionId,
          title: lessonEditTitle,
          video_url: lessonEditUrl,
          duration_label: lessonEditDuration || null,
          position: lessonEditPosition,
          is_free_preview: lessonEditFree ? 1 : 0,
          is_active: 1,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to update lesson");
      setSavingLesson(false);
      return;
    }
    await loadLessons(selectedId);
    toast.success("Lesson updated");
    setSavingLesson(false);
    cancelEditLesson();
  };

  const deleteLesson = async (lessonId: number) => {
    if (!selectedId) return;
    if (savingLesson) return;
    setSavingLesson(true);
    const res = await fetch(`/api/admin/video-courses/${selectedId}/lessons/${lessonId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error || "Failed to delete lesson");
      setSavingLesson(false);
      return;
    }
    await loadLessons(selectedId);
    toast.success("Lesson deleted");
    setSavingLesson(false);
    if (lessonEditingId === lessonId) {
      cancelEditLesson();
    }
  };
  const addPlan = async () => {
    if (!selectedId) return;
    if (savingPlan) return;
    if (planAccessType === "months") {
      const days = Number(planDurationDays);
      if (!Number.isFinite(days) || days <= 0) {
        toast.error("Duration days is required for monthly plan");
        return;
      }
    }
    if (!planUnlimitedDevice) {
      const maxDevices = Number(planMaxDevices);
      if (!Number.isFinite(maxDevices) || maxDevices <= 0) {
        toast.error("Max devices must be a positive number");
        return;
      }
    }
    setSavingPlan(true);
    const res = await fetch(`/api/admin/video-courses/${selectedId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: planName,
        access_type: planAccessType,
        duration_days: planAccessType === "months" ? Number(planDurationDays) : null,
        price: Number(planPrice),
        max_devices: planUnlimitedDevice ? GLOBAL_LOGIN_MAX_DEVICES : Number(planMaxDevices),
        is_unlimited_device: planUnlimitedDevice ? 1 : 0,
        khqr: planKhqr,
        usdqr: planUsdqr,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data?.error || "Failed to add plan");
      setSavingPlan(false);
      return;
    }
    setPlanName("Lifetime");
    setPlanAccessType("lifetime");
    setPlanDurationDays("");
    setPlanPrice("");
    setPlanMaxDevices("3");
    setPlanUnlimitedDevice(false);
    setPlanKhqr("/paymentQR/khmer_qr.jpg");
    setPlanUsdqr("none");
    await loadPlans(selectedId);
    toast.success("Plan saved");
    setSavingPlan(false);
  };

  const updatePlan = async (planId: number, patch: Record<string, unknown>) => {
    if (!selectedId) return;
    const res = await fetch(`/api/admin/video-courses/${selectedId}/plans/${planId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, "Failed to update plan"));
    }
  };

  const deletePlan = async (planId: number) => {
    if (!selectedId) return;
    const res = await fetch(`/api/admin/video-courses/${selectedId}/plans/${planId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, "Failed to delete plan"));
    }
  };

  const toggleCourseActive = async (courseId: number, next: number) => {
    const res = await fetch(`/api/admin/video-courses/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, "Failed to update course"));
    }
  };

  const copyCourse = async (courseId: number, title: string) => {
    const ok = confirm(`Copy course "${title}"?`);
    if (!ok) return;
    const res = await fetch(`/api/admin/video-courses/${courseId}/copy`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, "Failed to copy course"));
    }
  };

  const deleteCourse = async (courseId: number, title: string) => {
    const ok = confirm(`Delete course "${title}"? This will expire access for users.`);
    if (!ok) return;
    const res = await fetch(`/api/admin/video-courses/${courseId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, "Failed to delete course"));
    }
  };
  const addSubscriptionPlan = async () => {
    if (savingSubscription) return;
    setSavingSubscription(true);
    try {
      if (editingSubscription) {
        await updateSubscriptionPlan(editingSubscription.id, {
          name: subName,
          duration_days: Number(subDuration),
          price: Number(subPrice),
          description: subDescription,
          features: subFeatures,
          access_courses: subAccessCourses ? 1 : 0,
          access_ai_tools: subAccessAiTools ? 1 : 0,
          access_downloads: subAccessDownloads ? 1 : 0,
          khqr: subKhqr,
          usdqr: subUsdqr,
        });
      } else {
        const res = await fetch("/api/admin/video-subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: subName,
            duration_days: Number(subDuration),
            price: Number(subPrice),
            description: subDescription,
            features: subFeatures,
            access_courses: subAccessCourses ? 1 : 0,
            access_ai_tools: subAccessAiTools ? 1 : 0,
            access_downloads: subAccessDownloads ? 1 : 0,
            khqr: subKhqr,
            usdqr: subUsdqr,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error || "Failed to add subscription plan");
          setSavingSubscription(false);
          return;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save subscription plan");
      setSavingSubscription(false);
      return;
    }
    setSubName("");
    setSubDuration("");
    setSubPrice("");
    setSubDescription("");
    setSubFeatures("");
    setSubAccessCourses(true);
    setSubAccessAiTools(false);
    setSubAccessDownloads(false);
    setSubKhqr(DEFAULT_KH_QR);
    setSubUsdqr(USD_QR_NONE);
    setEditingSubscription(null);
    await loadSubscriptionPlans();
    toast.success(editingSubscription ? "Subscription plan updated" : "Subscription plan saved");
    setSavingSubscription(false);
  };

  const updateSubscriptionPlan = async (planId: number, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/video-subscriptions/${planId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, "Failed to update subscription plan"));
    }
  };

  const deleteSubscriptionPlan = async (planId: number) => {
    const res = await fetch(`/api/admin/video-subscriptions/${planId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, "Failed to delete subscription plan"));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {managementTab === "promotions" ? "Promotions" : "Video Courses"}
          </h1>
          <p className="text-sm text-gray-500">
            {managementTab === "promotions"
              ? "Manage promotion combos."
              : "Manage courses, lessons, and subscriptions."}
          </p>
        </div>
        {managementTab !== "promotions" ? (
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full rounded-lg bg-black px-4 py-2 text-sm text-white lg:w-auto"
          >
            New Course
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {initialManagementTab !== "promotions" ? (
          <>
            <button
              type="button"
              onClick={() => setManagementTab("courses")}
              className={`px-3 py-2 rounded-lg text-sm border ${
                managementTab === "courses"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Courses
            </button>
            <button
              type="button"
              onClick={() => setManagementTab("subscriptions")}
              className={`px-3 py-2 rounded-lg text-sm border ${
                managementTab === "subscriptions"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Subscription plans (all courses)
            </button>
          </>
        ) : null}
        {initialManagementTab === "promotions" ? (
          <>
            <button
              type="button"
              className="px-3 py-2 rounded-lg text-sm border bg-black text-white border-black"
            >
              Promotions
            </button>
            <button
              type="button"
              className={`px-3 py-2 rounded-lg text-sm border ${
                promotionPanel === "form"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setPromotionPanel("form")}
            >
              Promotion
            </button>
            <button
              type="button"
              className={`px-3 py-2 rounded-lg text-sm border ${
                promotionPanel === "results"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setPromotionPanel("results")}
            >
              Promotion Result
            </button>
          </>
        ) : null}
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {managementTab === "courses" ? (
      <>
      {!courseId ? (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Courses</h2>
              <p className="text-xs text-gray-500">Total: {courses.length}</p>
            </div>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-left w-16">ID</th>
                    <th className="p-3 text-left">Course</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Price</th>
                    <th className="p-3 text-left">Plans</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id} className="border-b last:border-b-0">
                      <td className="p-3">#{course.id}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 overflow-hidden rounded-md border bg-white">
                            <img
                              src={course.thumbnail_url || course.hero_url || "/placeholder.png"}
                              alt={course.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{course.title}</div>
                            <div className="text-xs text-gray-500 truncate">{course.slug}</div>
                            <div className="text-xs text-gray-500 truncate">
                              Posted by: {getPostedByLabel(course)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {course.category || "Uncategorized"}
                      </td>
                      <td className="p-3">
                        {course.min_price != null ? formatMoney(course.min_price) : "No price"}
                      </td>
                      <td className="p-3">{course.plan_count ?? 0}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            course.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {course.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg border text-xs"
                            onClick={() => {
                              window.location.href = `/admin/video-courses/${course.id}`;
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg border text-xs"
                            onClick={async () => {
                              try {
                                await copyCourse(course.id, course.title);
                                await loadCourses();
                                toast.success("Course copied");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to copy course");
                              }
                            }}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg border text-xs"
                            onClick={async () => {
                              try {
                                const next = course.is_active ? 0 : 1;
                                await toggleCourseActive(course.id, next);
                                await loadCourses();
                                toast.success(next ? "Course enabled" : "Course disabled");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to update course");
                              }
                            }}
                          >
                            {course.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg border text-xs text-red-600"
                            onClick={async () => {
                              try {
                                await deleteCourse(course.id, course.title);
                                await loadCourses();
                                toast.success("Course deleted");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to delete course");
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        No courses yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              </div>

              <div className="divide-y md:hidden">
                {courses.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No courses yet.</div>
                ) : (
                  courses.map((course) => (
                    <div key={course.id} className="space-y-4 p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md border bg-white">
                          <img
                            src={course.thumbnail_url || course.hero_url || "/placeholder.png"}
                            alt={course.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-gray-900">{course.title}</div>
                              <div className="truncate text-xs text-gray-500">{course.slug}</div>
                              <div className="truncate text-xs text-gray-500">
                                Posted by: {getPostedByLabel(course)}
                              </div>
                            </div>
                            <div className="text-right text-xs text-gray-500">#{course.id}</div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {course.category || "Uncategorized"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                course.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {course.is_active ? "Active" : "Disabled"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border bg-gray-50 p-3">
                          <div className="text-xs text-gray-500">Price</div>
                          <div className="mt-1 font-medium text-gray-900">
                            {course.min_price != null ? formatMoney(course.min_price) : "No price"}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-gray-50 p-3">
                          <div className="text-xs text-gray-500">Plans</div>
                          <div className="mt-1 font-medium text-gray-900">{course.plan_count ?? 0}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-lg border px-3 py-2 text-xs sm:flex-none"
                          onClick={() => {
                            window.location.href = `/admin/video-courses/${course.id}`;
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-lg border px-3 py-2 text-xs sm:flex-none"
                          onClick={async () => {
                            try {
                              await copyCourse(course.id, course.title);
                              await loadCourses();
                              toast.success("Course copied");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Failed to copy course");
                            }
                          }}
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-lg border px-3 py-2 text-xs sm:flex-none"
                          onClick={async () => {
                            try {
                              const next = course.is_active ? 0 : 1;
                              await toggleCourseActive(course.id, next);
                              await loadCourses();
                              toast.success(next ? "Course enabled" : "Course disabled");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Failed to update course");
                            }
                          }}
                        >
                          {course.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-lg border px-3 py-2 text-xs text-red-600 sm:flex-none"
                          onClick={async () => {
                            try {
                              await deleteCourse(course.id, course.title);
                              await loadCourses();
                              toast.success("Course deleted");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Failed to delete course");
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Course details</h2>
            <p className="text-sm text-gray-500">Edit course, lessons, and plans.</p>
          </div>
          <button
            type="button"
            onClick={() => (onBack ? onBack() : (window.location.href = "/admin/video-courses"))}
            className="px-3 py-2 rounded-lg border text-sm"
          >
            Back to courses
          </button>
        </div>
      )}

      <div className="mx-auto max-w-full px-0 py-6 sm:px-0 sm:py-8">
        {courseId && selectedCourse ? (
          <>
              <div className="rounded-xl border bg-white p-4 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <h2 className="font-semibold text-gray-900">Course details</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!editCourse) return;
                        try {
                          const next = editCourse.is_active ? 0 : 1;
                          await toggleCourseActive(editCourse.id, next);
                          await loadCourses();
                          toast.success(next ? "Course enabled" : "Course disabled");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to update course");
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border text-xs"
                    >
                      {editCourse?.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={saveCourse}
                      className="px-3 py-1.5 rounded-lg bg-black text-white text-xs disabled:opacity-60"
                      disabled={savingCourse}
                    >
                      {savingCourse ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.title ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                    }
                    placeholder="Title"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.slug ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) => (prev ? { ...prev, slug: e.target.value } : prev))
                    }
                    placeholder="Slug"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.category ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, category: e.target.value } : prev
                      )
                    }
                    placeholder="Category"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.tags ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, tags: e.target.value } : prev
                      )
                    }
                    placeholder="Tags (comma separated)"
                  />
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.level ?? "beginner"}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, level: e.target.value as Level } : prev
                      )
                    }
                  >
                    <option value="beginner">Beginner</option>
                    <option value="advanced">Advanced</option>
                    <option value="pro">Pro</option>
                  </select>
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.author_name ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, author_name: e.target.value } : prev
                      )
                    }
                    placeholder="Author name"
                  />
                  <input
                    className="border rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600"
                    value={getPostedByLabel(editCourse)}
                    disabled
                    placeholder="Posted by"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.author_avatar_url ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, author_avatar_url: e.target.value } : prev
                      )
                    }
                    placeholder="Author avatar URL or @username"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.telegram_url ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, telegram_url: e.target.value } : prev
                      )
                    }
                    placeholder="Telegram link"
                  />
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.preview_mode ?? "count"}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, preview_mode: e.target.value as "count" | "manual" } : prev
                      )
                    }
                  >
                    <option value="count">Preview by count</option>
                    <option value="manual">Preview by lesson</option>
                  </select>
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    type="number"
                    value={editCourse?.preview_count ?? 0}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, preview_count: Number(e.target.value) } : prev
                      )
                    }
                    placeholder="Preview count"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    type="number"
                    value={editCourse?.rating ?? 0}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, rating: Number(e.target.value) } : prev
                      )
                    }
                    placeholder="Rating"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    type="number"
                    value={editCourse?.rating_count ?? 0}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, rating_count: Number(e.target.value) } : prev
                      )
                    }
                    placeholder="Rating count"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    type="number"
                    value={editCourse?.students_count ?? 0}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, students_count: Number(e.target.value) } : prev
                      )
                    }
                    placeholder="Students count"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.upload_date ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, upload_date: e.target.value } : prev
                      )
                    }
                    placeholder="Upload date (YYYY-MM-DD)"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.thumbnail_url ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, thumbnail_url: e.target.value } : prev
                      )
                    }
                    placeholder="Thumbnail URL"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.hero_url ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, hero_url: e.target.value } : prev
                      )
                    }
                    placeholder="Hero image URL"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!editCourse?.is_active}
                      onChange={(e) =>
                        setEditCourse((prev) =>
                          prev ? { ...prev, is_active: e.target.checked ? 1 : 0 } : prev
                        )
                      }
                    />
                    Active
                  </label>
                  <textarea
                    className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
                    value={editCourse?.description ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, description: e.target.value } : prev
                      )
                    }
                    placeholder="Description"
                  />
                  <textarea
                    className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
                    value={editCourse?.learning_outcomes ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, learning_outcomes: e.target.value } : prev
                      )
                    }
                    placeholder={`What you'll learn (one line per outcome)`}
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4 space-y-3">
                <h2 className="font-semibold text-gray-900">Sections</h2>
                <div className="flex flex-wrap gap-2">
                  <input
                    className="border rounded-lg px-3 py-2 text-sm flex-1"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    placeholder="Section title"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm w-24"
                    type="number"
                    value={sectionPosition}
                    onChange={(e) => setSectionPosition(Number(e.target.value))}
                    placeholder="Pos"
                  />
                  <button
                    onClick={addSection}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
                    disabled={savingSection}
                  >
                    {savingSection ? "Saving..." : "Add"}
                  </button>
                </div>
                {sections.map((section) => {
                  const isEditing = sectionEditingId === section.id;
                  return (
                    <div
                      key={section.id}
                      className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700"
                    >
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            className="border rounded-lg px-3 py-2 text-sm flex-1"
                            value={sectionEditTitle}
                            onChange={(e) => setSectionEditTitle(e.target.value)}
                            placeholder="Section title"
                          />
                          <input
                            className="border rounded-lg px-3 py-2 text-sm w-24"
                            type="number"
                            value={sectionEditPosition}
                            onChange={(e) => setSectionEditPosition(Number(e.target.value))}
                            placeholder="Pos"
                          />
                          <button
                            onClick={saveEditSection}
                            className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                            disabled={savingSection}
                          >
                            {savingSection ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={cancelEditSection}
                            className="px-3 py-2 rounded-lg border text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            {section.position}. {section.title}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditSection(section)}
                              className="px-3 py-1.5 rounded-lg border text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSection(section.id)}
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border bg-white p-4 space-y-3">
                <h2 className="font-semibold text-gray-900">Lessons</h2>
                <div className="grid md:grid-cols-2 gap-2">
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={lessonSectionId ?? ""}
                    onChange={(e) => setLessonSectionId(Number(e.target.value))}
                  >
                    <option value="">Select section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="Lesson title"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
                    value={lessonUrl}
                    onChange={(e) => setLessonUrl(e.target.value)}
                    placeholder="YouTube URL"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="Duration (e.g. 10:16)"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    type="number"
                    value={lessonPosition}
                    onChange={(e) => setLessonPosition(Number(e.target.value))}
                    placeholder="Position"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={lessonFree}
                      onChange={(e) => setLessonFree(e.target.checked)}
                    />
                    Free preview
                  </label>
                  <button
                    onClick={addLesson}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
                    disabled={savingLesson}
                  >
                    {savingLesson ? "Saving..." : "Add lesson"}
                  </button>
                </div>
                {lessons.map((lesson) => {
                  const isEditing = lessonEditingId === lesson.id;
                  return (
                    <div
                      key={lesson.id}
                      className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700"
                    >
                      {isEditing ? (
                        <div className="grid md:grid-cols-2 gap-2">
                          <select
                            className="border rounded-lg px-3 py-2 text-sm"
                            value={lessonEditSectionId ?? ""}
                            onChange={(e) => setLessonEditSectionId(Number(e.target.value))}
                          >
                            <option value="">Select section</option>
                            {sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.title}
                              </option>
                            ))}
                          </select>
                          <input
                            className="border rounded-lg px-3 py-2 text-sm"
                            value={lessonEditTitle}
                            onChange={(e) => setLessonEditTitle(e.target.value)}
                            placeholder="Lesson title"
                          />
                          <input
                            className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
                            value={lessonEditUrl}
                            onChange={(e) => setLessonEditUrl(e.target.value)}
                            placeholder="YouTube URL"
                          />
                          <input
                            className="border rounded-lg px-3 py-2 text-sm"
                            value={lessonEditDuration}
                            onChange={(e) => setLessonEditDuration(e.target.value)}
                            placeholder="Duration (e.g. 10:16)"
                          />
                          <input
                            className="border rounded-lg px-3 py-2 text-sm"
                            type="number"
                            value={lessonEditPosition}
                            onChange={(e) => setLessonEditPosition(Number(e.target.value))}
                            placeholder="Position"
                          />
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={lessonEditFree}
                              onChange={(e) => setLessonEditFree(e.target.checked)}
                            />
                            Free preview
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveEditLesson}
                              className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                              disabled={savingLesson}
                            >
                              {savingLesson ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEditLesson}
                              className="px-3 py-2 rounded-lg border text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            {lesson.position}. {lesson.title}{" "}
                            {lesson.is_free_preview ? "(Preview)" : ""}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditLesson(lesson)}
                              className="px-3 py-1.5 rounded-lg border text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteLesson(lesson.id)}
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border bg-white p-4 space-y-3">
                <h2 className="font-semibold text-gray-900">Course plans</h2>
                <div className="grid md:grid-cols-2 gap-2">
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Plan name"
                  />
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={planAccessType}
                    onChange={(e) =>
                      setPlanAccessType(e.target.value === "months" ? "months" : "lifetime")
                    }
                  >
                    <option value="lifetime">Lifetime</option>
                    <option value="months">Monthly (days)</option>
                  </select>
                  {planAccessType === "months" ? (
                    <input
                      className="border rounded-lg px-3 py-2 text-sm"
                      value={planDurationDays}
                      onChange={(e) => setPlanDurationDays(e.target.value)}
                      placeholder="Duration days (example: 30)"
                    />
                  ) : (
                    <div />
                  )}
                  <input
                    className="border rounded-lg px-3 py-2 text-sm w-32"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="Price"
                  />
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={planUnlimitedDevice ? String(GLOBAL_LOGIN_MAX_DEVICES) : planMaxDevices}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPlanMaxDevices(value);
                      setPlanUnlimitedDevice(Number(value) === GLOBAL_LOGIN_MAX_DEVICES);
                    }}
                    disabled={planUnlimitedDevice}
                  >
                    {Array.from({ length: GLOBAL_LOGIN_MAX_DEVICES }, (_, idx) => {
                      const value = String(idx + 1);
                      return (
                        <option key={value} value={value}>
                          Max devices: {value}
                        </option>
                      );
                    })}
                  </select>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 px-1">
                    <input
                      type="checkbox"
                      checked={planUnlimitedDevice}
                      onChange={(e) => {
                        setPlanUnlimitedDevice(e.target.checked);
                        if (e.target.checked) {
                          setPlanMaxDevices(String(GLOBAL_LOGIN_MAX_DEVICES));
                        }
                      }}
                    />
                    Unlimited devices
                  </label>
                  <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs font-semibold text-gray-700">Payment QR</div>
                    <p className="mt-2 text-sm text-gray-600">
                      Payment QR is generated automatically at checkout from the order amount.
                    </p>
                  </div>
                  <button
                    onClick={addPlan}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
                    disabled={savingPlan}
                  >
                    {savingPlan ? "Saving..." : "Add plan"}
                  </button>
                </div>
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-gray-900">{plan.name}</div>
                        <div className="text-xs text-gray-500">
                          {plan.access_type === "lifetime"
                            ? "Lifetime"
                            : `${plan.duration_days ?? 0} days`} - {formatMoney(plan.price)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Devices:{" "}
                          {plan.is_unlimited_device === 1
                            ? `Unlimited (max ${GLOBAL_LOGIN_MAX_DEVICES})`
                            : Number.isFinite(Number(plan.max_devices))
                              ? Math.max(1, Math.min(GLOBAL_LOGIN_MAX_DEVICES, Number(plan.max_devices)))
                              : 3}
                        </div>
                        <div className="text-xs text-gray-500">
                          Device count:{" "}
                          {Number.isFinite(Number(plan.device_count))
                            ? Math.max(0, Math.floor(Number(plan.device_count)))
                            : 0}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {plan.is_active ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Payment QR is generated automatically at checkout.
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="text-xs px-3 py-1.5 rounded border"
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanName(plan.name);
                          setPlanAccessType(plan.access_type === "months" ? "months" : "lifetime");
                          setPlanDurationDays(
                            plan.duration_days !== null && plan.duration_days !== undefined
                              ? String(plan.duration_days)
                              : ""
                          );
                          setPlanPrice(String(plan.price ?? ""));
                          setPlanMaxDevices(
                            plan.is_unlimited_device === 1
                              ? String(GLOBAL_LOGIN_MAX_DEVICES)
                              : Number.isFinite(Number(plan.max_devices))
                                ? String(Math.max(1, Math.min(GLOBAL_LOGIN_MAX_DEVICES, Number(plan.max_devices))))
                                : "3"
                          );
                          setPlanUnlimitedDevice(plan.is_unlimited_device === 1);
                          setPlanKhqr(plan.khqr || DEFAULT_KH_QR);
                          setPlanUsdqr(plan.usdqr || USD_QR_NONE);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs px-3 py-1.5 rounded border"
                        onClick={async () => {
                          try {
                            await updatePlan(plan.id, {
                              is_active: plan.is_active ? 0 : 1,
                            });
                            if (selectedId) {
                              await loadPlans(selectedId);
                            }
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to update plan");
                          }
                        }}
                      >
                        {plan.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="text-xs px-3 py-1.5 rounded border text-red-600"
                        onClick={async () => {
                          const ok = confirm("Remove this plan?");
                          if (!ok) return;
                          try {
                            await deletePlan(plan.id);
                            if (selectedId) {
                              await loadPlans(selectedId);
                            }
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to delete plan");
                          }
                        }}
                      >
                        Remove
                      </button>
                      {editingPlan?.id === plan.id ? (
                        <button
                          className="text-xs px-3 py-1.5 rounded bg-black text-white"
                          onClick={async () => {
                            if (!editingPlan) return;
                            try {
                              await updatePlan(editingPlan.id, {
                                name: planName,
                                access_type: planAccessType,
                                duration_days:
                                  planAccessType === "months" ? Number(planDurationDays || 0) : null,
                                price: Number(planPrice),
                                max_devices: planUnlimitedDevice
                                  ? GLOBAL_LOGIN_MAX_DEVICES
                                  : Number(planMaxDevices || 0),
                                is_unlimited_device: planUnlimitedDevice ? 1 : 0,
                                khqr: planKhqr,
                                usdqr: planUsdqr,
                              });
                              if (selectedId) {
                                await loadPlans(selectedId);
                              }
                              setEditingPlan(null);
                              setPlanName("Lifetime");
                              setPlanAccessType("lifetime");
                              setPlanDurationDays("");
                              setPlanPrice("");
                              setPlanMaxDevices("3");
                              setPlanUnlimitedDevice(false);
                              setPlanKhqr(DEFAULT_KH_QR);
                              setPlanUsdqr(USD_QR_NONE);
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Failed to save plan");
                            }
                          }}
                        >
                          Save
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
          </>
        ) : courseId ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">
            Select a course to edit.
          </div>
        ) : null}
      </div>
      </>
      ) : null}

      {managementTab === "subscriptions" ? (
      <div className="rounded-xl border bg-white p-4 space-y-4">
        <h2 className="font-semibold text-gray-900">Subscription plans (all courses)</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="Plan name"
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                value={subDuration}
                onChange={(e) => setSubDuration(e.target.value)}
                placeholder="Days"
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                value={subPrice}
                onChange={(e) => setSubPrice(e.target.value)}
                placeholder="Price"
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                value={subDescription}
                onChange={(e) => setSubDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
            <textarea
              className="border rounded-lg px-3 py-2 text-sm min-h-[110px]"
              value={subFeatures}
              onChange={(e) => setSubFeatures(e.target.value)}
              placeholder={"Features (one per line)\nExample:\n- All video courses\n- AI tools access\n- 3 downloads"}
            />
            <div className="flex flex-wrap gap-3 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subAccessCourses}
                  onChange={(e) => setSubAccessCourses(e.target.checked)}
                />
                Access all courses
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subAccessAiTools}
                  onChange={(e) => setSubAccessAiTools(e.target.checked)}
                />
                Access AI tools
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subAccessDownloads}
                  onChange={(e) => setSubAccessDownloads(e.target.checked)}
                />
                Access downloads
              </label>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold text-gray-700">Payment QR</div>
              <p className="mt-2 text-sm text-gray-600">
                Payment QR is generated automatically at checkout from the order amount.
              </p>
            </div>
            <button
              onClick={addSubscriptionPlan}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
              disabled={savingSubscription}
            >
              {savingSubscription
                ? "Saving..."
                : editingSubscription
                  ? "Save changes"
                  : "Add plan"}
            </button>
            {editingSubscription ? (
              <button
                type="button"
                className="px-3 py-2 rounded-lg border text-sm"
                onClick={() => {
                  setEditingSubscription(null);
                  setSubName("");
                  setSubDuration("");
                  setSubPrice("");
                  setSubDescription("");
                  setSubFeatures("");
                  setSubAccessCourses(true);
                  setSubAccessAiTools(false);
                  setSubAccessDownloads(false);
                  setSubKhqr(DEFAULT_KH_QR);
                  setSubUsdqr(USD_QR_NONE);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {subscriptionPlans.map((plan) => {
              const features = splitFeatureLines(plan.features);
              const durationLabel = plan.duration_days ? `${plan.duration_days} days` : "Subscription";
              return (
                <div key={plan.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold text-gray-900">{plan.name}</div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            plan.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {plan.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{durationLabel}</div>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatMoney(plan.price)}
                    </div>
                  </div>
                  {plan.description ? (
                    <div className="text-sm text-gray-600">{plan.description}</div>
                  ) : null}
                  {features.length > 0 ? (
                    <ul className="text-xs text-gray-600 space-y-1">
                      {features.map((item, idx) => (
                        <li key={`${plan.id}-feature-${idx}`}>• {item}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                    {plan.access_courses ? "All courses" : null}
                    {plan.access_ai_tools ? "AI tools" : null}
                    {plan.access_downloads ? "Downloads" : null}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span>Payment QR is generated automatically at checkout.</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-xs px-3 py-1.5 rounded border"
                      onClick={() => {
                        setEditingSubscription(plan);
                        setSubName(plan.name);
                        setSubDuration(String(plan.duration_days));
                        setSubPrice(String(plan.price ?? ""));
                        setSubDescription(plan.description ?? "");
                        setSubFeatures(plan.features ?? "");
                        setSubAccessCourses(plan.access_courses !== 0);
                        setSubAccessAiTools(plan.access_ai_tools === 1);
                        setSubAccessDownloads(plan.access_downloads === 1);
                        setSubKhqr(plan.khqr || DEFAULT_KH_QR);
                        setSubUsdqr(plan.usdqr || USD_QR_NONE);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs px-3 py-1.5 rounded border"
                      onClick={async () => {
                        try {
                          await updateSubscriptionPlan(plan.id, {
                            is_active: plan.is_active ? 0 : 1,
                          });
                          await loadSubscriptionPlans();
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Failed to update subscription plan"
                          );
                        }
                      }}
                    >
                      {plan.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      className="text-xs px-3 py-1.5 rounded border text-red-600"
                      onClick={async () => {
                        const ok = confirm("Remove this subscription plan?");
                        if (!ok) return;
                        try {
                          await deleteSubscriptionPlan(plan.id);
                          await loadSubscriptionPlans();
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Failed to delete subscription plan"
                          );
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      ) : null}

      {managementTab === "promotions" ? (
        <div className="rounded-xl border bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900">Promotion Combos</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {promotionPanel === "form" ? (
            <div className="space-y-3">
              <input
                className="border rounded-lg px-3 py-2 text-sm w-full"
                value={promotionTitle}
                onChange={(e) => setPromotionTitle(e.target.value)}
                placeholder="Promotion title"
              />
              <textarea
                className="border rounded-lg px-3 py-2 text-sm w-full min-h-[80px]"
                value={promotionDescription}
                onChange={(e) => setPromotionDescription(e.target.value)}
                placeholder="Description"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={promotionPrice}
                  onChange={(e) => setPromotionPrice(e.target.value)}
                  placeholder="Combo price"
                />
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={promotionOriginalPrice}
                  onChange={(e) => setPromotionOriginalPrice(e.target.value)}
                  placeholder="Original price (optional)"
                />
              </div>
              <input
                className="border rounded-lg px-3 py-2 text-sm w-full"
                value={promotionThumbnail}
                onChange={(e) => setPromotionThumbnail(e.target.value)}
                placeholder="Thumbnail URL"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Start at (optional)</div>
                  <input
                    type="datetime-local"
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                    value={promotionStartAt}
                    onChange={(e) => setPromotionStartAt(e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">End at (optional)</div>
                  <input
                    type="datetime-local"
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                    value={promotionEndAt}
                    onChange={(e) => setPromotionEndAt(e.target.value)}
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={promotionActive}
                  onChange={(e) => setPromotionActive(e.target.checked)}
                />
                Active
              </label>
              <div className="rounded-lg border p-3 space-y-3">
                <div className="text-sm font-medium text-gray-900">Promotion Payment QR</div>
                <p className="text-sm text-gray-600">
                  Payment QR is generated automatically at checkout from the promotion amount.
                </p>
              </div>
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-gray-900">Combo Items</div>
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-gray-100"
                    onClick={addPromotionItem}
                  >
                    Add item
                  </button>
                </div>
                {promotionItems.map((item) => {
                  const itemIdValue = item.item_id ?? 0;
                  const coursePlans =
                    item.item_type === "course" && item.item_id
                      ? (promotionCoursePlans[item.item_id] ?? [])
                      : [];
                  const productVariants =
                    item.item_type !== "course" && item.item_id
                      ? (promotionProductVariants[item.item_id] ?? [])
                      : [];
                  const itemProducts =
                    item.item_type === "tool" ? activeToolProducts : activeInventoryProducts;
                  return (
                    <div key={item.row_id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                      <div className="grid gap-2 md:grid-cols-4">
                        <select
                          className="border rounded-lg px-3 py-2 text-sm"
                          value={item.item_type}
                          onChange={(e) => {
                            const nextType = e.target.value as PromotionFormItem["item_type"];
                            updatePromotionItem(item.row_id, {
                              item_type: nextType,
                              item_id: null,
                              variant_id: null,
                              qty: 1,
                            });
                          }}
                        >
                          <option value="course">Video course</option>
                          <option value="tool">Tool</option>
                          <option value="product">Product</option>
                        </select>
                        <select
                          className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
                          value={itemIdValue}
                          onChange={(e) => {
                            const nextId = Number(e.target.value) || null;
                            updatePromotionItem(item.row_id, {
                              item_id: nextId,
                              variant_id: null,
                            });
                          }}
                        >
                          <option value={0}>Select item</option>
                          {item.item_type === "course"
                            ? activePromotionCourses.map((course) => (
                                <option key={`promo-course-${course.id}`} value={course.id}>
                                  {course.title}
                                </option>
                              ))
                            : itemProducts.map((product) => (
                                <option key={`promo-product-${product.id}`} value={product.id}>
                                  {product.title}
                                </option>
                              ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          className="border rounded-lg px-3 py-2 text-sm"
                          value={item.qty}
                          onChange={(e) => {
                            const nextQty = Math.max(1, Number(e.target.value) || 1);
                            updatePromotionItem(item.row_id, { qty: nextQty });
                          }}
                          placeholder="Qty"
                        />
                      </div>
                      <div className="grid gap-2 md:grid-cols-4">
                        <select
                          className="border rounded-lg px-3 py-2 text-sm md:col-span-3"
                          value={item.variant_id ?? 0}
                          onChange={(e) => {
                            const nextVariant = Number(e.target.value);
                            updatePromotionItem(item.row_id, {
                              variant_id: nextVariant > 0 ? nextVariant : null,
                            });
                          }}
                        >
                          <option value={0}>
                            {item.item_type === "course" ? "Select course plan" : "Select variant"}
                          </option>
                          {item.item_type === "course"
                            ? coursePlans
                                .filter((plan) => Number(plan.is_active) === 1)
                                .map((plan) => (
                                  <option key={`promo-plan-${plan.id}`} value={plan.id}>
                                    {plan.name} ({formatMoney(plan.price)})
                                  </option>
                                ))
                            : productVariants
                                .filter((variant) => Number(variant.is_active) === 1)
                                .map((variant) => (
                                  <option key={`promo-variant-${variant.id}`} value={variant.id}>
                                    {variant.duration_label || `Variant #${variant.id}`} (
                                    {formatMoney(variant.price)})
                                  </option>
                                ))}
                        </select>
                        <button
                          type="button"
                          className="text-xs px-3 py-2 rounded border text-red-600"
                          onClick={() => removePromotionItem(item.row_id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
                  disabled={savingPromotion}
                  onClick={async () => {
                    try {
                      setSavingPromotion(true);
                      await savePromotion();
                      await loadPromotions();
                      toast.success(editingPromotion ? "Promotion updated" : "Promotion created");
                      resetPromotionForm();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to save promotion");
                    } finally {
                      setSavingPromotion(false);
                    }
                  }}
                >
                  {savingPromotion
                    ? "Saving..."
                    : editingPromotion
                      ? "Save changes"
                      : "Add promotion"}
                </button>
                {editingPromotion ? (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border text-sm"
                    onClick={resetPromotionForm}
                    disabled={savingPromotion}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>
            ) : null}

            {promotionPanel === "results" ? (
            <div className="space-y-3">
              {promotions.length === 0 ? (
                <div className="text-sm text-gray-500">No promotions yet.</div>
              ) : (
                promotions.map((promo) => (
                  <div key={promo.id} className="rounded-xl border border-gray-200 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{promo.title}</div>
                        <div className="text-xs text-gray-500">
                          {promo.items?.length ?? 0} items
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          promo.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {promo.is_active ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {promo.description || "No description"}
                    </div>
                    <div className="text-sm text-gray-900 font-semibold">
                      {formatMoney(promo.price)}
                      {promo.original_price ? (
                        <span className="ml-2 text-xs text-gray-400 line-through">
                          {formatMoney(promo.original_price)}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Payment QR is generated automatically at checkout.
                    </div>
                    {promo.start_at || promo.end_at ? (
                      <div className="text-[11px] text-gray-500">
                        Window: {promo.start_at ? toDateTimeLocalValue(promo.start_at).replace("T", " ") : "now"} -{" "}
                        {promo.end_at ? toDateTimeLocalValue(promo.end_at).replace("T", " ") : "no end"}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs px-3 py-1.5 rounded border"
                        onClick={() => {
                          setPromotionPanel("form");
                          setEditingPromotion(promo);
                          setPromotionTitle(promo.title);
                          setPromotionDescription(promo.description || "");
                          setPromotionPrice(String(promo.price ?? ""));
                          setPromotionOriginalPrice(
                            promo.original_price === null || promo.original_price === undefined
                              ? ""
                              : String(promo.original_price)
                          );
                          setPromotionThumbnail(promo.thumbnail_url || "");
                          setPromotionKhqr(promo.khqr || DEFAULT_KH_QR);
                          setPromotionUsdqr(promo.usdqr || USD_QR_NONE);
                          setPromotionStartAt(toDateTimeLocalValue(promo.start_at));
                          setPromotionEndAt(toDateTimeLocalValue(promo.end_at));
                          setPromotionActive(promo.is_active === 1);
                          setPromotionItems(
                            (promo.items ?? []).length > 0
                              ? (promo.items ?? []).map((item) =>
                                  makePromotionFormItem({
                                    item_type: item.item_type,
                                    item_id: Number(item.item_id),
                                    variant_id:
                                      item.variant_id === null || item.variant_id === undefined
                                        ? null
                                        : Number(item.variant_id),
                                    qty: Math.max(1, Number(item.qty ?? 1)),
                                  })
                                )
                              : [makePromotionFormItem({ item_type: "tool" })]
                          );
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs px-3 py-1.5 rounded border"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/promotions/${promo.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({
                                title: promo.title,
                                description: promo.description ?? null,
                                price: Number(promo.price),
                                original_price: promo.original_price ?? null,
                                thumbnail_url: promo.thumbnail_url ?? null,
                                khqr: promo.khqr ?? null,
                                usdqr: promo.usdqr ?? null,
                                start_at: promo.start_at ?? null,
                                end_at: promo.end_at ?? null,
                                is_active: promo.is_active ? 0 : 1,
                                items: promo.items ?? [],
                              }),
                            });
                            const data: unknown = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              throw new Error(parseErrorMessage(data, "Failed to update promotion"));
                            }
                            await loadPromotions();
                            toast.success(promo.is_active ? "Promotion disabled" : "Promotion enabled");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to update promotion");
                          }
                        }}
                      >
                        {promo.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className="text-xs px-3 py-1.5 rounded border text-red-600"
                        onClick={async () => {
                          const ok = confirm("Delete this promotion?");
                          if (!ok) return;
                          try {
                            const res = await fetch(`/api/admin/promotions/${promo.id}`, {
                              method: "DELETE",
                              credentials: "include",
                            });
                            const data: unknown = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              throw new Error(parseErrorMessage(data, "Failed to delete promotion"));
                            }
                            await loadPromotions();
                            if (editingPromotion?.id === promo.id) {
                              resetPromotionForm();
                            }
                            toast.success("Promotion deleted");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to delete promotion");
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-2 sm:items-center sm:p-4">
          <div className="flex w-full max-w-md flex-col rounded-xl bg-white shadow-lg max-h-[calc(100vh-2rem)]">
            <div className="border-b p-4 text-lg font-semibold">Create course</div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 overscroll-contain">
            <input
              className="border rounded-lg px-3 py-2 text-sm w-full"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Title"
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm w-full"
              value={createSlug}
              onChange={(e) => setCreateSlug(e.target.value)}
              placeholder="Slug"
            />
            <select
              className="border rounded-lg px-3 py-2 text-sm w-full"
              value={createLevel}
              onChange={(e) => setCreateLevel(e.target.value as Level)}
            >
              <option value="beginner">Beginner</option>
              <option value="advanced">Advanced</option>
              <option value="pro">Pro</option>
            </select>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white p-4">
              <button
                className="px-3 py-2 rounded-lg border text-sm"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-black text-white text-sm"
                onClick={createCourse}
                disabled={savingCourse}
              >
                {savingCourse ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

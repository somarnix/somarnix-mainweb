"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  PlayCircle,
  Star,
  Clock,
  BookOpen,
  Users,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { PreviewVideoPage, PreviewLesson } from "./PreviewVideoPage";
import { QRPaymentModal } from "../../components/QRPaymentModal";
import { ShareButton } from "../../components/ShareButton";
import { useAuth } from "../../contexts/AuthContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { toast } from "sonner";

interface VideoDetailPageProps {
  slug: string;
  onNavigate: (page: string) => void;
  onBack?: () => void;
  onOpenOrderDetail?: (orderId: number | string) => void;
  onOpenSellerBlog?: (sellerId: number | string) => void;
}

type ApiLesson = {
  id: number;
  section_id: number;
  title: string;
  video_url: string | null;
  duration_label: string | null;
  position: number;
  is_free_preview: boolean;
  is_locked: boolean;
};

type ApiSection = {
  id: number;
  title: string;
  position: number;
};

type ApiPlan = {
  id: number;
  name: string;
  access_type: string;
  duration_days: number | null;
  price: number | string;
  max_devices?: number;
  is_unlimited_device?: number;
  khqr?: string | null;
  usdqr?: string | null;
};

type ApiSubscriptionPlan = {
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
};

type ApiCourse = {
  id: number;
  title: string;
  slug: string;
  posted_by?: number | null;
  posted_by_username?: string | null;
  telegram_url?: string | null;
  description: string | null;
  level: string;
  category: string | null;
  tags: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  rating: number | string | null;
  rating_count: number | null;
  students_count: number | null;
  upload_date: string | null;
  thumbnail_url: string | null;
  hero_url: string | null;
  learning_outcomes?: string | null;
  preview_mode: "count" | "manual";
  preview_count: number;
};

type ApiAccess = {
  has_access: boolean;
  has_subscription: boolean;
  has_course_access: boolean;
  preview_mode: "count" | "manual";
  preview_count: number;
  active_subscription_plan_id?: number | null;
  pending_subscription_plan_id?: number | null;
  active_course_plan_id?: number | null;
  pending_course_plan_id?: number | null;
  lifetime_course_purchased?: boolean;
  course_order_number?: string | null;
};

type PendingPurchase = {
  type: "course" | "subscription";
  planId: number;
  price: number;
  label: string;
  khqr?: string | null;
  usdqr?: string | null;
};

export function VideoDetailPage({
  slug,
  onNavigate,
  onBack,
  onOpenOrderDetail,
  onOpenSellerBlog,
}: VideoDetailPageProps) {
  const GLOBAL_LOGIN_MAX_DEVICES = 10;
  const getVideoDeviceId = (): string => {
    if (typeof window === "undefined") return "";
    const key = "somarnix_video_device_id";
    const existing = window.localStorage.getItem(key);
    if (existing && existing.trim()) return existing;
    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(key, created);
    return created;
  };

  const parseDurationLabelToSeconds = (raw: string | null | undefined): number => {
    if (!raw) return 0;
    const label = raw.trim().toLowerCase();
    if (!label) return 0;

    // Supports hh:mm:ss and mm:ss
    if (label.includes(":")) {
      const parts = label.split(":").map((part) => Number(part.trim()));
      if (parts.length >= 2 && parts.length <= 3 && parts.every((value) => Number.isFinite(value))) {
        if (parts.length === 3) {
          return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return parts[0] * 60 + parts[1];
      }
    }

    // Supports "1h 20m", "20 min", "45 sec", etc.
    let matched = false;
    let total = 0;
    const regex =
      /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)\b/g;
    let token: RegExpExecArray | null;
    while ((token = regex.exec(label)) !== null) {
      matched = true;
      const value = Number(token[1]);
      const unit = token[2];
      if (!Number.isFinite(value)) continue;
      if (unit.startsWith("h")) total += value * 3600;
      else if (unit.startsWith("m")) total += value * 60;
      else total += value;
    }
    if (matched) return Math.round(total);

    // Bare number is assumed to be minutes (admin commonly inputs "5", "20")
    const onlyNumber = Number(label);
    if (Number.isFinite(onlyNumber) && onlyNumber > 0) {
      return Math.round(onlyNumber * 60);
    }

    return 0;
  };

  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { language, t } = useLanguage();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [sections, setSections] = useState<ApiSection[]>([]);
  const [lessons, setLessons] = useState<ApiLesson[]>([]);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<ApiSubscriptionPlan[]>([]);
  const [access, setAccess] = useState<ApiAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCoursePlanId, setSelectedCoursePlanId] = useState<number | null>(null);
  const [selectedSubscriptionPlanId, setSelectedSubscriptionPlanId] = useState<number | null>(null);
  const [purchasePending, setPurchasePending] = useState<PendingPurchase | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // ✅ preview open/close
  const [openPreview, setOpenPreview] = useState(false);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);

  const previewLessons: PreviewLesson[] = useMemo(() => {
    return lessons
      .filter((lesson) => !lesson.is_locked && !!lesson.video_url)
      .map((lesson) => ({
        id: String(lesson.id),
        title: lesson.title,
        time: lesson.duration_label ?? "",
        youtubeUrl: lesson.video_url ?? "",
      }));
  }, [lessons]);

  const openPreviewWithLesson = (lessonId?: string) => {
    if (previewLessons.length === 0) {
      toast.error(t("courses.noPreviewLessons"));
      return;
    }
    setPreviewLessonId(lessonId ?? previewLessons[0]?.id ?? null);
    setOpenPreview(true);
  };

  const courseSections = useMemo(() => {
    const orderedSections = [...sections].sort((a, b) => a.position - b.position);
    return orderedSections.map((section) => {
      const sectionLessons = lessons
        .filter((lesson) => lesson.section_id === section.id)
        .sort((a, b) => a.position - b.position);
      return {
        id: section.id,
        title: section.title,
        lectures: sectionLessons.length,
        length: t("courseDetail.sectionLessons", {
          count: sectionLessons.length,
        }),
        lessons: sectionLessons,
      };
    });
  }, [lessons, sections, t]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSelectedCoursePlanId(null);
      setSelectedSubscriptionPlanId(null);
      setPurchasePending(null);
      setShowPaymentModal(false);
      try {
        const deviceId = getVideoDeviceId();
        const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : "";
        const res = await fetch(`/api/video-courses/${encodeURIComponent(slug)}${query}`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || t("courseDetail.courseNotFound"));
        }
        setCourse(data.course ?? null);
        setSections(Array.isArray(data.sections) ? data.sections : []);
        setLessons(Array.isArray(data.lessons) ? data.lessons : []);
        setPlans(Array.isArray(data.plans) ? data.plans : []);
        setSubscriptionPlans(
          Array.isArray(data.subscription_plans) ? data.subscription_plans : []
        );
        setAccess(data.access ?? null);
        setLoadError(null);
      } catch (err) {
        setCourse(null);
        setSections([]);
        setLessons([]);
        setPlans([]);
        setSubscriptionPlans([]);
        setAccess(null);
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, t]);

  const [showAllSections, setShowAllSections] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const totalSections = courseSections.length;

  const totalLectures = useMemo(() => {
    return courseSections.reduce((sum, s) => sum + (s.lectures ?? s.lessons.length), 0);
  }, [courseSections]);

  const totalDurationText = useMemo(() => {
    const seconds = lessons.reduce((sum, lesson) => {
      return sum + parseDurationLabelToSeconds(lesson.duration_label);
    }, 0);

    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    }
    return `${minutes}m`;
  }, [lessons]);
  const visibleSections = showAllSections ? courseSections : courseSections.slice(0, 10);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    visibleSections.forEach((s) => (next[s.title] = true));
    setOpenSections((prev) => ({ ...prev, ...next }));
  };

  const collapseAll = () => {
    const next = { ...openSections };
    visibleSections.forEach((s) => delete next[s.title]);
    setOpenSections(next);
  };

  const tagList = useMemo(() => {
    const raw = typeof course?.tags === "string" ? course.tags : "";
    return raw
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }, [course?.tags]);

  const learningOutcomes = useMemo(() => {
    const raw = typeof course?.learning_outcomes === "string" ? course.learning_outcomes : "";
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [course?.learning_outcomes]);

  const ratingValue = Number(course?.rating ?? 0);
  const ratingCount = Number(course?.rating_count ?? 0);
  const studentsCount = Number(course?.students_count ?? 0);
  const uploadDate = course?.upload_date ? new Date(course.upload_date) : null;
  const heroImage =
    course?.hero_url || course?.thumbnail_url || "/placeholder.png";
  const courseContactUrl =
    (typeof course?.telegram_url === "string" && course.telegram_url.trim()
      ? course.telegram_url.trim()
      : null) ||
    (process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_URL || "/support");

  const selectedCoursePlan = useMemo(() => {
    if (!plans.length) return null;
    const found = plans.find((plan) => plan.id === selectedCoursePlanId);
    return found ?? plans[0] ?? null;
  }, [plans, selectedCoursePlanId]);
  const lifetimeCoursePurchased = !!access?.lifetime_course_purchased;
  const canBuyCoursePlan = !lifetimeCoursePurchased && !!selectedCoursePlan && !purchaseLoading;

  const selectedSubscriptionPlan = useMemo(() => {
    if (!subscriptionPlans.length) return null;
    const found = subscriptionPlans.find((plan) => plan.id === selectedSubscriptionPlanId);
    return found ?? subscriptionPlans[0] ?? null;
  }, [subscriptionPlans, selectedSubscriptionPlanId]);

  useEffect(() => {
    if (plans.length > 0 && !selectedCoursePlanId) {
      setSelectedCoursePlanId(plans[0].id);
    }
  }, [plans, selectedCoursePlanId]);

  useEffect(() => {
    if (subscriptionPlans.length > 0 && !selectedSubscriptionPlanId) {
      setSelectedSubscriptionPlanId(subscriptionPlans[0].id);
    }
  }, [subscriptionPlans, selectedSubscriptionPlanId]);

  useEffect(() => {
    if (access?.pending_subscription_plan_id) {
      setShowSubscriptionModal(false);
    }
  }, [access?.pending_subscription_plan_id]);

  const minCoursePrice = useMemo(() => {
    if (!plans.length) return 0;
    const prices = plans.map((plan) => Number(plan.price)).filter((p) => Number.isFinite(p));
    return prices.length ? Math.min(...prices) : 0;
  }, [plans]);

  const formatDisplayDate = (value: Date | null) => {
    if (!value || Number.isNaN(value.getTime())) {
      return t("courseDetail.notAvailable");
    }
    return value.toLocaleDateString(language === "km" ? "km-KH" : "en-US");
  };

  const formatPlanDuration = (days?: number | null) => {
    if (!days) return "";
    if (days % 365 === 0) {
      const years = days / 365;
      return `${years} ${t(years > 1 ? "courseDetail.years" : "courseDetail.year")}`;
    }
    if (days % 30 === 0) {
      const months = days / 30;
      return `${months} ${t(months > 1 ? "courseDetail.months" : "courseDetail.month")}`;
    }
    return `${days} ${t(days > 1 ? "courseDetail.days" : "courseDetail.day")}`;
  };

  const splitFeatureLines = (value?: string | null) => {
    if (!value) return [];
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  };

  const formatCoursePlanLabel = (plan: ApiPlan) => {
    if (plan.access_type === "lifetime") return t("courseDetail.lifetimeAccess");
    const duration = formatPlanDuration(plan.duration_days);
    return duration
      ? t("courseDetail.durationAccess", { duration })
      : t("courseDetail.limitedAccess");
  };

  const formatCoursePlanDeviceLabel = (plan: ApiPlan) => {
    const isUnlimited = Number(plan.is_unlimited_device ?? 0) === 1;
    const raw = Number(plan.max_devices ?? 0);
    const itemMax = isUnlimited
      ? GLOBAL_LOGIN_MAX_DEVICES
      : Number.isFinite(raw) && raw > 0
        ? Math.floor(raw)
        : 1;
    const effective = Math.min(itemMax, GLOBAL_LOGIN_MAX_DEVICES);
    if (isUnlimited) {
      return t("courseDetail.unlimitedDevices", {
        count: GLOBAL_LOGIN_MAX_DEVICES,
      });
    }
    return t("courseDetail.maxDevices", { count: effective });
  };

  const openSellerBlog = (sellerKey: string | number | null | undefined) => {
    if (sellerKey === null || sellerKey === undefined) return;
    const normalizedSellerKey = String(sellerKey).trim();
    if (!normalizedSellerKey) return;
    if (onOpenSellerBlog) {
      onOpenSellerBlog(normalizedSellerKey);
      return;
    }
    window.location.href = `/blog/${encodeURIComponent(normalizedSellerKey)}`;
  };

  const handlePurchase = async (
    type: "course" | "subscription",
    plan: ApiPlan | ApiSubscriptionPlan | null
  ) => {
    if (purchaseLoading) return;
    if (!plan) {
      toast.error(t("courseDetail.selectPlan"));
      return;
    }
    if (!user) {
      toast.error(t("courseDetail.loginToContinue"));
      onNavigate("login");
      return;
    }
    if (access?.has_subscription && type === "subscription") {
      toast.info(t("courseDetail.alreadyActiveSubscription"));
      return;
    }

    const price = Number(plan.price ?? 0);
    if (!Number.isFinite(price)) {
      toast.error(t("courseDetail.invalidPlanPrice"));
      return;
    }

    if (type === "course") {
      if (!course?.id) {
        toast.error(t("courseDetail.courseNotFound"));
        return;
      }
      try {
        setPurchaseLoading(true);
        const res = await fetch("/api/cart/add-video-course", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: Number(course.id),
            planId: Number(plan.id),
            qty: 1,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (data && typeof data.error === "string" ? data.error : null) ||
              t("courseDetail.failedAddToCart")
          );
        }
        toast.success(t("courseDetail.addedToCart"));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart:changed"));
        }
        onNavigate("cart");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("courseDetail.failedAddToCart");
        toast.error(message);
      } finally {
        setPurchaseLoading(false);
      }
      return;
    }

    const label = t("courseDetail.subscriptionLabel", { name: plan.name });

    if (price <= 0) {
      await submitPurchase(type, plan.id, {
        accountName: "FREE ORDER",
        accountNumber: "0000",
        paymentApv: "FREE",
        method: "manual",
        dateTimePay: new Date().toISOString(),
      });
      return;
    }

    setPurchasePending({
      type,
      planId: plan.id,
      price,
      label,
      khqr: "khqr" in plan ? plan.khqr ?? null : null,
      usdqr: "usdqr" in plan ? plan.usdqr ?? null : null,
    });
    setShowPaymentModal(true);
  };

  const submitPurchase = async (
    type: "course" | "subscription",
    planId: number,
    paymentInfo: {
      accountName: string;
      accountNumber: string;
      paymentApv: string;
      method: string;
      dateTimePay: string;
    }
  ) => {
    if (purchaseLoading) return;
    setPurchaseLoading(true);
    try {
      const endpoint =
        type === "course"
          ? `/api/video-courses/${encodeURIComponent(slug)}/purchase`
          : "/api/video-subscriptions/purchase";
      const res1 = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data1 = await res1.json();
      if (!res1.ok) {
        throw new Error(data1?.error || t("courseDetail.failedCreateOrder"));
      }

      const orderId = data1.orderId;
      const res2 = await fetch("/api/payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          accountName: paymentInfo.accountName,
          accountNumber: paymentInfo.accountNumber,
          paymentApv: paymentInfo.paymentApv,
          method: paymentInfo.method,
          paidAt: paymentInfo.dateTimePay,
        }),
      });
      const data2 = await res2.json();
      if (!res2.ok) {
        throw new Error(data2?.error || t("courseDetail.paymentFailed"));
      }

      toast.success(t("courseDetail.orderCreated"));
      setShowPaymentModal(false);
      setPurchasePending(null);
      if (onOpenOrderDetail) {
        onOpenOrderDetail(orderId);
      } else {
        onNavigate("orders");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("courseDetail.purchaseFailed");
      toast.error(message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="video-blog-page min-h-screen bg-gray-50">
        <div className="w-full px-4 lg:px-8 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            {t("common.loading")}
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !course) {
    return (
      <div className="video-blog-page min-h-screen bg-gray-50">
        <div className="w-full px-4 lg:px-8 py-10">
          <button
            onClick={() => (onBack ? onBack() : onNavigate("blog"))}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("courseDetail.backToVideos")}
          </button>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            {loadError || t("courseDetail.videoNotFound")}
          </div>
        </div>
      </div>
    );
  }

  // ✅ If preview open, show preview page
  if (openPreview) {
    return (
      <PreviewVideoPage
        courseTitle={course.title}
        lessons={previewLessons}
        initialLessonId={previewLessonId ?? undefined}
        onBack={() => setOpenPreview(false)}
      />
    );
  }

  return (
    <div className="video-blog-page min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT */}
          <section className="lg:col-span-8 min-w-0 space-y-6">
            {/* HERO */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/40 dark:border-slate-700/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />

              <div className="relative p-7 sm:p-9">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => (onBack ? onBack() : onNavigate("blog"))}
                    className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t("courseDetail.backToVideos")}
                  </button>
                  <ShareButton
                    path={`/courses/${encodeURIComponent(course.slug)}`}
                    title={course.title}
                    text={course.description || course.title}
                    imageUrl={heroImage}
                    price={minCoursePrice}
                    sellerName={
                      (typeof course.posted_by_username === "string" &&
                      course.posted_by_username.trim().length > 0
                        ? course.posted_by_username.trim()
                        : "") ||
                      course.author_name ||
                      t("labels.instructor")
                    }
                    sellerLogoUrl={course.author_avatar_url}
                    stockBadge="Available"
                    buyUrl={`/courses/${encodeURIComponent(course.slug)}`}
                    contactUrl={courseContactUrl}
                    label={t("share.button")}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/15"
                    iconClassName="h-4 w-4"
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-500/15 text-emerald-200 px-3 py-1 text-xs font-semibold ring-1 ring-emerald-400/20">
                    {t("courseDetail.bestseller")}
                  </span>
                  {course.category ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/10">
                      {course.category}
                    </span>
                  ) : null}
                </div>

                {course.category || tagList.length ? (
                  <div className="mt-4 text-[11px] text-slate-300">
                    {[course.category, ...tagList.slice(0, 2)]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                ) : null}

                <h1 className="mt-3 text-2xl md:text-3xl font-semibold leading-tight">
                  {course.title}
                </h1>

                <p className="mt-3 text-sm text-slate-200/90">{course.description}</p>

                <div className="mt-4 text-xs text-slate-300">
                  {t("courseDetail.createdBy")}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      openSellerBlog(course.posted_by_username || Number(course.posted_by ?? 0))
                    }
                    disabled={!course.posted_by && !course.posted_by_username}
                    className="text-white font-semibold underline-offset-2 hover:underline disabled:no-underline"
                  >
                    {course.author_name || t("labels.instructor")}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-300/80">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {t("courseDetail.lastUpdated")} {formatDisplayDate(uploadDate)}
                  </span>
                  <span>{t("courseDetail.languageEnglish")}</span>
                  <span>{t("courseDetail.languageArabicAuto")}</span>
                  <span>{t("courseDetail.moreLanguages", { count: 21 })}</span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-slate-300/70">{t("courseDetail.rating")}</div>
                    <div className="mt-1 inline-flex items-center gap-1 text-white font-semibold">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {ratingValue.toFixed(1)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300/80">
                      {t("courseDetail.ratings", { count: ratingCount })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-slate-300/70">{t("courseDetail.learners")}</div>
                    <div className="mt-1 text-white font-semibold">
                      {studentsCount.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300/80">{t("courseDetail.students")}</div>
                  </div>

                  <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-slate-300/70">{t("courseDetail.updated")}</div>
                    <div className="mt-1 text-white font-semibold">
                      {formatDisplayDate(uploadDate)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300/80">{t("courseDetail.latestVersion")}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* content cards remain the same… */}
            {/* ✅ (keep your remaining code exactly below this point) */}
            {/* I didn't remove anything – only preview connection added */}
            {/* --- YOUR SAME UI CONTINUES --- */}

            {/* WHAT YOU'LL LEARN */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("courseDetail.whatYouWillLearn")}</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t("courseDetail.keyOutcomes")}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-700 dark:text-gray-300">
                {learningOutcomes.map((outcome) => (
                  <div key={outcome} className="flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
                    <PlayCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span>{outcome}</span>
                  </div>
                ))}
                {learningOutcomes.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t("courseDetail.noKeyOutcomes")}</div>
                ) : null}
              </div>
            </div>

            {/* TOPICS */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("courseDetail.relatedTopics")}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {tagList.length ? (
                  tagList.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">{t("courseDetail.noTags")}</span>
                )}
              </div>
            </div>

            {/* COURSE CONTENT */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t("courseDetail.courseContent")}</h2>
                  <p className="text-xs text-gray-500">
                    {t("courseDetail.contentSummary", {
                      sections: totalSections,
                      lectures: totalLectures,
                      duration: totalDurationText,
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAll}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {t("courseDetail.expandAll")}
                  </button>
                  <button
                    onClick={collapseAll}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {t("courseDetail.collapseAll")}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {visibleSections.map((section) => {
                  const isOpen = !!openSections[section.title];

                  return (
                    <div key={section.title} className="rounded-2xl border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{section.title}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {t("courseDetail.sectionSummary", {
                              lectures: section.lectures,
                              length: section.length,
                            })}
                          </div>
                        </div>

                        <ChevronDown
                          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t border-gray-100 px-4 py-3">
                          <div className="space-y-2">
                            {section.lessons.map((lesson) => {
                              return (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"
                              >
                                <span className="min-w-0 truncate text-sm text-gray-700">{lesson.title}</span>
                                {!lesson.is_locked && lesson.video_url ? (
                                  <button
                                    type="button"
                                    onClick={() => openPreviewWithLesson(String(lesson.id))}
                                    className="text-xs font-semibold text-blue-600 whitespace-nowrap hover:underline"
                                  >
                                    {t("courseDetail.previewDuration", {
                                      duration: lesson.duration_label ?? "",
                                    })}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {lesson.is_locked ? t("courseDetail.locked") : lesson.duration_label ?? ""}
                                  </span>
                                )}
                              </div>
                            );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* RIGHT (STICKY) */}
          <aside className="lg:col-span-4 lg:self-start">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm lg:sticky lg:top-24">
              {/* ✅ CLICK TO OPEN PREVIEW PAGE */}
              <button
                type="button"
                onClick={() => openPreviewWithLesson(previewLessons[0]?.id)}
                className="w-full text-left disabled:cursor-not-allowed disabled:opacity-70"
                disabled={previewLessons.length === 0}
              >
                <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative">
                  <img
                    src={heroImage}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/95 text-blue-600 flex items-center justify-center shadow">
                      <PlayCircle className="w-7 h-7" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t("courseDetail.previewCourse")}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t("courseDetail.previewSampleCount", {
                    count: previewLessons.length,
                  })}
                </div>
              </button>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t("courseDetail.coursePrice")}</div>
                  <div className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                    {minCoursePrice === 0 ? t("courseDetail.free") : formatPrice(minCoursePrice)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {ratingValue.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">{t("courseDetail.ratings", { count: ratingCount })}</div>
                </div>
              </div>

              {access?.has_access ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {t("courseDetail.alreadyHasAccess")}
                </div>
              ) : null}
              {lifetimeCoursePurchased ? (
                <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  {t("courseDetail.lifetimePurchased")}
                  {access?.course_order_number
                    ? ` ${t("courseDetail.orderNo", {
                        orderNo: access.course_order_number,
                      })}`
                    : ""}
                </div>
              ) : null}

              {plans.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-gray-700">{t("courseDetail.coursePlans")}</div>
                  {plans.map((plan) => {
                    const active = plan.id === selectedCoursePlanId;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedCoursePlanId(plan.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                          active
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{plan.name}</div>
                            <div className="text-[11px] text-gray-500">
                              {formatCoursePlanLabel(plan)}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {formatCoursePlanDeviceLabel(plan)}
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-gray-900">
                            {Number(plan.price ?? 0) === 0
                              ? t("courseDetail.free")
                              : formatPrice(Number(plan.price))}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 text-sm font-semibold hover:opacity-95 disabled:opacity-60"
                    onClick={() => handlePurchase("course", selectedCoursePlan)}
                    disabled={!canBuyCoursePlan}
                  >
                    {lifetimeCoursePurchased
                      ? t("courseDetail.lifetimeAlreadyPurchased")
                      : access?.has_course_access
                        ? t("courseDetail.addUpgradeToCart")
                        : t("courseDetail.addCourseToCart")}
                  </button>
                </div>
              )}

              {subscriptionPlans.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-gray-700">{t("courseDetail.subscriptionPlans")}</div>
                  {subscriptionPlans.map((plan) => {
                    const active = plan.id === selectedSubscriptionPlanId;
                    const isCurrent = access?.active_subscription_plan_id === plan.id;
                    const isPending = access?.pending_subscription_plan_id === plan.id;
                    const durationLabel = formatPlanDuration(plan.duration_days);
                    const features = splitFeatureLines(plan.features);
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedSubscriptionPlanId(plan.id)}
                        className={`w-full rounded-xl border px-3 py-3 text-left text-xs transition ${
                          active
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-900 truncate">{plan.name}</div>
                              {isCurrent ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-900 text-white">
                                  {t("courseDetail.current")}
                                </span>
                              ) : null}
                              {isPending ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                  {t("courseDetail.pending")}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {durationLabel || t("courseDetail.subscription")}
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-gray-900">
                            {Number(plan.price ?? 0) === 0
                              ? t("courseDetail.free")
                              : formatPrice(Number(plan.price))}
                          </div>
                        </div>
                        {plan.description ? (
                          <div className="mt-2 text-[11px] text-gray-600">{plan.description}</div>
                        ) : null}
                        {features.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-[11px] text-gray-600">
                            {features.map((item, idx) => (
                              <li key={`${plan.id}-feature-${idx}`}>• {item}</li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                          {plan.access_courses ? t("courseDetail.allCourses") : null}
                          {plan.access_ai_tools ? t("courseDetail.aiTools") : null}
                          {plan.access_downloads ? t("courseDetail.downloads") : null}
                        </div>
                      </button>
                    );
                  })}

                  <button
                    className="w-full rounded-xl border border-emerald-200 text-emerald-700 py-3 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-60"
                    onClick={() => {
                      if (access?.pending_subscription_plan_id) return;
                      setShowSubscriptionModal(true);
                    }}
                    disabled={
                      purchaseLoading ||
                      !!access?.pending_subscription_plan_id ||
                      subscriptionPlans.length === 0
                    }
                  >
                    {access?.has_subscription
                      ? t("courseDetail.currentPlanActive")
                      : access?.pending_subscription_plan_id
                        ? t("courseDetail.pendingApproval")
                        : t("courseDetail.subscribeAllCourses")}
                  </button>
                </div>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <Clock className="w-4 h-4 mx-auto text-gray-700" />
                  <div className="mt-1 text-[11px] text-gray-600">{t("courseDetail.duration")}</div>
                  <div className="text-xs font-semibold text-gray-900">{totalDurationText}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <BookOpen className="w-4 h-4 mx-auto text-gray-700" />
                  <div className="mt-1 text-[11px] text-gray-600">{t("courseDetail.lessons")}</div>
                  <div className="text-xs font-semibold text-gray-900">{totalLectures}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <Users className="w-4 h-4 mx-auto text-gray-700" />
                  <div className="mt-1 text-[11px] text-gray-600">{t("courseDetail.students")}</div>
                  <div className="text-xs font-semibold text-gray-900">
                    {studentsCount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div className="text-xs text-gray-600">{t("courseDetail.moneyBackAndLifetime")}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showPaymentModal && purchasePending ? (
        <QRPaymentModal
          amount={purchasePending.price}
          onClose={() => {
            setShowPaymentModal(false);
            setPurchasePending(null);
          }}
          onSuccess={(paymentInfo) =>
            submitPurchase(
              purchasePending.type,
              purchasePending.planId,
              paymentInfo
            )
          }
          productTitle={course.title}
          variantLabel={purchasePending.label}
          khqrUrl={purchasePending.khqr ?? undefined}
          usdQrUrl={
            purchasePending.usdqr && purchasePending.usdqr !== "none"
              ? purchasePending.usdqr
              : undefined
          }
        />
      ) : null}

      {showSubscriptionModal ? (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setShowSubscriptionModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{t("courseDetail.choosePlan")}</div>
                  <div className="text-xs text-gray-500">{t("courseDetail.pickSubscription")}</div>
                </div>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowSubscriptionModal(false)}
                >
                  &times;
                </button>
              </div>
              <div className="px-6 py-5 grid gap-4 md:grid-cols-3">
                {subscriptionPlans.map((plan) => {
                  const active = plan.id === selectedSubscriptionPlanId;
                  const isCurrent = access?.active_subscription_plan_id === plan.id;
                  const isPending = access?.pending_subscription_plan_id === plan.id;
                  const durationLabel = formatPlanDuration(plan.duration_days);
                  const features = splitFeatureLines(plan.features);
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className={`text-left rounded-2xl border p-5 transition ${
                        active
                          ? "border-gray-900 ring-2 ring-gray-900"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedSubscriptionPlanId(plan.id)}
                    >
                      <div className="text-xl font-semibold text-gray-900">{plan.name}</div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <div className="text-3xl font-semibold text-gray-900">
                          {Number(plan.price ?? 0) === 0
                            ? "$0"
                            : formatPrice(Number(plan.price))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {durationLabel || t("courseDetail.perMonth")}
                        </div>
                      </div>
                      {isCurrent ? (
                        <div className="mt-2 inline-flex items-center rounded-full bg-gray-900 px-3 py-1 text-[11px] text-white">
                          {t("courseDetail.yourCurrentPlan")}
                        </div>
                      ) : null}
                      {isPending ? (
                        <div className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] text-amber-700">
                          {t("courseDetail.pendingApproval")}
                        </div>
                      ) : null}
                      {plan.description ? (
                        <div className="mt-3 text-sm text-gray-700">{plan.description}</div>
                      ) : null}
                      {features.length > 0 ? (
                        <ul className="mt-4 space-y-2 text-xs text-gray-600">
                          {features.map((item, idx) => (
                            <li key={`${plan.id}-feature-${idx}`}>• {item}</li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-5">
                        <div
                          className={`w-full rounded-full border px-4 py-2 text-center text-sm font-semibold ${
                            isCurrent
                              ? "border-gray-900 bg-gray-900 text-white"
                              : active
                                ? "border-gray-900 bg-gray-900 text-white"
                                : "border-gray-200 text-gray-700"
                          }`}
                        >
                          {isCurrent
                            ? t("courseDetail.currentPlan")
                            : active
                              ? t("courseDetail.selected")
                              : t("courseDetail.choosePlanButton")}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="border-t px-6 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {t("courseDetail.total")}{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedSubscriptionPlan
                      ? formatPrice(Number(selectedSubscriptionPlan.price ?? 0))
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border text-sm"
                    onClick={() => setShowSubscriptionModal(false)}
                  >
                    {t("courseDetail.close")}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                    disabled={
                      !selectedSubscriptionPlan ||
                      access?.has_subscription ||
                      !!access?.pending_subscription_plan_id
                    }
                    onClick={() => {
                      setShowSubscriptionModal(false);
                      void handlePurchase("subscription", selectedSubscriptionPlan);
                    }}
                  >
                    {access?.has_subscription
                      ? t("courseDetail.currentPlanActive")
                      : access?.pending_subscription_plan_id
                        ? t("courseDetail.pendingApproval")
                        : t("courseDetail.continue")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

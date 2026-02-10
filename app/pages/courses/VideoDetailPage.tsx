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
import { useAuth } from "../../contexts/AuthContext";
import { useCurrency } from "../../contexts/CurrencyContext";
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
      toast.error("No preview lessons available");
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
        length: `${sectionLessons.length} lessons`,
        lessons: sectionLessons,
      };
    });
  }, [lessons, sections]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSelectedCoursePlanId(null);
      setSelectedSubscriptionPlanId(null);
      setPurchasePending(null);
      setShowPaymentModal(false);
      try {
        const res = await fetch(`/api/video-courses/${encodeURIComponent(slug)}`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Course not found");
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
  }, [slug]);

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

  const selectedCoursePlan = useMemo(() => {
    if (!plans.length) return null;
    const found = plans.find((plan) => plan.id === selectedCoursePlanId);
    return found ?? plans[0] ?? null;
  }, [plans, selectedCoursePlanId]);

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

  const formatPlanDuration = (days?: number | null) => {
    if (!days) return "";
    if (days % 365 === 0) {
      const years = days / 365;
      return `${years} year${years > 1 ? "s" : ""}`;
    }
    if (days % 30 === 0) {
      const months = days / 30;
      return `${months} month${months > 1 ? "s" : ""}`;
    }
    return `${days} days`;
  };

  const splitFeatureLines = (value?: string | null) => {
    if (!value) return [];
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  };

  const formatCoursePlanLabel = (plan: ApiPlan) => {
    if (plan.access_type === "lifetime") return "Lifetime access";
    const duration = formatPlanDuration(plan.duration_days);
    return duration ? `${duration} access` : "Limited access";
  };

  const openSellerBlog = (sellerId: number | null | undefined) => {
    if (!sellerId || sellerId <= 0) return;
    if (onOpenSellerBlog) {
      onOpenSellerBlog(sellerId);
      return;
    }
    window.location.href = `/blog/${encodeURIComponent(String(sellerId))}`;
  };

  const handlePurchase = async (
    type: "course" | "subscription",
    plan: ApiPlan | ApiSubscriptionPlan | null
  ) => {
    if (purchaseLoading) return;
    if (!plan) {
      toast.error("Please select a plan");
      return;
    }
    if (!user) {
      toast.error("Please login to continue");
      onNavigate("login");
      return;
    }
    if (access?.has_subscription && type === "subscription") {
      toast.info("You already have an active subscription");
      return;
    }

    const price = Number(plan.price ?? 0);
    if (!Number.isFinite(price)) {
      toast.error("Invalid plan price");
      return;
    }

    const label =
      type === "course"
        ? `Course plan - ${plan.name}`
        : `Subscription - ${plan.name}`;

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
        throw new Error(data1?.error || "Failed to create order");
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
        throw new Error(data2?.error || "Payment failed");
      }

      toast.success("Order created successfully");
      setShowPaymentModal(false);
      setPurchasePending(null);
      if (onOpenOrderDetail) {
        onOpenOrderDetail(orderId);
      } else {
        onNavigate("orders");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
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
            Loading...
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
            Back to videos
          </button>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            {loadError || "Video not found."}
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
    <div className="video-blog-page min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT */}
          <section className="lg:col-span-8 min-w-0 space-y-6">
            {/* HERO */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />

              <div className="relative p-7 sm:p-9">
                <button
                  onClick={() => (onBack ? onBack() : onNavigate("blog"))}
                  className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to videos
                </button>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-500/15 text-emerald-200 px-3 py-1 text-xs font-semibold ring-1 ring-emerald-400/20">
                    Bestseller
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
                  Created by{" "}
                  <button
                    type="button"
                    onClick={() => openSellerBlog(Number(course.posted_by ?? 0))}
                    disabled={!course.posted_by}
                    className="text-white font-semibold underline-offset-2 hover:underline disabled:no-underline"
                  >
                    {course.author_name || "Instructor"}
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-300/80">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Last updated {uploadDate ? uploadDate.toLocaleDateString() : "N/A"}
                  </span>
                  <span>English</span>
                  <span>Arabic (Auto)</span>
                  <span>21 more</span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-slate-300/70">Rating</div>
                    <div className="mt-1 inline-flex items-center gap-1 text-white font-semibold">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {ratingValue.toFixed(1)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300/80">
                      {ratingCount} ratings
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-slate-300/70">Learners</div>
                    <div className="mt-1 text-white font-semibold">
                      {studentsCount.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300/80">Students</div>
                  </div>

                  <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-slate-300/70">Updated</div>
                    <div className="mt-1 text-white font-semibold">
                      {uploadDate ? uploadDate.toLocaleDateString() : "N/A"}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300/80">Latest version</div>
                  </div>
                </div>
              </div>
            </div>

            {/* content cards remain the same… */}
            {/* ✅ (keep your remaining code exactly below this point) */}
            {/* I didn’t remove anything – only preview connection added */}
            {/* --- YOUR SAME UI CONTINUES --- */}

            {/* WHAT YOU'LL LEARN */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">What you'll learn</h2>
                <span className="text-xs text-gray-500">Key outcomes</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-700">
                {learningOutcomes.map((t) => (
                  <div key={t} className="flex items-start gap-2 rounded-xl bg-gray-50 p-3">
                    <PlayCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
                {learningOutcomes.length === 0 ? (
                  <div className="text-sm text-gray-500">No key outcomes yet.</div>
                ) : null}
              </div>
            </div>

            {/* TOPICS */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Explore related topics</h3>
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
                  <span className="text-xs text-gray-500">No tags</span>
                )}
              </div>
            </div>

            {/* COURSE CONTENT */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Course content</h2>
                  <p className="text-xs text-gray-500">
                    {totalSections} sections • {totalLectures} lectures • {totalDurationText} total length
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAll}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Expand all
                  </button>
                  <button
                    onClick={collapseAll}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Collapse all
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
                            {section.lectures} lectures • {section.length}
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
                                    Preview • {lesson.duration_label ?? ""}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {lesson.is_locked ? "Locked" : lesson.duration_label ?? ""}
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
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              {/* ✅ CLICK TO OPEN PREVIEW PAGE */}
              <button
                type="button"
                onClick={() => openPreviewWithLesson(previewLessons[0]?.id)}
                className="w-full text-left disabled:cursor-not-allowed disabled:opacity-70"
                disabled={previewLessons.length === 0}
              >
                <div className="rounded-2xl overflow-hidden border border-gray-200 relative">
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

                <div className="mt-3 text-sm font-semibold text-gray-900">
                  Preview this course
                </div>
                <div className="text-xs text-gray-500">
                  Watch {previewLessons.length} free sample videos
                </div>
              </button>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700">Course price</div>
                  <div className="mt-1 text-3xl font-extrabold text-gray-900">
                    {minCoursePrice === 0 ? "Free" : formatPrice(minCoursePrice)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {ratingValue.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">{ratingCount} ratings</div>
                </div>
              </div>

              {access?.has_access ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  You already have access to this course.
                </div>
              ) : null}

              {plans.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-gray-700">Course plans</div>
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
                          </div>
                          <div className="text-xs font-semibold text-gray-900">
                            {Number(plan.price ?? 0) === 0
                              ? "Free"
                              : formatPrice(Number(plan.price))}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 text-sm font-semibold hover:opacity-95 disabled:opacity-60"
                    onClick={() => handlePurchase("course", selectedCoursePlan)}
                    disabled={purchaseLoading || !selectedCoursePlan}
                  >
                    Buy this course
                  </button>
                </div>
              )}

              {subscriptionPlans.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-gray-700">Subscription plans</div>
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
                                  Current
                                </span>
                              ) : null}
                              {isPending ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                  Pending
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {durationLabel || "Subscription"}
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-gray-900">
                            {Number(plan.price ?? 0) === 0
                              ? "Free"
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
                          {plan.access_courses ? "All courses" : null}
                          {plan.access_ai_tools ? "AI tools" : null}
                          {plan.access_downloads ? "Downloads" : null}
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
                      ? "Current plan active"
                      : access?.pending_subscription_plan_id
                        ? "Pending approval"
                        : "Subscribe to all courses"}
                  </button>
                </div>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <Clock className="w-4 h-4 mx-auto text-gray-700" />
                  <div className="mt-1 text-[11px] text-gray-600">Duration</div>
                  <div className="text-xs font-semibold text-gray-900">{totalDurationText}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <BookOpen className="w-4 h-4 mx-auto text-gray-700" />
                  <div className="mt-1 text-[11px] text-gray-600">Lessons</div>
                  <div className="text-xs font-semibold text-gray-900">{totalLectures}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <Users className="w-4 h-4 mx-auto text-gray-700" />
                  <div className="mt-1 text-[11px] text-gray-600">Students</div>
                  <div className="text-xs font-semibold text-gray-900">
                    {studentsCount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div className="text-xs text-gray-600">30-Day Money-Back Guarantee • Lifetime access</div>
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
                  <div className="text-lg font-semibold text-gray-900">Choose a plan</div>
                  <div className="text-xs text-gray-500">Pick the best subscription for you</div>
                </div>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowSubscriptionModal(false)}
                >
                  ✕
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
                          {durationLabel || "per month"}
                        </div>
                      </div>
                      {isCurrent ? (
                        <div className="mt-2 inline-flex items-center rounded-full bg-gray-900 px-3 py-1 text-[11px] text-white">
                          Your current plan
                        </div>
                      ) : null}
                      {isPending ? (
                        <div className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] text-amber-700">
                          Pending approval
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
                          {isCurrent ? "Current plan" : active ? "Selected" : "Choose plan"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="border-t px-6 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Total{" "}
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
                    Close
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
                      ? "Current plan active"
                      : access?.pending_subscription_plan_id
                        ? "Pending approval"
                        : "Continue"}
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

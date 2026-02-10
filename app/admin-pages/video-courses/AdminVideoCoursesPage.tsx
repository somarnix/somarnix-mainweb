/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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

type QrImageOption = {
  filename: string;
  label: string;
  url: string;
};

function formatMoney(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
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
  onBack,
}: {
  courseId?: number;
  onBack?: () => void;
} = {}) {
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
  const [planPrice, setPlanPrice] = useState("");
  const [planKhqr, setPlanKhqr] = useState("/paymentQR/khmer_qr.jpg");
  const [planUsdqr, setPlanUsdqr] = useState("none");
  const [editingPlan, setEditingPlan] = useState<CoursePlan | null>(null);

  const [usdQrOptions, setUsdQrOptions] = useState<QrImageOption[]>([]);
  const [usdQrLoading, setUsdQrLoading] = useState(false);
  const [usdQrUploading, setUsdQrUploading] = useState(false);
  const usdQrUploadInputRef = useRef<HTMLInputElement | null>(null);

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

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedId) ?? null,
    [courses, selectedId]
  );

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
    const data = await res.json();
    setPlans(res.ok ? data.plans ?? [] : []);
  };

  const loadSubscriptionPlans = async () => {
    const res = await fetch("/api/admin/video-subscriptions", { credentials: "include" });
    const data = await res.json();
    setSubscriptionPlans(res.ok ? data.plans ?? [] : []);
  };

  useEffect(() => {
    void loadCourses();
    void loadSubscriptionPlans();
    void loadUsdQrOptions();
  }, []);

  useEffect(() => {
    if (courseId && (!selectedId || selectedId !== courseId)) {
      setSelectedId(courseId);
    }
  }, [courseId, selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    void loadSections(selectedId);
    void loadLessons(selectedId);
    void loadPlans(selectedId);
  }, [selectedId]);

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
    setSavingPlan(true);
    const res = await fetch(`/api/admin/video-courses/${selectedId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: planName,
        access_type: "lifetime",
        price: Number(planPrice),
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
    setPlanPrice("");
    setPlanKhqr("/paymentQR/khmer_qr.jpg");
    setPlanUsdqr("none");
    await loadPlans(selectedId);
    toast.success("Plan saved");
    setSavingPlan(false);
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

  const uploadUsdQrImage = async (file: File) => {
    const suggested = file.name?.split(".")?.[0] ?? "";
    const customName = window
      .prompt("USD QR name (example: 3$). Same name replaces the old image.", suggested)
      ?.trim();

    if (!customName) {
      toast.error("USD QR name is required.");
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
        setPlanUsdqr(url);
      }

      await loadUsdQrOptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUsdQrUploading(false);
      if (usdQrUploadInputRef.current) {
        usdQrUploadInputRef.current.value = "";
      }
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Courses</h1>
          <p className="text-sm text-gray-500">Manage courses, lessons, and subscriptions.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm"
        >
          New Course
        </button>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {!courseId ? (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Courses</h2>
              <p className="text-xs text-gray-500">Total: {courses.length}</p>
            </div>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
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
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
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

      <div className="space-y-6">
        {courseId && selectedCourse ? (
          <>
              <div className="rounded-xl border bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Course details</h2>
                  <div className="flex items-center gap-2">
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
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={editCourse?.author_avatar_url ?? ""}
                    onChange={(e) =>
                      setEditCourse((prev) =>
                        prev ? { ...prev, author_avatar_url: e.target.value } : prev
                      )
                    }
                    placeholder="Author avatar URL"
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
                  <input
                    className="border rounded-lg px-3 py-2 text-sm w-32"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    placeholder="Price"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={planKhqr}
                    onChange={(e) => setPlanKhqr(e.target.value)}
                    placeholder="KHQR URL"
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={planUsdqr}
                    onChange={(e) => setPlanUsdqr(e.target.value)}
                    placeholder="USD QR URL"
                  />
                  <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs font-semibold text-gray-700 mb-3">QR Payment</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">KHQR (Auto)</div>
                        <div className="flex items-center gap-3">
                          <img
                            src={planKhqr || DEFAULT_KH_QR}
                            alt="KHQR"
                            className="w-20 h-20 rounded-lg border object-cover bg-white"
                          />
                          <div className="text-xs text-gray-500 break-all">
                            {planKhqr || DEFAULT_KH_QR}
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2">
                          Always uses the default Khmer QR for every plan.
                        </p>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">USD QR</div>
                        <select
                          value={planUsdqr}
                          onChange={(e) => setPlanUsdqr(e.target.value)}
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
                        {planUsdqr !== USD_QR_NONE ? (
                          <div className="mt-2 flex items-center gap-3">
                            <img
                              src={planUsdqr}
                              alt="USD QR preview"
                              className="w-20 h-20 rounded-lg border object-cover bg-white"
                            />
                            <div className="text-xs text-gray-500 break-all">{planUsdqr}</div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-500 mt-2">
                            No USD QR selected for this plan.
                          </p>
                        )}
                      </div>
                    </div>
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
                        <div className="text-xs text-gray-500">{formatMoney(plan.price)}</div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          plan.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {plan.is_active ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-gray-500">
                      <div>KHQR: {plan.khqr || DEFAULT_KH_QR}</div>
                      <div>USD QR: {plan.usdqr || USD_QR_NONE}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="text-xs px-3 py-1.5 rounded border"
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanName(plan.name);
                          setPlanPrice(String(plan.price ?? ""));
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
                            await loadPlans(selectedId);
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
                            await loadPlans(selectedId);
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
                                price: Number(planPrice),
                                khqr: planKhqr,
                                usdqr: planUsdqr,
                              });
                              await loadPlans(selectedId);
                              setEditingPlan(null);
                              setPlanName("Lifetime");
                              setPlanPrice("");
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
              <div className="text-xs font-semibold text-gray-700 mb-3">QR Payment</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-600 mb-1">KHQR (Auto)</div>
                  <div className="flex items-center gap-3">
                    <img
                      src={subKhqr || DEFAULT_KH_QR}
                      alt="KHQR"
                      className="w-20 h-20 rounded-lg border object-cover bg-white"
                    />
                    <div className="text-xs text-gray-500 break-all">
                      {subKhqr || DEFAULT_KH_QR}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Always uses the default Khmer QR for every plan.
                  </p>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">USD QR</div>
                  <select
                    value={subUsdqr}
                    onChange={(e) => setSubUsdqr(e.target.value)}
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
                  {subUsdqr !== USD_QR_NONE ? (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={subUsdqr}
                        alt="USD QR preview"
                        className="w-20 h-20 rounded-lg border object-cover bg-white"
                      />
                      <div className="text-xs text-gray-500 break-all">{subUsdqr}</div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 mt-2">
                      No USD QR selected for this plan.
                    </p>
                  )}
                </div>
              </div>
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
                    <span>KHQR: {plan.khqr || DEFAULT_KH_QR}</span>
                    <span>USD: {plan.usdqr || USD_QR_NONE}</span>
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

      {createOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="text-lg font-semibold">Create course</div>
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
            <div className="flex justify-end gap-2">
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

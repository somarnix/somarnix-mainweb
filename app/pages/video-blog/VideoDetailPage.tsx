"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  Calendar,
  Code,
  Download,
  PlayCircle,
  Smartphone,
  Star,
  BookOpen,
  Clock,
  Users,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { findVideoCourse } from "./videoData";
import { PreviewVideoPage, PreviewLesson } from "./PreviewVideoPage";

interface VideoDetailPageProps {
  slug: string;
  onNavigate: (page: string) => void;
  onBack?: () => void;
}

type Lesson = { title: string; time: string };
type Section = {
  title: string;
  lectures: number;
  length: string;
  lessons: Lesson[];
};

export function VideoDetailPage({ slug, onNavigate, onBack }: VideoDetailPageProps) {
  const course = findVideoCourse(slug);

  // ✅ preview open/close
  const [openPreview, setOpenPreview] = useState(false);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);

  const normalizeTitle = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // ✅ 10 preview lessons (NO URL SHOWN)
  const previewLessons: PreviewLesson[] = [
    { id: "pv1", title: "Building an AI tool in 6 minutes: A quick demo", time: "10:16", youtubeUrl: "https://youtu.be/nL7qRyE-Opk" },
    { id: "pv2", title: "What does the course cover?", time: "3:17", youtubeUrl: "https://youtu.be/OEzOhGNrCyo?si=MWo1ZqdAFQ3Z0tPG" },
    { id: "pv3", title: "Natural vs Artificial Intelligence", time: "2:06", youtubeUrl: "https://youtu.be/JjYNYIiIRSA?si=MLZjWAphWTUpnMsS" },
    { id: "pv4", title: "Brief history of AI", time: "4:43", youtubeUrl: "https://youtu.be/Qe8fa4b5xNU?si=J7l0Ev7XKIepiiNb" },
    { id: "pv5", title: "Why data matters", time: "2:12", youtubeUrl: "https://youtu.be/Y8HOfcYWZoo?si=SjJQoNKkZ2UKC2EY" },
    { id: "pv6", title: "Cleaning datasets", time: "3:05", youtubeUrl: "https://youtu.be/EZ1YNgV0H4w?si=Wd6ZWp5xg6qu-t8F" },
    { id: "pv7", title: "Supervised learning basics", time: "6:30", youtubeUrl: "https://youtu.be/aAkMkVFwAoo?si=-pkkgcMczCB5QHbf" },
    { id: "pv8", title: "Unsupervised learning overview", time: "5:20", youtubeUrl: "https://youtu.be/hHJ2uSTaP4k?si=nQCQJkRTf_7CyuZD" },
    { id: "pv9", title: "Transformers overview", time: "8:40", youtubeUrl: "https://youtu.be/Jbt5dRYFOPo?si=Aq9qrFVPlzUxzZma" },
    { id: "pv10", title: "Prompt patterns", time: "5:12", youtubeUrl: "https://youtu.be/tfVb3fq4NmE?si=o2luNn9LWIU0Rouj" },
  ];

  const previewLookup = useMemo(() => {
    const map = new Map<string, string>();
    previewLessons.forEach((lesson) => {
      map.set(normalizeTitle(lesson.title), lesson.id);
    });
    return map;
  }, [previewLessons]);

  const openPreviewWithLesson = (lessonId?: string) => {
    setPreviewLessonId(lessonId ?? previewLessons[0]?.id ?? null);
    setOpenPreview(true);
  };

  const courseIncludes = [
    { icon: PlayCircle, label: "29.5 hours on-demand video" },
    { icon: Download, label: "143 downloadable resources" },
    { icon: Code, label: "107 coding exercises" },
    { icon: Smartphone, label: "Access on mobile and TV" },
    { icon: BookOpen, label: "22 articles" },
    { icon: Award, label: "Certificate of completion" },
  ];

  // demo sections
  const courseSections: Section[] = [
    {
      title: "Intro to AI Module: Getting started",
      lectures: 6,
      length: "26min",
      lessons: [
        { title: "Building an AI tool in 6 minutes: A quick demo", time: "10:16" },
        { title: "What does the course cover?", time: "3:17" },
        { title: "Natural vs Artificial Intelligence", time: "2:06" },
        { title: "Brief history of AI", time: "4:43" },
      ],
    },
    {
      title: "Intro to AI Module: Data is essential for building AI",
      lectures: 4,
      length: "10min",
      lessons: [
        { title: "Why data matters", time: "2:12" },
        { title: "Cleaning datasets", time: "3:05" },
      ],
    },
    {
      title: "Intro to AI Module: Key AI techniques",
      lectures: 5,
      length: "20min",
      lessons: [
        { title: "Supervised learning basics", time: "6:30" },
        { title: "Unsupervised learning overview", time: "5:20" },
      ],
    },
    {
      title: "Intro to AI Module: Understanding Generative AI",
      lectures: 7,
      length: "37min",
      lessons: [
        { title: "Transformers overview", time: "8:40" },
        { title: "Prompt patterns", time: "5:12" },
      ],
    },
  ];

  const [showAllSections, setShowAllSections] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const totalSections = courseSections.length;

  const totalLectures = useMemo(() => {
    return courseSections.reduce((sum, s) => sum + (s.lectures ?? s.lessons.length), 0);
  }, [courseSections]);

  const totalDurationText = "29h 55m";
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

  if (!course) {
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
            Video not found.
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
      <div className="w-full px-4 lg:px-8 py-10">
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
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/10">
                    Role Play
                  </span>
                </div>

                <div className="mt-4 text-[11px] text-slate-300">
                  Development • Data Science • Artificial Intelligence (AI)
                </div>

                <h1 className="mt-3 text-2xl md:text-3xl font-semibold leading-tight">
                  {course.title}
                </h1>

                <p className="mt-3 text-sm text-slate-200/90">{course.description}</p>

                <div className="mt-4 text-xs text-slate-300">
                  Created by <span className="text-white font-semibold">{course.author}</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-300/80">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Last updated {new Date(course.uploadDate).toLocaleDateString()}
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
                      {course.rating.toFixed(1)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300/80">{course.ratingCount} ratings</div>
                  </div>

                  <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-slate-300/70">Learners</div>
                    <div className="mt-1 text-white font-semibold">{course.students.toLocaleString()}</div>
                    <div className="mt-1 text-[11px] text-slate-300/80">Students</div>
                  </div>

                  <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-slate-300/70">Updated</div>
                    <div className="mt-1 text-white font-semibold">{new Date(course.uploadDate).toLocaleDateString()}</div>
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
                {[
                  "Build a complete AI workflow from data to deployment.",
                  "Understand core ML and deep learning concepts.",
                  "Apply transformers, LLMs, and prompt strategies.",
                  "Build real-world projects with APIs and tools.",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2 rounded-xl bg-gray-50 p-3">
                    <PlayCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOPICS */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Explore related topics</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {course.tags.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* INCLUDES */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">This course includes</h2>
              <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700">
                {courseIncludes.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                    <item.icon className="w-4 h-4 text-blue-600" />
                    <span>{item.label}</span>
                  </div>
                ))}
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
                              const previewId = previewLookup.get(normalizeTitle(lesson.title));
                              return (
                              <div
                                key={lesson.title}
                                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"
                              >
                                <span className="min-w-0 truncate text-sm text-gray-700">{lesson.title}</span>
                                {previewId ? (
                                  <button
                                    type="button"
                                    onClick={() => openPreviewWithLesson(previewId)}
                                    className="text-xs font-semibold text-blue-600 whitespace-nowrap hover:underline"
                                  >
                                    Preview • {lesson.time}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {lesson.time}
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
                className="w-full text-left"
              >
                <div className="rounded-2xl overflow-hidden border border-gray-200 relative">
                  <img
                    src={course.thumbnail}
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
                    {course.price === 0 ? "Free" : `$${course.price.toFixed(2)}`}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {course.rating.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">{course.ratingCount} ratings</div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 text-sm font-semibold hover:opacity-95">
                  Start subscription
                </button>
                <button className="w-full rounded-xl border border-indigo-200 text-indigo-700 py-3 text-sm font-semibold hover:bg-indigo-50">
                  Add to cart
                </button>
                <button className="w-full rounded-xl border border-gray-200 text-gray-800 py-3 text-sm font-semibold hover:bg-gray-50">
                  Buy now
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <Clock className="w-4 h-4 mx-auto text-gray-700" />
                  <div className="mt-1 text-[11px] text-gray-600">Duration</div>
                  <div className="text-xs font-semibold text-gray-900">{course.duration}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <BookOpen className="w-4 h-4 mx-auto text-gray-700" />
                  <div className="mt-1 text-[11px] text-gray-600">Lessons</div>
                  <div className="text-xs font-semibold text-gray-900">{course.lessons}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <Users className="w-4 h-4 mx-auto text-gray-700" />
                  <div className="mt-1 text-[11px] text-gray-600">Students</div>
                  <div className="text-xs font-semibold text-gray-900">{course.students.toLocaleString()}</div>
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
    </div>
  );
}

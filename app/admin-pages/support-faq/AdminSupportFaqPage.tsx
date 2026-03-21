"use client";

import { useEffect, useMemo, useState } from "react";
import { HelpCircle, Pencil, Plus, RefreshCw, Save, Trash2, Video } from "lucide-react";
import type { SupportFaqRecord } from "@/app/lib/support-faq";

type FaqFormState = {
  id: number | null;
  questionEn: string;
  questionKm: string;
  answerEn: string;
  answerKm: string;
  videoUrl: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: FaqFormState = {
  id: null,
  questionEn: "",
  questionKm: "",
  answerEn: "",
  answerKm: "",
  videoUrl: "",
  sortOrder: "0",
  isActive: true,
};

export default function AdminSupportFaqPage() {
  const [items, setItems] = useState<SupportFaqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FaqFormState>(EMPTY_FORM);

  const totalActive = useMemo(() => items.filter((item) => item.isActive).length, [items]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/support-faq", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load support FAQs");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load support FAQs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => setForm(EMPTY_FORM);

  const startEdit = (item: SupportFaqRecord) => {
    setForm({
      id: item.id,
      questionEn: item.questionEn,
      questionKm: item.questionKm,
      answerEn: item.answerEn,
      answerKm: item.answerKm,
      videoUrl: item.videoUrl ?? "",
      sortOrder: String(item.sortOrder ?? 0),
      isActive: item.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/support-faq", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          questionEn: form.questionEn,
          questionKm: form.questionKm,
          answerEn: form.answerEn,
          answerKm: form.answerKm,
          videoUrl: form.videoUrl,
          sortOrder: Number(form.sortOrder || 0),
          isActive: form.isActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save support FAQ");
      setItems(Array.isArray(data.items) ? data.items : []);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save support FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/support-faq", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete support FAQ");
      setItems(Array.isArray(data.items) ? data.items : []);
      if (form.id === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete support FAQ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              <HelpCircle className="h-3.5 w-3.5" />
              Support FAQ Admin
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              Support Questions And Answers
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Add FAQ in English and Khmer. You can also attach a video URL for each support answer.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-300">Total FAQ</div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{items.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-300">Active</div>
              <div className="mt-1 text-lg font-bold text-emerald-600">{totalActive}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {form.id ? "Edit FAQ" : "Create FAQ"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Question English
              </label>
              <input
                value={form.questionEn}
                onChange={(event) => setForm((prev) => ({ ...prev, questionEn: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="How do I buy a product?"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Question Khmer
              </label>
              <input
                value={form.questionKm}
                onChange={(event) => setForm((prev) => ({ ...prev, questionKm: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="តើខ្ញុំទិញផលិតផលដោយរបៀបណា?"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Answer English
              </label>
              <textarea
                value={form.answerEn}
                onChange={(event) => setForm((prev) => ({ ...prev, answerEn: event.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Open any product, choose a plan, then complete payment."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Answer Khmer
              </label>
              <textarea
                value={form.answerKm}
                onChange={(event) => setForm((prev) => ({ ...prev, answerKm: event.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="បើកផលិតផល ជ្រើសគម្រោង ហើយបញ្ចប់ការបង់ប្រាក់។"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Video URL
              </label>
              <div className="relative">
                <Video className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={form.videoUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, videoUrl: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Sort Order
                </label>
                <input
                  value={form.sortOrder}
                  onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                  type="number"
                  min={0}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  Active FAQ
                </label>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {form.id ? "Save FAQ" : "Create FAQ"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">FAQ List</h2>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                Loading support FAQs...
              </div>
            ) : null}

            {!loading && items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                No support FAQ yet.
              </div>
            ) : null}

            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                        #{item.sortOrder}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {item.isActive ? "Active" : "Hidden"}
                      </span>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                      EN: {item.questionEn}
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      KH: {item.questionKm}
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Answer EN</div>
                        {item.answerEn}
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Answer KH</div>
                        {item.answerKm}
                      </div>
                    </div>
                    {item.videoUrl ? (
                      <div className="mt-3 break-all text-xs text-blue-600 dark:text-blue-300">
                        Video: {item.videoUrl}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

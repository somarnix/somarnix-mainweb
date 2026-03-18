"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Boxes,
  CheckCircle2,
  Globe,
  Link as LinkIcon,
  Pencil,
  RefreshCcw,
  Search,
  Send,
  Shield,
  Trash2,
  User,
  Users,
} from "lucide-react";

type NotificationIcon = "security" | "account" | "product" | "update";
type NotificationScope = "global" | "user";

type AdminNotificationItem = {
  id: number;
  userId: number | null;
  userEmail: string | null;
  scope: NotificationScope;
  category: string;
  icon: NotificationIcon;
  title: string;
  description: string;
  linkUrl: string | null;
  dedupeKey: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  readCount: number;
  isSeeded: boolean;
};

type AdminNotificationStats = {
  total: number;
  global: number;
  targeted: number;
  seeded: number;
  createdToday: number;
};

type UserOption = {
  id: number;
  email: string;
};

type FormState = {
  scope: NotificationScope;
  recipientEmail: string;
  category: string;
  icon: NotificationIcon;
  title: string;
  description: string;
  linkUrl: string;
};

const EMPTY_FORM: FormState = {
  scope: "global",
  recipientEmail: "",
  category: "general",
  icon: "security",
  title: "",
  description: "",
  linkUrl: "",
};

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function iconTone(icon: NotificationIcon): string {
  if (icon === "account") return "bg-violet-50 text-violet-700 border-violet-200";
  if (icon === "product") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (icon === "update") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function renderNotificationIcon(icon: NotificationIcon) {
  if (icon === "account") return <User className="h-4 w-4" />;
  if (icon === "product") return <Boxes className="h-4 w-4" />;
  if (icon === "update") return <Bell className="h-4 w-4" />;
  return <Shield className="h-4 w-4" />;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [stats, setStats] = useState<AdminNotificationStats>({
    total: 0,
    global: 0,
    targeted: 0,
    seeded: 0,
    createdToday: 0,
  });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | NotificationScope>("all");
  const [iconFilter, setIconFilter] = useState<"all" | NotificationIcon>("all");
  const [showComposerMobile, setShowComposerMobile] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to load notifications"
        );
      }

      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setStats({
        total: Number(data?.stats?.total ?? 0),
        global: Number(data?.stats?.global ?? 0),
        targeted: Number(data?.stats?.targeted ?? 0),
        seeded: Number(data?.stats?.seeded ?? 0),
        createdToday: Number(data?.stats?.createdToday ?? 0),
      });
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setNotifications([]);
      setUsers([]);
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((item) => {
      if (scopeFilter !== "all" && item.scope !== scopeFilter) return false;
      if (iconFilter !== "all" && item.icon !== iconFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        String(item.category || "").toLowerCase().includes(q) ||
        String(item.userEmail || "").toLowerCase().includes(q)
      );
    });
  }, [notifications, search, scopeFilter, iconFilter]);

  const onChangeForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetComposer = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleEdit = (item: AdminNotificationItem) => {
    setEditingId(item.id);
    setForm({
      scope: item.scope,
      recipientEmail: item.userEmail || "",
      category: item.category || "general",
      icon: item.icon,
      title: item.title,
      description: item.description,
      linkUrl: item.linkUrl || "",
    });
    setFormError(null);
    setShowComposerMobile(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const endpoint = editingId
        ? `/api/admin/notifications/${editingId}`
        : "/api/admin/notifications";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to save notification"
        );
      }
      resetComposer();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save notification");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: AdminNotificationItem) => {
    const ok = window.confirm(`Delete notification "${item.title}"?`);
    if (!ok) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/notifications/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to delete notification"
        );
      }
      if (editingId === item.id) resetComposer();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete notification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-violet-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create, review, and control system notifications for all users or a single account.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowComposerMobile((prev) => !prev)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 xl:hidden"
            >
              {showComposerMobile ? "Hide composer" : editingId ? "Continue editing" : "New notification"}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={stats.total} accent="blue" icon={<Bell className="h-5 w-5" />} />
        <StatCard title="Global" value={stats.global} accent="emerald" icon={<Globe className="h-5 w-5" />} />
        <StatCard title="Targeted" value={stats.targeted} accent="violet" icon={<Users className="h-5 w-5" />} />
        <StatCard title="Created Today" value={stats.createdToday} accent="amber" icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className={`${showComposerMobile ? "block" : "hidden"} xl:block`}>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingId ? "Edit Notification" : "Notification Composer"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Send a broadcast message or a targeted notification to one user.
                  </p>
                </div>
                {editingId ? (
                  <button
                    type="button"
                    onClick={resetComposer}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onChangeForm("scope", "global")}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    form.scope === "global"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Globe className="h-4 w-4" />
                    Global
                  </div>
                  <p className={`mt-1 text-xs ${form.scope === "global" ? "text-white/80" : "text-gray-500"}`}>
                    Visible to every user.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeForm("scope", "user")}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    form.scope === "user"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="inline-flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4" />
                    User
                  </div>
                  <p className={`mt-1 text-xs ${form.scope === "user" ? "text-white/80" : "text-gray-500"}`}>
                    Send to one email only.
                  </p>
                </button>
              </div>

              {form.scope === "user" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Recipient Email
                  </label>
                  <input
                    list="admin-notification-users"
                    value={form.recipientEmail}
                    onChange={(e) => onChangeForm("recipientEmail", e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-0 transition focus:border-gray-400"
                  />
                  <datalist id="admin-notification-users">
                    {users.map((user) => (
                      <option key={user.id} value={user.email} />
                    ))}
                  </datalist>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <input
                    value={form.category}
                    onChange={(e) => onChangeForm("category", e.target.value)}
                    placeholder="general"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Link URL
                  </label>
                  <input
                    value={form.linkUrl}
                    onChange={(e) => onChangeForm("linkUrl", e.target.value)}
                    placeholder="/orders or /tools-ai/slug"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Icon</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([
                    ["security", "Security"],
                    ["account", "Account"],
                    ["product", "Product"],
                    ["update", "Update"],
                  ] as Array<[NotificationIcon, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onChangeForm("icon", value)}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                        form.icon === value
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {renderNotificationIcon(value)}
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => onChangeForm("title", e.target.value)}
                  placeholder="App version update"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => onChangeForm("description", e.target.value)}
                  rows={5}
                  placeholder="Write the notification message here."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                />
              </div>

              {formError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {saving ? "Saving..." : editingId ? "Update Notification" : "Send Notification"}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={resetComposer}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </section>

        <section className="min-w-0">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Notification Library</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review broadcast and targeted notifications, then edit or remove them.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:w-[32rem]">
                  <label className="relative block sm:col-span-1 lg:col-span-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search notifications..."
                      className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-gray-400"
                    />
                  </label>
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value as "all" | NotificationScope)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                  >
                    <option value="all">All scopes</option>
                    <option value="global">Global</option>
                    <option value="user">User</option>
                  </select>
                  <select
                    value={iconFilter}
                    onChange={(e) => setIconFilter(e.target.value as "all" | NotificationIcon)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                  >
                    <option value="all">All icons</option>
                    <option value="security">Security</option>
                    <option value="account">Account</option>
                    <option value="product">Product</option>
                    <option value="update">Update</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center text-sm text-gray-500">
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center text-sm text-gray-500">
                  No notifications found for the current filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${iconTone(item.icon)}`}>
                              {renderNotificationIcon(item.icon)}
                              {item.icon}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200">
                              {item.scope === "global" ? "Global" : "User"}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200">
                              {item.category || "general"}
                            </span>
                            {item.isSeeded ? (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                                Default
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-3 text-lg font-semibold text-gray-900">
                            {item.title}
                          </h3>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                            {item.description}
                          </p>

                          <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
                            <InfoItem
                              label="Recipient"
                              value={item.scope === "global" ? "All users" : item.userEmail || "-"}
                            />
                            <InfoItem label="Read Count" value={String(item.readCount)} />
                            <InfoItem label="Created" value={formatDateTime(item.createdAt)} />
                            <InfoItem label="Updated" value={formatDateTime(item.updatedAt)} />
                          </div>

                          {item.linkUrl ? (
                            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-600 ring-1 ring-inset ring-gray-200">
                              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{item.linkUrl}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={item.isSeeded || saving}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  accent,
  icon,
}: {
  title: string;
  value: number;
  accent: "blue" | "emerald" | "violet" | "amber";
  icon: ReactNode;
}) {
  const tone =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : accent === "violet"
        ? "border-violet-200 bg-violet-50 text-violet-700"
        : accent === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${tone}`}>
          {icon}
        </div>
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
      <div className="text-xs uppercase tracking-[0.12em] text-gray-400">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-gray-700">{value}</div>
    </div>
  );
}

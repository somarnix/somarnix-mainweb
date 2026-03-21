"use client";

import { useEffect, useMemo, useState } from "react";
import PaginationNext from "@/app/components/PaginationNext";

type AdminUser = {
  id: number;
  email: string;
  username?: string | null;
  role: "user" | "admin";
  is_active: number;
  level?: number | null;
  buying_score?: number | null;
  selling_score?: number | null;
  purchase_count?: number | null;
  purchase_total?: number | null;
  sales_count?: number | null;
  sales_total?: number | null;
  max_devices?: number | null;
  login_device_count?: number | null;
  deleted_at?: string | null;
  ban_until?: string | null;
  ban_reason?: string | null;
  presence_status?: "online" | "offline" | null;
  presence_last_active_at?: string | null;
  status?: "active" | "banned" | "deleted";
  created_at?: string | null;
  updated_at?: string | null;
};

type UserStats = {
  totalUsers: number;
  activeToday: number;
  admins: number;
  banned: number;
  deleted: number;
  online: number;
  offline: number;
  newThisWeek: number;
};

const PAGE_SIZE = 10;
const PRESENCE_WINDOW_MS = 5 * 60 * 1000;
const FILTERS_STORAGE_KEY = "admin_users_filters_v1";
const LIVE_REFRESH_MS = 15000;
const MONTH_OPTIONS = [
  { value: "all", label: "All month" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function fmtDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function fmtMoney(value?: number | null): string {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : "$0.00";
}

function cardClass(color: "blue" | "green" | "orange" | "red" | "purple"): string {
  if (color === "blue") return "border-blue-200 bg-blue-50";
  if (color === "green") return "border-emerald-200 bg-emerald-50";
  if (color === "orange") return "border-amber-200 bg-amber-50";
  if (color === "red") return "border-red-200 bg-red-50";
  return "border-violet-200 bg-violet-50";
}

function isPresenceOnline(user: AdminUser): boolean {
  if (user.presence_status === "offline") return false;
  if (user.presence_last_active_at) {
    const ts = new Date(user.presence_last_active_at).getTime();
    if (!Number.isNaN(ts)) {
      return Date.now() - ts <= PRESENCE_WINDOW_MS;
    }
  }
  return user.presence_status === "online";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeToday: 0,
    admins: 0,
    banned: 0,
    deleted: 0,
    online: 0,
    offline: 0,
    newThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned" | "deleted">("all");
  const [presenceFilter, setPresenceFilter] = useState<"all" | "online" | "offline">("all");
  const [monthFilter, setMonthFilter] = useState<"all" | string>("all");
  const [yearFilter, setYearFilter] = useState<"all" | string>("all");
  const [page, setPage] = useState(1);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        search?: string;
        roleFilter?: "all" | "user" | "admin";
        statusFilter?: "all" | "active" | "banned" | "deleted";
        presenceFilter?: "all" | "online" | "offline";
        monthFilter?: string;
        yearFilter?: string;
      };
      if (typeof parsed.search === "string") setSearch(parsed.search);
      if (parsed.roleFilter === "all" || parsed.roleFilter === "user" || parsed.roleFilter === "admin") {
        setRoleFilter(parsed.roleFilter);
      }
      if (
        parsed.statusFilter === "all" ||
        parsed.statusFilter === "active" ||
        parsed.statusFilter === "banned" ||
        parsed.statusFilter === "deleted"
      ) {
        setStatusFilter(parsed.statusFilter);
      }
      if (
        parsed.presenceFilter === "all" ||
        parsed.presenceFilter === "online" ||
        parsed.presenceFilter === "offline"
      ) {
        setPresenceFilter(parsed.presenceFilter);
      }
      if (typeof parsed.monthFilter === "string") setMonthFilter(parsed.monthFilter || "all");
      if (typeof parsed.yearFilter === "string") setYearFilter(parsed.yearFilter || "all");
    } catch {
      // Ignore invalid localStorage content.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({
        search,
        roleFilter,
        statusFilter,
        presenceFilter,
        monthFilter,
        yearFilter,
      })
    );
  }, [search, roleFilter, statusFilter, presenceFilter, monthFilter, yearFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const u of users) {
      if (!u.created_at) continue;
      const d = new Date(u.created_at);
      if (Number.isNaN(d.getTime())) continue;
      years.add(String(d.getFullYear()));
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [users]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/users", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load users");

      setUsers(Array.isArray(data.users) ? data.users : []);
      setStats({
        totalUsers: Number(data?.stats?.totalUsers ?? 0),
        activeToday: Number(data?.stats?.activeToday ?? 0),
        admins: Number(data?.stats?.admins ?? 0),
        banned: Number(data?.stats?.banned ?? 0),
        deleted: Number(data?.stats?.deleted ?? 0),
        online: Number(data?.stats?.online ?? 0),
        offline: Number(data?.stats?.offline ?? 0),
        newThisWeek: Number(data?.stats?.newThisWeek ?? 0),
      });
    } catch (err) {
      setUsers([]);
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const status =
        u.status ?? (u.deleted_at ? "deleted" : Number(u.is_active) === 1 ? "active" : "banned");
      const online = isPresenceOnline(u);
      if (monthFilter !== "all" || yearFilter !== "all") {
        const created = u.created_at ? new Date(u.created_at) : null;
        if (!created || Number.isNaN(created.getTime())) return false;
        if (monthFilter !== "all" && created.getMonth() + 1 !== Number(monthFilter)) return false;
        if (yearFilter !== "all" && created.getFullYear() !== Number(yearFilter)) return false;
      }
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (presenceFilter === "online" && !online) return false;
      if (presenceFilter === "offline" && online) return false;
      if (!q) return true;
      return (
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.username || "").toLowerCase().includes(q) ||
        String(u.id).includes(q)
      );
    });
  }, [users, search, roleFilter, statusFilter, presenceFilter, monthFilter, yearFilter]);

  const reportSummary = useMemo(() => {
    const baseStart =
      yearFilter !== "all"
        ? new Date(
            Number(yearFilter),
            monthFilter !== "all" ? Number(monthFilter) - 1 : 0,
            1,
            0,
            0,
            0,
            0
          )
        : null;
    const oldCount = baseStart
      ? users.filter((u) => {
          if (!u.created_at) return false;
          const d = new Date(u.created_at);
          if (Number.isNaN(d.getTime())) return false;
          return d.getTime() < baseStart.getTime();
        }).length
      : 0;

    const byStatus = (key: "active" | "banned" | "deleted") =>
      filteredUsers.filter((u) => {
        const status =
          u.status ?? (u.deleted_at ? "deleted" : Number(u.is_active) === 1 ? "active" : "banned");
        return status === key;
      }).length;

    return {
      total: filteredUsers.length,
      active: byStatus("active"),
      banned: byStatus("banned"),
      deleted: byStatus("deleted"),
      old: oldCount,
    };
  }, [filteredUsers, users, monthFilter, yearFilter]);

  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter, presenceFilter, monthFilter, yearFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const updateUser = async (
    userId: number,
    patch: {
      role?: "user" | "admin";
      isActive?: 0 | 1;
      status?: "active" | "banned" | "deleted";
      banDays?: number | null;
      maxDevices?: number;
    }
  ) => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update user");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const createUser = async () => {
    try {
      if (!newEmail.trim() || !newPassword.trim()) {
        alert("Email and password are required");
        return;
      }
      setSaving(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create user");
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const exportExcelReport = () => {
    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const now = new Date();
    const periodLabel =
      monthFilter === "all" && yearFilter === "all"
        ? "All"
        : `${monthFilter === "all" ? "All months" : MONTH_OPTIONS.find((m) => m.value === monthFilter)?.label || monthFilter} ${yearFilter === "all" ? "All years" : yearFilter}`;

    const headers = [
      "ID",
      "User",
      "Role",
      "Level",
      "Buy",
      "Sell",
      "Status",
      "Presence",
      "Devices used/max",
      "Joined",
      "Ban Until",
    ];
    const rows = filteredUsers.map((u) => {
      const status =
        u.status ?? (u.deleted_at ? "deleted" : Number(u.is_active) === 1 ? "active" : "banned");
      const presence = isPresenceOnline(u) ? "online" : "offline";
      return [
        `#${u.id}`,
        u.username ? `${u.username} (${u.email})` : u.email,
        u.role,
        `L${Number(u.level ?? 1)} | buy score ${Number(u.buying_score ?? 0).toFixed(2)} | sell score ${Number(u.selling_score ?? 0).toFixed(2)}`,
        `${Number(u.purchase_count ?? 0)} orders | ${fmtMoney(Number(u.purchase_total ?? 0))}`,
        `${Number(u.sales_count ?? 0)} orders | ${fmtMoney(Number(u.sales_total ?? 0))}`,
        status,
        presence,
        `${Number.isFinite(Number(u.login_device_count)) ? Math.max(0, Number(u.login_device_count)) : 0}/${Number.isFinite(Number(u.max_devices)) ? Math.max(1, Number(u.max_devices)) : 10}`,
        fmtDate(u.created_at),
        u.ban_until ? fmtDate(u.ban_until) : "",
      ];
    });

    const tableHeader = `<tr>${headers
      .map((h) => `<th style="background:#0f766e;color:#ffffff;font-weight:700;text-align:left;padding:9px 10px;border:1px solid #cbd5e1;">${escapeHtml(h)}</th>`)
      .join("")}</tr>`;

    const tableBody = rows
      .map(
        (row, idx) =>
          `<tr>${row
            .map((cell) => {
              const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
              return `<td style="padding:8px 10px;border:1px solid #e2e8f0;background:${bg};vertical-align:top;">${escapeHtml(cell)}</td>`;
            })
            .join("")}</tr>`
      )
      .join("");

    const html = `
<html>
  <head><meta charset="utf-8" /></head>
  <body style="background:#ffffff;margin:16px;">
    <div style="font-family:Calibri,Arial,sans-serif;">
      <h2 style="margin:0 0 4px 0;color:#0f172a;">Users Report</h2>
      <p style="margin:0 0 2px 0;color:#475569;font-size:12px;">Generated: ${escapeHtml(now.toLocaleString())}</p>
      <p style="margin:0 0 8px 0;color:#475569;font-size:12px;">
        Period: ${escapeHtml(periodLabel)} |
        Total(new in period): ${reportSummary.total} |
        Old(before period): ${reportSummary.old} |
        Active: ${reportSummary.active} |
        Banned: ${reportSummary.banned} |
        Deleted: ${reportSummary.deleted}
      </p>
    </div>
    <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12px;min-width:980px;">
      <colgroup>
        <col style="width:80px;" />
        <col style="width:300px;" />
        <col style="width:100px;" />
        <col style="width:120px;" />
        <col style="width:120px;" />
        <col style="width:180px;" />
        <col style="width:120px;" />
        <col style="width:180px;" />
      </colgroup>
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
    const fileMonth = monthFilter === "all" ? "all-months" : `m${monthFilter}`;
    const fileYear = yearFilter === "all" ? "all-years" : `y${yearFilter}`;
    a.href = url;
    a.download = `users-report-${fileYear}-${fileMonth}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 text-gray-500">Loading users...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-gray-500">Manage roles, status, level, and live buy/sell activity.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
        <div className={`rounded-xl border p-3 ${cardClass("blue")}`}>
          <p className="text-xs text-gray-600">Total users</p>
          <p className="text-xl font-bold text-gray-900">{stats.totalUsers}</p>
        </div>
        <div className={`rounded-xl border p-3 ${cardClass("green")}`}>
          <p className="text-xs text-gray-600">Active today</p>
          <p className="text-xl font-bold text-gray-900">{stats.activeToday}</p>
        </div>
        <div className={`rounded-xl border p-3 ${cardClass("purple")}`}>
          <p className="text-xs text-gray-600">Admins</p>
          <p className="text-xl font-bold text-gray-900">{stats.admins}</p>
        </div>
        <div className={`rounded-xl border p-3 ${cardClass("red")}`}>
          <p className="text-xs text-gray-600">Banned</p>
          <p className="text-xl font-bold text-gray-900">{stats.banned}</p>
        </div>
        <div className={`rounded-xl border p-3 ${cardClass("red")}`}>
          <p className="text-xs text-gray-600">Deleted</p>
          <p className="text-xl font-bold text-gray-900">{stats.deleted}</p>
        </div>
        <div className={`rounded-xl border p-3 ${cardClass("green")}`}>
          <p className="text-xs text-gray-600">Online</p>
          <p className="text-xl font-bold text-gray-900">{stats.online}</p>
        </div>
        <div className={`rounded-xl border p-3 ${cardClass("blue")}`}>
          <p className="text-xs text-gray-600">Offline</p>
          <p className="text-xl font-bold text-gray-900">{stats.offline}</p>
        </div>
        <div className={`rounded-xl border p-3 ${cardClass("orange")}`}>
          <p className="text-xs text-gray-600">New this week</p>
          <p className="text-xl font-bold text-gray-900">{stats.newThisWeek}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold mb-3">Add User</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Password"
            type="password"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="user">Role: user</option>
            <option value="admin">Role: admin</option>
          </select>
          <button
            onClick={() => void createUser()}
            disabled={saving}
            className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create user"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Filtered: <span className="font-semibold">{totalFiltered}</span>
            <span className="mx-1 text-gray-400">/</span>
            Total: <span className="font-semibold">{users.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcelReport}
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              Export Excel
            </button>
            <button
              onClick={() => void load()}
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, username or id"
            className="border rounded-lg px-3 py-2 text-sm grow min-w-50"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "user" | "admin")}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All role</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "banned" | "deleted")}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All state</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="deleted">Deleted</option>
          </select>
          <select
            value={presenceFilter}
            onChange={(e) => setPresenceFilter(e.target.value as "all" | "online" | "offline")}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All presence</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All year</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Level</th>
                <th className="p-3 text-left">Buy</th>
                <th className="p-3 text-left">Sell</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Presence</th>
                <th className="p-3 text-left">Devices</th>
                <th className="p-3 text-left">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                pagedUsers.map((u) => (
                  (() => {
                    const status =
                      u.status ?? (u.deleted_at ? "deleted" : Number(u.is_active) === 1 ? "active" : "banned");
                    const online = isPresenceOnline(u);
                    const isDeleted = status === "deleted";
                    return (
                  <tr key={u.id} className="border-b">
                    <td className="p-3">#{u.id}</td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {u.username ? `@${u.username}` : "-"}
                        </span>
                        <span className="text-xs text-gray-500">{u.email}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                          admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          user
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Level {Number(u.level ?? 1)}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          buy {Number(u.buying_score ?? 0).toFixed(2)} | sell {Number(u.selling_score ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {Number(u.purchase_count ?? 0)} buys
                        </span>
                        <span className="text-[11px] text-gray-500">{fmtMoney(Number(u.purchase_total ?? 0))}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                          {Number(u.sales_count ?? 0)} sells
                        </span>
                        <span className="text-[11px] text-gray-500">{fmtMoney(Number(u.sales_total ?? 0))}</span>
                      </div>
                    </td>
	                    <td className="p-3">
	                      {status === "active" ? (
	                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
	                          active
	                        </span>
	                      ) : status === "banned" ? (
	                        <div className="flex flex-col gap-1">
	                          <span className="inline-flex w-fit items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
	                            banned
	                          </span>
	                          {u.ban_until ? (
	                            <span className="text-[11px] text-red-700">until {fmtDate(u.ban_until)}</span>
	                          ) : (
	                            <span className="text-[11px] text-red-700">lifetime</span>
	                          )}
	                        </div>
	                      ) : (
                        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                          deleted
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {online ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          online
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          offline
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {(() => {
                        const maxDevices = Number.isFinite(Number(u.max_devices))
                          ? Math.max(1, Math.floor(Number(u.max_devices)))
                          : 10;
                        const usedDevices = Number.isFinite(Number(u.login_device_count))
                          ? Math.max(0, Math.floor(Number(u.login_device_count)))
                          : 0;
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              {usedDevices}/{maxDevices}
                            </span>
                            <span className="text-[11px] text-gray-500">used/max</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3">{fmtDate(u.created_at)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            void updateUser(u.id, { role: u.role === "admin" ? "user" : "admin" })
                          }
                          disabled={saving || isDeleted}
                          className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
                        >
                          Toggle Role
                        </button>
	                        <button
	                          onClick={() => {
	                            if (status !== "active") {
	                              void updateUser(u.id, { status: "active" });
	                              return;
	                            }

	                            const daysInput = prompt(
	                              "Ban duration in days (example: 1, 11). Leave empty for lifetime ban:",
                                "1"
	                            );
	                            if (daysInput === null) return;

	                            const trimmedDays = daysInput.trim();
	                            const banDays =
	                              trimmedDays.length === 0 ? null : Number.parseInt(trimmedDays, 10);
	                            if (trimmedDays.length > 0 && (!Number.isFinite(banDays) || (banDays ?? 0) <= 0)) {
	                              alert("Please enter a valid positive number of days, or leave empty for lifetime.");
	                              return;
	                            }

	                            void updateUser(u.id, { status: "banned", banDays });
	                          }}
	                          disabled={saving || isDeleted}
	                          className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
                        >
                          {status === "active" ? "Ban" : "Unban"}
                        </button>
                        <button
                          onClick={() => {
                            const currentMax = Number.isFinite(Number(u.max_devices))
                              ? Math.max(1, Math.floor(Number(u.max_devices)))
                              : 10;
                            const value = prompt("Set max devices (positive number)", String(currentMax));
                            if (value === null) return;
                            const parsed = Number.parseInt(value.trim(), 10);
                            if (!Number.isFinite(parsed) || parsed <= 0) {
                              alert("Please enter a valid positive integer.");
                              return;
                            }
                            void updateUser(u.id, { maxDevices: parsed });
                          }}
                          disabled={saving || isDeleted}
                          className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
                        >
                          Max devices
                        </button>
                        <button
                          onClick={() => {
                            const ok = confirm(
                              `Delete user #${u.id} permanently? This cannot be undone and user cannot login again.`
                            );
                            if (!ok) return;
                            void updateUser(u.id, { status: "deleted" });
                          }}
                          disabled={saving || isDeleted}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                    );
                  })()
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > PAGE_SIZE ? (
          <PaginationNext
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={totalFiltered}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            enableKeyboardShortcuts
          />
        ) : null}
      </div>
    </div>
  );
}

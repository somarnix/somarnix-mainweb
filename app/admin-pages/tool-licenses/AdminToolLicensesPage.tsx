"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PaginationNext from "@/app/components/PaginationNext";

type Tool = {
  id: number;
  title: string;
  slug: string;
  default_max_devices?: number;
  default_duration_days?: number | null;
};

type UserItem = {
  id: number;
  email: string;
  username: string | null;
};

type License = {
  id: number;
  order_id: number | null;
  order_number?: string | null;
  product_id: number;
  product_title: string;
  product_slug?: string;
  user_id: number;
  user_email: string;
  user_username: string | null;
  license_key: string;
  last_device_id: string | null;
  device_count?: number | null;
  max_devices: number;
  status: "active" | "revoked" | "expired";
  expires_at: string | null;
  created_at: string;
  category_name?: string | null;
};

type ApiResponse = {
  tools?: Tool[];
  users?: UserItem[];
  licenses?: License[];
  error?: string;
};
const MONTH_OPTIONS = [
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

export default function AdminToolLicensesPage() {
  const PAGE_SIZE = 5;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [tools, setTools] = useState<Tool[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);

  const [productId, setProductId] = useState("");
  const [userId, setUserId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [maxDevices, setMaxDevices] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [licenseQuery, setLicenseQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "revoked">("all");
  const [slugFilter, setSlugFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [editLicenseKey, setEditLicenseKey] = useState("");
  const [editMaxDevices, setEditMaxDevices] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "expired" | "revoked">("active");
  const [hbSlug, setHbSlug] = useState("");
  const [hbDeviceId, setHbDeviceId] = useState("");
  const [hbToken, setHbToken] = useState("");
  const [hbLoading, setHbLoading] = useState(false);
  const [hbResult, setHbResult] = useState("");
  const [tokenOutput, setTokenOutput] = useState("");

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.username || "").toLowerCase();
      return name.includes(q) || u.email.toLowerCase().includes(q) || String(u.id).includes(q);
    });
  }, [users, userQuery]);

  const getYearMonthKey = (value?: string | null) => {
    const raw = String(value || "").trim();
    if (!raw) return { year: "", month: "" };
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      const year = String(dt.getFullYear());
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      return { year, month: `${year}-${month}` };
    }
    const m = raw.match(/(\d{4})-(\d{2})/);
    if (m) return { year: m[1], month: `${m[1]}-${m[2]}` };
    return { year: "", month: "" };
  };

  const slugOptions = useMemo(() => {
    const set = new Set<string>(["all"]);
    for (const l of licenses) {
      const slug = String(l.product_slug || "").trim().toLowerCase();
      if (slug) set.add(slug);
    }
    return Array.from(set);
  }, [licenses]);

  const monthOptions = MONTH_OPTIONS;

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of licenses) {
      const { year } = getYearMonthKey(l.created_at);
      if (year) set.add(year);
    }
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [licenses]);

  const displayedLicenses = useMemo(() => {
    const q = licenseQuery.trim().toLowerCase();
    const now = Date.now();
    return licenses
      .filter((l) => {
        const effectiveStatus =
          l.status === "active" && l.expires_at && new Date(l.expires_at).getTime() <= now
            ? "expired"
            : l.status;
        if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
        if (slugFilter !== "all") {
          const slug = String(l.product_slug || "").trim().toLowerCase();
          if (slug !== slugFilter) return false;
        }
        if (monthFilter !== "all") {
          const { month } = getYearMonthKey(l.created_at);
          const monthNumber = month ? String(Number(month.split("-")[1])) : "";
          if (monthNumber !== monthFilter) return false;
        }
        if (yearFilter !== "all") {
          const { year } = getYearMonthKey(l.created_at);
          if (year !== yearFilter) return false;
        }
        if (!q) return true;
        return (
          l.product_title.toLowerCase().includes(q) ||
          (l.user_email || "").toLowerCase().includes(q) ||
          (l.user_username || "").toLowerCase().includes(q) ||
          (l.license_key || "").toLowerCase().includes(q) ||
          String(l.order_number || l.order_id || "").toLowerCase().includes(q)
        );
      })
      .map((l) => {
        const effectiveStatus =
          l.status === "active" && l.expires_at && new Date(l.expires_at).getTime() <= now
            ? "expired"
            : l.status;
        return { ...l, effectiveStatus };
      });
  }, [licenses, licenseQuery, statusFilter, slugFilter, monthFilter, yearFilter]);

  const totalFiltered = displayedLicenses.length;
  const filteredMaxDevicesSum = displayedLicenses.reduce(
    (sum, l) => sum + (l.max_devices >= 9999 ? 0 : Number(l.max_devices || 0)),
    0
  );
  const filteredUnlimitedCount = displayedLicenses.filter((l) => l.max_devices >= 9999).length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedLicenses = displayedLicenses.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [licenseQuery, statusFilter, slugFilter, monthFilter, yearFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const selectedTool = useMemo(
    () => tools.find((t) => String(t.id) === productId) || null,
    [tools, productId]
  );

  useEffect(() => {
    if (!selectedTool) return;
    if (!maxDevices.trim()) {
      const value =
        Number.isFinite(Number(selectedTool.default_max_devices)) &&
        Number(selectedTool.default_max_devices) > 0
          ? String(selectedTool.default_max_devices)
          : "";
      setMaxDevices(value);
    }
    if (!expiresAt.trim()) {
      const days =
        Number.isFinite(Number(selectedTool.default_duration_days)) &&
        Number(selectedTool.default_duration_days) > 0
          ? Number(selectedTool.default_duration_days)
          : 0;
      if (days > 0) {
        const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setExpiresAt(local);
      }
    }
  }, [selectedTool, maxDevices, expiresAt]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tool-licenses", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) {
        throw new Error(data.error || "Failed to load");
      }
      setTools(Array.isArray(data.tools) ? data.tools : []);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setLicenses(Array.isArray(data.licenses) ? data.licenses : []);
      if (!productId && data.tools && data.tools[0]) {
        setProductId(String(data.tools[0].id));
      }
      if (!userId && data.users && data.users[0]) {
        setUserId(String(data.users[0].id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [productId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createLicense = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/tool-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId,
          userId,
          orderId: orderId.trim() ? Number(orderId) : undefined,
          licenseKey: licenseKey.trim() || undefined,
          maxDevices: maxDevices.trim() ? maxDevices : undefined,
          expiresAt: expiresAt || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; licenseKey?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create license");
      }
      setSuccess(`Created: ${data.licenseKey}`);
      setLicenseKey("");
      setOrderId("");
      setExpiresAt("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create license");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (l: License) => {
    setEditingLicense(l);
    setEditLicenseKey(l.license_key);
    setEditMaxDevices(String(l.max_devices || 1));
    setEditStatus(
      l.status === "revoked" ? "revoked" : l.status === "expired" ? "expired" : "active"
    );
    if (l.expires_at) {
      const d = new Date(l.expires_at);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditExpiresAt(local);
    } else {
      setEditExpiresAt("");
    }
  };

  const saveEdit = async () => {
    if (!editingLicense) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tool-licenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          licenseId: editingLicense.id,
          licenseKey: editLicenseKey.trim(),
          maxDevices: Number(editMaxDevices || 1),
          expiresAt: editExpiresAt || null,
          status: editStatus,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update license");
      }
      setEditingLicense(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update license");
    } finally {
      setSaving(false);
    }
  };

  const removeLicense = async (licenseId: number) => {
    const ok = window.confirm("Delete this license?");
    if (!ok) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tool-licenses?licenseId=${licenseId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete license");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete license");
    } finally {
      setSaving(false);
    }
  };

  const removeDeviceFromLicense = async (licenseId: number, defaultDeviceId: string) => {
    const picked = window
      .prompt(
        "Machine ID to remove:",
        defaultDeviceId && defaultDeviceId !== "auto-on-first-activate" ? defaultDeviceId : ""
      )
      ?.trim();
    if (!picked) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tools/license/remove-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          licenseId,
          machineId: picked,
          reason: "admin_remove_device_from_ui",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to remove device");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove device");
    } finally {
      setSaving(false);
    }
  };

  const runHeartbeat = async () => {
    if (!hbSlug.trim() || !hbDeviceId.trim() || !hbToken.trim()) {
      setHbResult("Please fill slug, device id and token.");
      return;
    }
    setHbLoading(true);
    setHbResult("");
    try {
      const res = await fetch("/api/tools/license/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hbToken.trim()}`,
        },
        credentials: "include",
        body: JSON.stringify({
          slug: hbSlug.trim(),
          deviceId: hbDeviceId.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        status?: string;
        token?: string;
        expiresAt?: string | null;
        nextCheckAt?: string | null;
        error?: string;
        reason?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.reason || "Heartbeat failed");
      }
      if (data.token) {
        setHbToken(data.token);
        setTokenOutput(data.token);
      }
      setHbResult(
        `OK: ${data.status || "active"} | expires: ${data.expiresAt || "-"} | next: ${data.nextCheckAt || "-"}`
      );
    } catch (e) {
      setHbResult(`Failed: ${e instanceof Error ? e.message : "Heartbeat failed"}`);
    } finally {
      setHbLoading(false);
    }
  };

  const generateToken = async (l: License) => {
    const picked = window
      .prompt(
        "Machine ID for token generation:",
        l.last_device_id && l.last_device_id !== "auto-on-first-activate"
          ? l.last_device_id
          : hbDeviceId || ""
      )
      ?.trim();
    if (!picked) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/tool-licenses/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          licenseId: l.id,
          machineId: picked,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        slug?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.token) {
        throw new Error(data.error || "Failed to generate token");
      }
      setTokenOutput(data.token);
      setHbSlug(data.slug || "");
      setHbDeviceId(picked);
      setHbToken(data.token);
      setSuccess("Token generated and heartbeat fields auto-filled.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate token");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setLicenseQuery("");
    setStatusFilter("all");
    setSlugFilter("all");
    setMonthFilter("all");
    setYearFilter("all");
    setPage(1);
    await load();
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const exportFilteredToExcel = () => {
    const headers = [
      "Tool",
      "Slug",
      "Order",
      "Buyer",
      "License Key",
      "Last Device",
      "Device Count",
      "Max Devices",
      "Status",
      "Expires",
      "Created",
    ];

    const rows = displayedLicenses.map((l) => [
      l.product_title,
      l.product_slug || "-",
      l.order_number ? `#${l.order_number}` : l.order_id ? `#${l.order_id}` : "-",
      `${l.user_username || "user"} - ${l.user_email}`,
      l.license_key,
      l.last_device_id || "auto-on-first-activate",
      String(
        Number.isFinite(Number(l.device_count))
          ? Math.max(0, Math.floor(Number(l.device_count)))
          : 0
      ),
      l.max_devices >= 9999 ? "Unlimited" : String(l.max_devices),
      String((l as License & { effectiveStatus?: string }).effectiveStatus || l.status),
      l.expires_at ? new Date(l.expires_at).toLocaleString() : "-",
      l.created_at ? new Date(l.created_at).toLocaleString() : "-",
    ]);

    const tableHeader = `<tr>${headers
      .map((h) => `<th style="background:#0f766e;color:#fff;font-weight:700;text-align:left;padding:9px 10px;border:1px solid #cbd5e1;">${escapeHtml(h)}</th>`)
      .join("")}</tr>`;
    const tableBody = rows
      .map(
        (row, rowIndex) =>
          `<tr>${row
            .map((cell) => {
              const background = rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc";
              return `<td style="vertical-align:top;text-align:left;padding:8px 10px;border:1px solid #e2e8f0;background:${background};">${escapeHtml(cell).replace(/\n/g, "<br/>")}</td>`;
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
      `State: ${statusFilter}`,
      `Slug: ${slugFilter}`,
      `Month: ${monthFilter}`,
      `Year: ${yearFilter}`,
      `Search: ${licenseQuery.trim() || "-"}`,
    ].join(" | ");

    const html = `
<html>
  <head><meta charset="utf-8" /></head>
  <body style="background:#ffffff;margin:16px;">
    <div style="font-family:Calibri,Arial,sans-serif;">
      <h2 style="margin:0 0 4px 0;color:#0f172a;">Tool Licenses Report</h2>
      <p style="margin:0 0 2px 0;color:#475569;font-size:12px;">Generated: ${escapeHtml(generatedAt)}</p>
      <p style="margin:0 0 10px 0;color:#475569;font-size:12px;">${escapeHtml(filterSummary)}</p>
    </div>
    <table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12px;min-width:1500px;">
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
    const monthPart = monthFilter !== "all" ? `_${monthFilter}` : "";
    const yearPart = yearFilter !== "all" ? `_${yearFilter}` : "";
    a.href = url;
    a.download = `tool_licenses${monthPart}${yearPart}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Tool Licenses</h1>

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <h2 className="text-lg font-semibold">Create license key</h2>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {success ? <div className="text-sm text-green-600">{success}</div> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tool</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {tools.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.title} ({t.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Search user</label>
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="username / email / id"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Buyer</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {filteredUsers.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.username || "user"} - {u.email} (#{u.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Order ID (auto from tool if empty)
            </label>
            <input
              type="number"
              min={1}
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="ex: 1770371330803632"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">License key (optional)</label>
            <input
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="auto-generated if empty"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Max devices (auto from tool if empty)
            </label>
            <input
              type="number"
              min={1}
              value={maxDevices}
              onChange={(e) => setMaxDevices(e.target.value)}
              placeholder={
                selectedTool?.default_max_devices
                  ? String(selectedTool.default_max_devices)
                  : "auto"
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Expires at (optional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <button
            onClick={createLicense}
            disabled={saving || loading || !productId || !userId}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create License"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Recent licenses</h2>
          <div className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-700">
            Filtered: <span className="font-semibold">{totalFiltered}</span>
            <span className="mx-1 text-gray-400">/</span>
            Total: <span className="font-semibold">{licenses.length}</span>
            <span className="mx-2 text-gray-300">|</span>
            Sum Max Devices: <span className="font-semibold">{filteredMaxDevicesSum}</span>
            <span className="mx-1 text-gray-400">(+{filteredUnlimitedCount} unlimited)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportFilteredToExcel}
              className="text-sm px-3 py-1 border rounded-lg disabled:opacity-50"
              disabled={displayedLicenses.length === 0}
            >
              Export Excel
            </button>
            <button onClick={() => void handleRefresh()} className="text-sm px-3 py-1 border rounded-lg">
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-3">
          <input
            value={licenseQuery}
            onChange={(e) => setLicenseQuery(e.target.value)}
            placeholder="Search tool / buyer / key / order"
            className="border rounded-lg px-3 py-1.5 text-sm w-full"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "expired" | "revoked")
              }
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="all">All states</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
            <select
              value={slugFilter}
              onChange={(e) => setSlugFilter(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm capitalize"
            >
              {slugOptions.map((slug) => (
                <option key={slug} value={slug} className="capitalize">
                  {slug === "all" ? "All slug" : slug}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="all">All month</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="all">All year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : displayedLicenses.length === 0 ? (
          <div className="text-sm text-gray-500">No licenses yet.</div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
            <table className="min-w-[1500px] text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b">
                  <th className="text-left px-3 py-2 bg-gray-50">Tool</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Slug</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Order</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Buyer</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Key</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Last Device</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Device count</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Max devices</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Status</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Expires</th>
                  <th className="text-left px-3 py-2 bg-gray-50">Created</th>
                  <th className="text-right px-3 py-2 bg-gray-50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedLicenses.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="px-3 py-2 whitespace-nowrap">{l.product_title}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{l.product_slug || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {l.order_number
                        ? `#${l.order_number}`
                        : l.order_id
                          ? `#${l.order_id}`
                          : "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {l.user_username || "user"} - {l.user_email}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{l.license_key}</td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{l.last_device_id || "auto-on-first-activate"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {Number.isFinite(Number(l.device_count))
                        ? Math.max(0, Math.floor(Number(l.device_count)))
                        : 0}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{l.max_devices >= 9999 ? "Unlimited" : l.max_devices}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{l.effectiveStatus}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{l.expires_at ? new Date(l.expires_at).toLocaleString() : "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString() : "-"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-50 mr-2"
                        onClick={() => openEdit(l)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 mr-2"
                        onClick={() => void generateToken(l)}
                      >
                        Token
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50 mr-2"
                        onClick={() => void removeDeviceFromLicense(l.id, l.last_device_id || "")}
                      >
                        Remove device
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                        onClick={() => void removeLicense(l.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && displayedLicenses.length > PAGE_SIZE && (
          <PaginationNext
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={totalFiltered}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            enableKeyboardShortcuts
          />
        )}
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">Heartbeat status panel (EXE test)</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tool slug</label>
            <input
              value={hbSlug}
              onChange={(e) => setHbSlug(e.target.value)}
              placeholder="videoeditor"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Device ID</label>
            <input
              value={hbDeviceId}
              onChange={(e) => setHbDeviceId(e.target.value)}
              placeholder="machine id"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Token</label>
            <input
              value={hbToken}
              onChange={(e) => setHbToken(e.target.value)}
              placeholder="token from activate"
              className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void runHeartbeat()}
            disabled={hbLoading}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-50"
          >
            {hbLoading ? "Checking..." : "Run heartbeat"}
          </button>
          {hbResult ? <span className="text-sm text-gray-700">{hbResult}</span> : null}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Generated token</label>
          <div className="flex items-center gap-2">
            <input
              value={tokenOutput}
              readOnly
              placeholder="Use Token button on a license row"
              className="w-full border rounded-lg px-3 py-2 font-mono text-xs bg-gray-50"
            />
            <button
              onClick={() => navigator.clipboard.writeText(tokenOutput)}
              disabled={!tokenOutput}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {editingLicense && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-4 space-y-3">
            <h3 className="text-lg font-semibold">Edit license</h3>
            <div className="text-sm text-gray-600">
              Key: <span className="font-mono">{editingLicense.license_key}</span>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">License key</label>
              <input
                value={editLicenseKey}
                onChange={(e) => setEditLicenseKey(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Max devices</label>
              <input
                type="number"
                min={1}
                value={editMaxDevices}
                onChange={(e) => setEditMaxDevices(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "active" | "expired" | "revoked")}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="active">active</option>
                <option value="expired">expired</option>
                <option value="revoked">revoked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Expires at</label>
              <input
                type="datetime-local"
                value={editExpiresAt}
                onChange={(e) => setEditExpiresAt(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border"
                onClick={() => setEditingLicense(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white"
                onClick={() => void saveEdit()}
                disabled={saving}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

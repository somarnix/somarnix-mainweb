"use client";

import { useEffect, useState } from "react";
import { DollarSign, Package, ShoppingCart, Users, Clock3, CheckCircle2, TrendingUp, Store } from "lucide-react";

type DashboardStats = {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  totalPayments: number;
  totalRevenue: number;
  totalSoldItems: number;
  averageOrderValue: number;
  adminOwnedRevenue: number;
  adminOwnedItemsSold: number;
  pendingOrders: number;
  completedOrders: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    soldQty: number;
    revenue: number;
  }>;
  topProducts: Array<{
    productId: number;
    title: string;
    slug: string;
    orders: number;
    soldQty: number;
    revenue: number;
  }>;
  recentCompletedOrders: Array<{
    id: number;
    orderNumber: string;
    userEmail: string;
    total: number;
    createdAt: string | null;
    state: string;
  }>;
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    totalPayments: 0,
    totalRevenue: 0,
    totalSoldItems: 0,
    averageOrderValue: 0,
    adminOwnedRevenue: 0,
    adminOwnedItemsSold: 0,
    pendingOrders: 0,
    completedOrders: 0,
    monthlyRevenue: [],
    categoryBreakdown: [],
    topProducts: [],
    recentCompletedOrders: [],
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard", {
        credentials: "include",
      });

      const data = await res.json();

      if (mounted && res.ok) {
        setStats({
          totalOrders: Number(data.totalOrders ?? 0),
          totalProducts: Number(data.totalProducts ?? 0),
          totalUsers: Number(data.totalUsers ?? 0),
          totalPayments: Number(data.totalPayments ?? 0),
          totalRevenue: Number(data.totalRevenue ?? 0),
          totalSoldItems: Number(data.totalSoldItems ?? 0),
          averageOrderValue: Number(data.averageOrderValue ?? 0),
          adminOwnedRevenue: Number(data.adminOwnedRevenue ?? 0),
          adminOwnedItemsSold: Number(data.adminOwnedItemsSold ?? 0),
          pendingOrders: Number(data.pendingOrders ?? 0),
          completedOrders: Number(data.completedOrders ?? 0),
          monthlyRevenue: Array.isArray(data.monthlyRevenue) ? data.monthlyRevenue : [],
          categoryBreakdown: Array.isArray(data.categoryBreakdown) ? data.categoryBreakdown : [],
          topProducts: Array.isArray(data.topProducts) ? data.topProducts : [],
          recentCompletedOrders: Array.isArray(data.recentCompletedOrders)
            ? data.recentCompletedOrders
            : [],
        });
      }
      if (mounted) setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sales performance, earnings, and order activity in one view.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={<DollarSign className="h-5 w-5" />} accent="emerald" />
        <StatCard title="Items Sold" value={formatNumber(stats.totalSoldItems)} icon={<Package className="h-5 w-5" />} accent="blue" />
        <StatCard title="Orders" value={formatNumber(stats.totalOrders)} icon={<ShoppingCart className="h-5 w-5" />} accent="violet" />
        <StatCard title="Average Order" value={formatCurrency(stats.averageOrderValue)} icon={<TrendingUp className="h-5 w-5" />} accent="amber" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="My Product Revenue" value={formatCurrency(stats.adminOwnedRevenue)} icon={<Store className="h-5 w-5" />} accent="cyan" />
        <StatCard title="My Products Sold" value={formatNumber(stats.adminOwnedItemsSold)} icon={<Package className="h-5 w-5" />} accent="teal" />
        <StatCard title="Pending Orders" value={formatNumber(stats.pendingOrders)} icon={<Clock3 className="h-5 w-5" />} accent="rose" />
        <StatCard title="Completed Orders" value={formatNumber(stats.completedOrders)} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top Products By Revenue">
          {stats.topProducts.length === 0 ? (
            <EmptyState loading={loading} />
          ) : (
            <div className="space-y-3">
              {stats.topProducts.slice(0, 6).map((p) => (
                <div key={p.productId} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="font-semibold text-emerald-700">{formatCurrency(p.revenue)}</p>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {p.soldQty} sold • {p.orders} orders • {p.slug}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Category Performance">
          {stats.categoryBreakdown.length === 0 ? (
            <EmptyState loading={loading} />
          ) : (
            <div className="space-y-3">
              {stats.categoryBreakdown.slice(0, 8).map((c) => (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-gray-800">{c.category}</span>
                    <span className="text-gray-600">
                      {c.soldQty} sold • {formatCurrency(c.revenue)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                      style={{
                        width: `${
                          Math.max(6, Math.min(100, stats.totalRevenue > 0 ? (c.revenue / stats.totalRevenue) * 100 : 0))
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Monthly Revenue (Last 6 Months)">
          {stats.monthlyRevenue.length === 0 ? (
            <EmptyState loading={loading} />
          ) : (
            <div className="space-y-3">
              {stats.monthlyRevenue.map((m) => (
                <div key={m.month}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{m.month}</span>
                    <span className="text-gray-600">
                      {formatCurrency(m.revenue)} • {m.orders} orders
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{
                        width: `${
                          Math.max(
                            6,
                            Math.min(
                              100,
                              Math.max(...stats.monthlyRevenue.map((x) => x.revenue), 1) > 0
                                ? (m.revenue / Math.max(...stats.monthlyRevenue.map((x) => x.revenue), 1)) * 100
                                : 0
                            )
                          )
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent Completed Orders">
          {stats.recentCompletedOrders.length === 0 ? (
            <EmptyState loading={loading} />
          ) : (
            <div className="space-y-2">
              {stats.recentCompletedOrders.map((o) => (
                <div key={o.id} className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">#{o.orderNumber}</span>
                    <span className="font-semibold text-blue-700">{formatCurrency(o.total)}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {o.userEmail || "-"} • {o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Products" value={formatNumber(stats.totalProducts)} icon={<Package className="h-5 w-5" />} accent="slate" />
        <StatCard title="Users" value={formatNumber(stats.totalUsers)} icon={<Users className="h-5 w-5" />} accent="indigo" />
        <StatCard title="Payments" value={formatNumber(stats.totalPayments)} icon={<DollarSign className="h-5 w-5" />} accent="lime" />
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0
  );
}

function StatCard({
  title,
  value,
  icon,
  accent = "blue",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent?: "blue" | "emerald" | "violet" | "amber" | "cyan" | "teal" | "rose" | "green" | "slate" | "indigo" | "lime";
}) {
  const accentMap: Record<string, string> = {
    blue: "from-blue-50 to-blue-100 text-blue-700",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700",
    violet: "from-violet-50 to-violet-100 text-violet-700",
    amber: "from-amber-50 to-amber-100 text-amber-700",
    cyan: "from-cyan-50 to-cyan-100 text-cyan-700",
    teal: "from-teal-50 to-teal-100 text-teal-700",
    rose: "from-rose-50 to-rose-100 text-rose-700",
    green: "from-green-50 to-green-100 text-green-700",
    slate: "from-slate-50 to-slate-100 text-slate-700",
    indigo: "from-indigo-50 to-indigo-100 text-indigo-700",
    lime: "from-lime-50 to-lime-100 text-lime-700",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{title}</div>
        <div className={`rounded-xl bg-gradient-to-br p-2 ${accentMap[accent]}`}>{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
      {loading ? "Loading..." : "No data yet"}
    </div>
  );
}

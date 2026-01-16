"use client";

import { useEffect, useState } from "react";

type DashboardStats = {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const res = await fetch("/api/admin/dashboard", {
        credentials: "include",
      });

      const data = await res.json();

      if (mounted && res.ok) {
        setStats({
          totalOrders: data.totalOrders,
          totalProducts: data.totalProducts,
          totalUsers: data.totalUsers,
        });
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <StatCard title="Orders" value={stats.totalOrders} />
        <StatCard title="Products" value={stats.totalProducts} />
        <StatCard title="Users" value={stats.totalUsers} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="text-gray-500">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

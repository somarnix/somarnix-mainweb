"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: number;
  email: string;
  role: "user" | "admin";
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ================= LOAD USERS ================= */

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/users", {
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load users");
        }

        if (mounted && Array.isArray(data.users)) {
          setUsers(data.users);
        } else {
          setUsers([]);
        }
      } catch (err) {
        if (mounted) {
          setUsers([]);
          setError((err as Error).message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  /* ================= CHANGE ROLE ================= */

  const changeRole = async (id: number, role: "user" | "admin") => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: id, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, role } : u))
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div className="p-6 text-gray-500">
        Loading users...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      <table className="w-full bg-white rounded-xl shadow">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left">Email</th>
            <th>Role</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="p-6 text-center text-gray-500"
              >
                No users found
              </td>
            </tr>
          ) : (
            users.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <button
                    onClick={() =>
                      changeRole(
                        u.id,
                        u.role === "admin" ? "user" : "admin"
                      )
                    }
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Toggle Role
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

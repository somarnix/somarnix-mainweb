/* ================= ADMIN TYPES ================= */

import type { AppRole } from "@/lib/roles";

/* USERS */
export interface AdminUser {
  id: number;
  email: string;
  role: AppRole;
  is_active: number;
  created_at: string;
}

/* PRODUCTS */
export interface AdminProduct {
  id: number;
  title: string;
  slug: string;
  price: number;
  is_active: number;
  created_at: string;
}

/* ORDERS */
export interface AdminOrder {
  id: number;
  user_id: number;
  user_email: string;
  total_amount: number;
  status: "pending" | "approved" | "cancelled";
  created_at: string;
}

/* PAGINATION */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

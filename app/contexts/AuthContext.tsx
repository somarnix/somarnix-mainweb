"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

/* ================= TYPES ================= */

type AuthUser = {
  id: number;
  email: string;
  role: "user" | "admin";

  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  birthDate?: string | null;
  place?: string | null;

  bio?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;

  joinedDate?: string | null;
  updatedAt?: string | null;
};

type ProfilePayload = {
  id: number;
  email: string;
  role: "user" | "admin";
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  birthDate: string | null;
  place: string | null;
  bio: string | null;
  phone: string | null;
  avatarUrl: string | null;
  joinedDate: string | null;
  updatedAt: string | null;
};

type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  username?: string;
  birthDate?: string;
  place?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
  newEmail?: string;
  newPassword?: string;
  currentPassword?: string;
};

type ForgotPasswordInput = {
  email: string;
};

type ForgotPasswordResult = {
  success: boolean;
  error?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  register: (
    firstName: string,
    lastName: string,
    username: string,
    birthDate: string,
    place: string,
    email: string,
    password: string
  ) => Promise<void>;

  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;

  fetchProfile: () => Promise<void>;
  updateProfile: (updates: UpdateProfileInput) => Promise<void>;
  forgotPassword: (updates: ForgotPasswordInput) => Promise<ForgotPasswordResult>;
  deleteAccount: () => Promise<void>;
};

/* ================= CONTEXT ================= */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ================= HELPERS ================= */

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getErrorMessage(data: unknown): string | null {
  if (!isObject(data)) return null;
  const err = data.error;
  return typeof err === "string" ? err : null;
}

/* ================= PROVIDER ================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* 🔑 BASIC SESSION */
  const refreshMe = async () => {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return;
      }

      const data: unknown = await res.json();

      if (!isObject(data) || data.loggedIn !== true || !isObject(data.user)) {
        setUser(null);
        return;
      }

      const u = data.user;

      setUser({
        id: Number(u.id ?? 0),
        email: String(u.email ?? ""),
        role: u.role === "admin" ? "admin" : "user",
      });
    } catch {
      setUser(null);
    }
  };

  /* 👤 FULL PROFILE */
  const fetchProfile = async () => {
    const res = await fetch("/api/auth/profile", {
      credentials: "include",
    });

    const data: unknown = await res.json().catch(() => null);
    if (!res.ok || !isObject(data)) return;

    if (data.success === true && isObject(data.user)) {
      const u = data.user as ProfilePayload;

      setUser({
        id: u.id,
        email: u.email,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        birthDate: u.birthDate,
        place: u.place,
        bio: u.bio,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        joinedDate: u.joinedDate,
        updatedAt: u.updatedAt,
      });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshMe();
      await fetchProfile();
      setLoading(false);
    })();
  }, []);

  /* 🔐 LOGIN */
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok || !isObject(data) || data.success !== true) {
        return false;
      }

      await refreshMe();
      await fetchProfile();
      return true;
    } catch {
      return false;
    }
  };

  /* 📝 REGISTER */
  const register: AuthContextType["register"] = async (
    firstName,
    lastName,
    username,
    birthDate,
    place,
    email,
    password
  ) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        username,
        birthDate,
        place,
        email,
        password,
      }),
    });

    const data: unknown = await res.json().catch(() => null);

    if (!res.ok || !isObject(data) || data.success !== true) {
      const msg = getErrorMessage(data) ?? "Registration failed";
      throw new Error(msg);
    }
  };

  /* 📝 FORGOTPASSWORD */
  const forgotPassword: AuthContextType["forgotPassword"] = async (updates) => {
    const email = updates.email?.trim();

    if (!email) {
      return { success: false, error: "Email is required" };
    }

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => null);

    // 🔐 Always success (security)
    if (data?.success) {
      return { success: true };
    }

    return {
      success: false,
      error: data?.error || "Failed to send reset email",
    };
  };

  /* ✏️ UPDATE PROFILE */
  const updateProfile: AuthContextType["updateProfile"] = async (updates) => {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });

    const data: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = getErrorMessage(data) ?? "Update failed";
      throw new Error(msg);
    }

    await fetchProfile();
  };

  /* 🗑️ DELETE ACCOUNT */
  const deleteAccount: AuthContextType["deleteAccount"] = async () => {
    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      credentials: "include",
    });

    const data: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = getErrorMessage(data) ?? "Delete account failed";
      throw new Error(msg);
    }

    // remove local state
    setUser(null);
  };

  /* 🚪 LOGOUT */
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshMe,
        fetchProfile,
        updateProfile,
        forgotPassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

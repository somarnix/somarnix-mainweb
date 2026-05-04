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
  level?: number;

  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  birthDate?: string | null;
  place?: string | null;

  bio?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  avatarBorderUrl?: string | null;
  coverUrl?: string | null;
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  coverScale?: number | null;

  joinedDate?: string | null;
  updatedAt?: string | null;
};

type ProfilePayload = {
  id: number;
  email: string;
  role: "user" | "admin";
  level: number | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  birthDate: string | null;
  place: string | null;
  bio: string | null;
  phone: string | null;
  avatarUrl: string | null;
  avatarBorderUrl: string | null;
  coverUrl: string | null;
  coverPositionX: number | null;
  coverPositionY: number | null;
  coverScale: number | null;
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
  avatarBorderUrl?: string | null;
  coverUrl?: string | null;
  coverPositionX?: number;
  coverPositionY?: number;
  coverScale?: number;
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

type DeleteAccountInput = {
  confirmText: string;
  currentPassword?: string;
  code: string;
};

type LoginResult = {
  success: boolean;
  reason?:
    | "required"
    | "invalid"
    | "two_factor_required"
    | "rate_limited"
    | "deleted"
    | "banned"
    | "banned_until"
    | "device_limit"
    | "email_not_verified"
    | "password_not_set"
    | "server";
  banUntil?: string;
  banDaysLeft?: number;
  maxDevices?: number;
  email?: string;
  message?: string;
  expiresInMinutes?: number;
  retryAfterSeconds?: number;
};

type LoginOptions = {
  verificationCode?: string;
  trustDevice?: boolean;
};

type RegisterResult = {
  success: boolean;
  requiresVerification?: boolean;
  email?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string, options?: LoginOptions) => Promise<LoginResult>;
  loginWithGoogle: (credential: string) => Promise<LoginResult>;
  register: (
    firstName: string,
    lastName: string,
    username: string,
    birthDate: string,
    place: string,
    email: string,
    password: string
  ) => Promise<RegisterResult>;

  logout: () => Promise<void>;
  refreshMe: () => Promise<boolean>;

  fetchProfile: () => Promise<void>;
  updateProfile: (updates: UpdateProfileInput) => Promise<void>;
  forgotPassword: (updates: ForgotPasswordInput) => Promise<ForgotPasswordResult>;
  deleteAccount: (input: DeleteAccountInput) => Promise<void>;
};

/* ================= CONTEXT ================= */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ================= HELPERS ================= */

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getErrorMessage(data: unknown): string | null {
  if (!isObject(data)) return null;
  const err = typeof data.error === "string" ? data.error.trim() : "";
  const detail = typeof data.detail === "string" ? data.detail.trim() : "";
  if (err && detail) return `${err}: ${detail}`;
  if (err) return err;
  if (detail) return detail;
  return null;
}

function getLoginDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  const key = "somarnix_login_device_id";
  const existing = window.localStorage.getItem(key);
  if (existing && existing.trim()) return existing;
  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, created);
  return created;
}

function getLoginDeviceName(): string {
  if (typeof navigator === "undefined") return "Web";
  const ua = navigator.userAgent || "Web";
  return ua.slice(0, 120);
}

function clearClientAuthArtifacts() {
  if (typeof window === "undefined") return;

  window.sessionStorage.clear();
  window.localStorage.removeItem("somarnix_login_device_id");
  window.localStorage.removeItem("edugroit-country");

  // Disable Google auto-select (type assertion to bypass TypeScript)
  const googleAccounts = window.google?.accounts as any;
  if (googleAccounts?.id?.disableAutoSelect) {
    googleAccounts.id.disableAutoSelect();
  }
}

/* ================= PROVIDER ================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* 🔑 BASIC SESSION */
  const refreshMe = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setUser(null);
        return false;
      }

      const data: unknown = await res.json();

      if (!isObject(data) || data.loggedIn !== true || !isObject(data.user)) {
        setUser(null);
        return false;
      }

      const u = data.user;

      setUser({
        id: Number(u.id ?? 0),
        email: String(u.email ?? ""),
        role: u.role === "admin" ? "admin" : "user",
        level: 1,
      });
      return true;
    } catch {
      setUser(null);
      return false;
    }
  };

  /* 👤 FULL PROFILE */
  const fetchProfile = async () => {
    const res = await fetch("/api/auth/profile", {
      credentials: "include",
      cache: "no-store",
    });

    const data: unknown = await res.json().catch(() => null);
    if (!res.ok || !isObject(data)) {
      if (res.status === 401) {
        setUser(null);
      }
      return;
    }

    if (data.success === true && isObject(data.user)) {
      const u = data.user as ProfilePayload;

      setUser({
        id: u.id,
        email: u.email,
        role: u.role,
        level: typeof u.level === "number" && Number.isFinite(u.level) ? u.level : 1,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        birthDate: u.birthDate,
        place: u.place,
        bio: u.bio,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        avatarBorderUrl: u.avatarBorderUrl,
        coverUrl: u.coverUrl,
        coverPositionX: u.coverPositionX,
        coverPositionY: u.coverPositionY,
        coverScale: u.coverScale,
        joinedDate: u.joinedDate,
        updatedAt: u.updatedAt,
      });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const loggedIn = await refreshMe();
      if (loggedIn) {
        await fetchProfile();
      }
      setLoading(false);
    })();
  }, []);

  /* 🔐 LOGIN */
  const login = async (
    email: string,
    password: string,
    options?: LoginOptions
  ): Promise<LoginResult> => {
    try {
      const deviceId = getLoginDeviceId();
      const deviceName = getLoginDeviceName();
      const res = await fetch("/api/auth/login-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          deviceId,
          deviceName,
          verificationCode: options?.verificationCode,
          trustDevice: options?.trustDevice === true,
        }),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !isObject(data) || data.success !== true) {
        const parsed = isObject(data) ? data : {};
        const code = typeof parsed.code === "string" ? parsed.code : null;
        const msg = getErrorMessage(parsed) ?? "Login failed";
        if (code === "ACCOUNT_DELETED") {
          return { success: false, reason: "deleted", message: msg };
        }
        if (code === "LOGIN_2FA_REQUIRED") {
          const expiresInMinutes =
            typeof parsed.expiresInMinutes === "number" && Number.isFinite(parsed.expiresInMinutes)
              ? parsed.expiresInMinutes
              : undefined;
          return {
            success: false,
            reason: "two_factor_required",
            message: msg,
            expiresInMinutes,
          };
        }
        if (code === "LOGIN_RATE_LIMITED") {
          const retryAfterSeconds =
            typeof parsed.retryAfterSeconds === "number" && Number.isFinite(parsed.retryAfterSeconds)
              ? parsed.retryAfterSeconds
              : undefined;
          return {
            success: false,
            reason: "rate_limited",
            message: msg,
            retryAfterSeconds,
          };
        }
        if (code === "ACCOUNT_BANNED_UNTIL") {
          const banUntil = typeof parsed.banUntil === "string" ? parsed.banUntil : undefined;
          const banDaysLeft =
            typeof parsed.banDaysLeft === "number" && Number.isFinite(parsed.banDaysLeft)
              ? parsed.banDaysLeft
              : undefined;
          return { success: false, reason: "banned_until", banUntil, banDaysLeft, message: msg };
        }
        if (code === "ACCOUNT_BANNED") {
          return { success: false, reason: "banned", message: msg };
        }
        if (code === "ACCOUNT_LOGIN_DEVICE_LIMIT") {
          const maxDevices =
            typeof parsed.maxDevices === "number" && Number.isFinite(parsed.maxDevices)
              ? parsed.maxDevices
              : undefined;
          return { success: false, reason: "device_limit", message: msg, maxDevices };
        }
        if (code === "ACCOUNT_EMAIL_NOT_VERIFIED") {
          const emailValue = typeof parsed.email === "string" ? parsed.email : undefined;
          return { success: false, reason: "email_not_verified", message: msg, email: emailValue };
        }
        if (code === "ACCOUNT_PASSWORD_NOT_SET") {
          return { success: false, reason: "password_not_set", message: msg };
        }
        if (res.status === 400) {
          return { success: false, reason: "required", message: msg };
        }
        if (res.status === 401) {
          return { success: false, reason: "invalid", message: msg };
        }
        return { success: false, reason: "server", message: msg };
      }

      await refreshMe();
      await fetchProfile();
      return { success: true };
    } catch {
      return { success: false, reason: "server", message: "Server error" };
    }
  };

  const loginWithGoogle = async (credential: string): Promise<LoginResult> => {
    try {
      const deviceId = getLoginDeviceId();
      const deviceName = getLoginDeviceName();
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential, deviceId, deviceName }),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !isObject(data) || data.success !== true) {
        const parsed = isObject(data) ? data : {};
        const code = typeof parsed.code === "string" ? parsed.code : null;
        const msg = getErrorMessage(parsed) ?? "Google login failed";

        if (code === "ACCOUNT_LOGIN_DEVICE_LIMIT") {
          const maxDevices =
            typeof parsed.maxDevices === "number" && Number.isFinite(parsed.maxDevices)
              ? parsed.maxDevices
              : undefined;
          return { success: false, reason: "device_limit", message: msg, maxDevices };
        }
        if (code === "ACCOUNT_DELETED") {
          return { success: false, reason: "deleted", message: msg };
        }
        if (code === "ACCOUNT_BANNED") {
          return { success: false, reason: "banned", message: msg };
        }
        return { success: false, reason: "server", message: msg };
      }

      await refreshMe();
      await fetchProfile();
      return { success: true };
    } catch {
      return { success: false, reason: "server", message: "Server error" };
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
      if (isObject(data) && data.code === "EMAIL_NOT_VERIFIED") {
        return {
          success: true,
          requiresVerification: true,
          email: typeof data.email === "string" ? data.email : email,
        };
      }
      const msg = getErrorMessage(data) ?? "Registration failed";
      throw new Error(msg);
    }
    const parsed = data as Record<string, unknown>;

    return {
      success: true,
      requiresVerification: parsed.requiresVerification === true,
      email: typeof parsed.email === "string" ? parsed.email : email,
    };
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
      if (res.status === 401) {
        if (/^unauthorized$/i.test(msg)) {
          setUser(null);
        }
        throw new Error(msg);
      }
      throw new Error(msg);
    }

    await fetchProfile();
  };

  /* 🗑️ DELETE ACCOUNT */
  const deleteAccount: AuthContextType["deleteAccount"] = async (input) => {
    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        mode: "confirm",
        confirmText: input.confirmText,
        currentPassword: input.currentPassword,
        code: input.code,
      }),
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
      const deviceId = getLoginDeviceId();
      if (user?.id) {
        fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            status: "offline",
            deviceId,
            deviceName: getLoginDeviceName(),
          }),
          keepalive: true,
        }).catch(() => {});
      }
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ deviceId }),
      });
    } finally {
      setUser(null);
      clearClientAuthArtifacts();
      
      // Clear service worker cache to prevent stale authenticated data
      if (typeof window !== "undefined" && "caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        }).catch(() => {});
      }
      
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
      login,
      loginWithGoogle,
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

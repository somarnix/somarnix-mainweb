"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

type LoginPageProps = {
  onNavigate: (page: string) => void;
};

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  // Redirect after login
  useEffect(() => {
    if (isAuthenticated) {
      onNavigate("home");
    }
  }, [isAuthenticated, onNavigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = document.getElementById("google-gsi-script") as HTMLScriptElement | null;
    if (existing) {
      setGoogleReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.head.appendChild(script);
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submitting) return;

    if (!email.trim() || !password) {
      toast.error(t("login.errors.required"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        toast.success(t("login.success"));
        // redirect handled by useEffect
      } else {
        if (result.reason === "deleted") {
          toast.error(
            t("login.errors.deleted") || "This account was deleted. Please create a new account."
          );
        } else if (result.reason === "banned_until") {
          const when = result.banUntil ? new Date(result.banUntil) : null;
          const whenLabel =
            when && !Number.isNaN(when.getTime()) ? when.toLocaleString() : null;
          const daysLeft = result.banDaysLeft && Number.isFinite(result.banDaysLeft)
            ? Math.max(1, Math.floor(result.banDaysLeft))
            : null;
          toast.error(
            daysLeft
              ? `This account is banned for ${daysLeft} day${daysLeft > 1 ? "s" : ""}${whenLabel ? ` (until ${whenLabel})` : ""}. Please try again later. If you believe this is a mistake, contact support in Telegram.`
              : whenLabel
                ? `${t("login.errors.bannedUntil") || "This account is banned until"} ${whenLabel}.`
                : (t("login.errors.banned") || "This account is banned.")
          );
        } else if (result.reason === "banned") {
          toast.error(
            t("login.errors.banned") || "This account is banned. Please contact support."
          );
        } else if (result.reason === "required") {
          toast.error(t("login.errors.required"));
        } else if (result.reason === "device_limit") {
          toast.error(
            result.maxDevices
              ? `You reached the login device limit (${result.maxDevices}).`
              : "You reached the login device limit."
          );
        } else if (result.reason === "email_not_verified") {
          toast.error(
            result.email
              ? `Email not verified for ${result.email}. Please verify your email code first.`
              : "Email not verified. Please verify your email code first."
          );
        } else if (result.reason === "password_not_set") {
          toast.error(
            result.message || "This account uses Google login. Please continue with Google."
          );
        } else {
          toast.error(t("login.errors.invalid"));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error("Google login is not configured.");
      return;
    }
    if (!googleReady || typeof window === "undefined" || !window.google?.accounts?.id) {
      toast.error("Google login is loading. Please try again.");
      return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      use_fedcm_for_prompt: false,
      callback: async (response: { credential?: string }) => {
        const credential = typeof response?.credential === "string" ? response.credential : "";
        if (!credential) {
          toast.error("Google login failed.");
          return;
        }
        const result = await loginWithGoogle(credential);
        if (!result.success) {
          toast.error(result.message || "Google login failed.");
          return;
        }
        toast.success(t("login.success"));
      },
    });
    window.google.accounts.id.prompt();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* LOGO */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">E</span>
              </div>
              <span className="text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Edugroit
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("login.title")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t("login.description")}
            </p>
          </div>

          {/* FORM */}
          <div className="mb-5">
            <Button type="button" variant="outline" className="w-full border-2" onClick={handleGoogleLogin}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("login.google")}
            </Button>
          </div>
          <form onSubmit={handleLogin} className="space-y-6" aria-busy={submitting}>
            {/* EMAIL */}
            <div>
              <Label htmlFor="email">{t("login.emailLabel")}</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <Label htmlFor="password">{t("login.passwordLabel")}</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* REMEMBER ME AND FORGET PASSWORD */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(Boolean(v))}
                />
                <Label htmlFor="remember">{t("login.remember")}</Label>
              </div>

              <Button
                type="button"
                onClick={() => onNavigate("forgot-password")}
                className="text-sm text-blue-600 hover:underline"
              >
                {t("login.forgot") || "Forgot password?"}
              </Button>
            </div>

            {/* SUBMIT */}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("login.loading") : t("login.signin")}
            </Button>
          </form>

          {/* REGISTER */}
          <p className="mt-6 text-center text-sm">
            {t("login.noAccount")}{" "}
            <button
              type="button"
              onClick={() => onNavigate("register")}
              className="text-blue-600 font-medium"
            >
              {t("login.signupLink")}
            </button>
          </p>
        </div>

        {/* BACK HOME */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="text-sm text-gray-600"
          >
            {t("login.backHome")}
          </button>
        </div>
      </div>
    </div>
  );
}

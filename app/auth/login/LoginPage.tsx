"use client";

import { useEffect, useRef, useState } from "react";
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
  const [trustDevice, setTrustDevice] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (
      !googleReady ||
      !clientId ||
      typeof window === "undefined" ||
      !window.google?.accounts?.id ||
      !googleButtonRef.current
    ) {
      return;
    }

    const container = googleButtonRef.current;
    container.innerHTML = "";

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

    const buttonWidth = Math.min(Math.max(container.offsetWidth || 280, 220), 360);
    const googleIdApi = window.google.accounts.id as unknown as {
      renderButton: (
        parent: HTMLElement,
        options: Record<string, string | number>
      ) => void;
    };

    googleIdApi.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      width: buttonWidth,
      logo_alignment: "left",
    });
  }, [googleReady, loginWithGoogle, t]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submitting) return;

    if (!email.trim() || !password) {
      toast.error(t("login.errors.required"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email.trim(), password, {
        verificationCode: twoFactorRequired ? verificationCode.trim() : undefined,
        trustDevice,
      });
      if (result.success) {
        setTwoFactorRequired(false);
        setVerificationCode("");
        toast.success(t("login.success"));
        // redirect handled by useEffect
      } else {
        if (result.reason === "two_factor_required") {
          setTwoFactorRequired(true);
          const isVerifyingExistingCode = verificationCode.trim().length > 0;
          const toastFn = isVerifyingExistingCode ? toast.error : toast.success;
          toastFn(
            isVerifyingExistingCode
              ? result.message || "Invalid or expired verification code. Please try again."
              : `We sent a 6-digit verification code to ${email.trim()}.`
          );
        } else if (result.reason === "deleted") {
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
        } else if (result.reason === "rate_limited") {
          const minutesLeft = result.retryAfterSeconds
            ? Math.max(1, Math.ceil(result.retryAfterSeconds / 60))
            : null;
          toast.error(
            result.message ||
              (minutesLeft
                ? `Too many login attempts. Try again in ${minutesLeft} minute(s).`
                : "Too many login attempts. Please try again later.")
          );
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

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-3 py-6 sm:px-6 sm:py-12 lg:px-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-8 dark:bg-gray-800">
          {/* LOGO */}
          <div className="text-center mb-8">
            <div className="mb-4 inline-flex flex-wrap items-center justify-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-linear-to-br from-blue-600 to-purple-600">
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
            <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
              {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                <div ref={googleButtonRef} className="flex min-h-11 w-full items-center justify-center" />
              ) : (
                <Button type="button" variant="outline" className="w-full border-0" disabled>
                  {t("login.google")}
                </Button>
              )}
            </div>
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setTwoFactorRequired(false);
                    setVerificationCode("");
                  }}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTwoFactorRequired(false);
                    setVerificationCode("");
                  }}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="trust-device"
                  checked={trustDevice}
                  onCheckedChange={(v) => setTrustDevice(Boolean(v))}
                  className="mt-0.5 shrink-0"
                />
                <Label htmlFor="trust-device" className="text-sm leading-5">
                  Trust this device for 30 days
                </Label>
              </div>

              <Button
                type="button"
                onClick={() => onNavigate("forgot-password")}
                className="justify-start px-0 text-left text-sm text-blue-600 hover:underline sm:justify-end"
              >
                {t("login.forgot") || "Forgot password?"}
              </Button>
            </div>

            {twoFactorRequired ? (
              <div>
                <Label htmlFor="verification-code">Verification code</Label>
                <div className="mt-1 space-y-2">
                  <Input
                    id="verification-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required={twoFactorRequired}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This device is not trusted yet. Enter the 6-digit code we sent to your email.
                  </p>
                </div>
              </div>
            ) : null}

            {/* SUBMIT */}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? t("login.loading")
                : twoFactorRequired
                  ? "Verify and sign in"
                  : t("login.signin")}
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
        <div className="mt-6 text-center">
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

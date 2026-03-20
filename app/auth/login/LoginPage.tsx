"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { AuthBrand } from "../../components/AuthBrand";
import { AuthPageControls } from "../../components/AuthPageControls";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { GoogleSignInButton } from "../shared/GoogleSignInButton";

type LoginPageProps = {
  onNavigate: (page: string) => void;
};

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [hasMounted, setHasMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const googleError = url.searchParams.get("googleError");
    if (!googleError) return;

    toast.error(googleError);
    url.searchParams.delete("googleError");
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, []);

  // Redirect after login
  useEffect(() => {
    if (isAuthenticated) {
      onNavigate("home");
    }
  }, [isAuthenticated, onNavigate]);

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
              ? result.message || t("login.errors.invalidVerificationCode")
              : t("login.twoFactorSent", { email: email.trim() })
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
              ? t("login.errors.bannedForDays", {
                  days: daysLeft,
                  until: whenLabel
                    ? t("login.errors.untilSuffix", { when: whenLabel })
                    : "",
                })
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
                ? t("login.errors.rateLimitedMinutes", { minutes: minutesLeft })
                : t("login.errors.rateLimited"))
          );
        } else if (result.reason === "device_limit") {
          toast.error(
            result.maxDevices
              ? t("login.errors.deviceLimitWithCount", { count: result.maxDevices })
              : t("login.errors.deviceLimit")
          );
        } else if (result.reason === "email_not_verified") {
          toast.error(
            result.email
              ? t("login.errors.emailNotVerifiedWithEmail", { email: result.email })
              : t("login.errors.emailNotVerified")
          );
        } else if (result.reason === "password_not_set") {
          toast.error(
            result.message || t("login.errors.passwordNotSet")
          );
        } else {
          toast.error(t("login.errors.invalid"));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendingCode || submitting) return;

    if (!email.trim() || !password) {
      toast.error(t("login.errors.required"));
      return;
    }

    setResendingCode(true);
    try {
      const result = await login(email.trim(), password, {
        trustDevice,
      });

      if (result.reason === "two_factor_required") {
        setTwoFactorRequired(true);
        setVerificationCode("");
        toast.success(result.message || t("login.twoFactorResent", { email: email.trim() }));
        return;
      }

      if (!result.success) {
        toast.error(result.message || t("login.errors.invalid"));
      }
    } finally {
      setResendingCode(false);
    }
  };

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-3 py-6 sm:px-6 sm:py-12 lg:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-8 dark:bg-gray-800">
            <div className="h-96 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-3 py-6 sm:px-6 sm:py-12 lg:px-8">
      <div className="w-full max-w-md">
        <AuthPageControls />
        <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-8 dark:bg-gray-800">
          {/* LOGO */}
          <div className="text-center mb-8">
            <AuthBrand />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("login.title")}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t("login.description")}
            </p>
          </div>

          {/* FORM */}
          <div className="mb-6 w-full max-w-full">
            <GoogleSignInButton
              clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
              text="signin_with"
              loadingLabel={t("login.googleLoading")}
              unavailableLabel={t("login.google")}
              onCredential={async (credential) => {
                const result = await loginWithGoogle(credential);
                if (!result.success) {
                  toast.error(result.message || t("login.errors.googleFailed"));
                  return;
                }
                toast.success(t("login.success"));
                onNavigate("home");
              }}
            />
          </div>
          <form onSubmit={handleLogin} className="space-y-6" aria-busy={submitting} autoComplete="off">
            {/* EMAIL */}
            <div>
              <Label htmlFor="email">{t("login.emailLabel")}</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  name="edugroit_login_email"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setTwoFactorRequired(false);
                    setVerificationCode("");
                  }}
                  placeholder={t("login.emailPlaceholder")}
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
                  name="edugroit_login_password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTwoFactorRequired(false);
                    setVerificationCode("");
                  }}
                  placeholder={t("login.passwordPlaceholder")}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
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
                  {t("login.trustDevice")}
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
                <Label htmlFor="verification-code">{t("login.twoFactorLabel")}</Label>
                <div className="mt-1 space-y-2">
                  <Input
                    id="verification-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder={t("login.twoFactorPlaceholder")}
                    maxLength={6}
                    required={twoFactorRequired}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("login.twoFactorHint")}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendCode}
                    disabled={resendingCode || submitting}
                    className="w-full"
                  >
                    {resendingCode ? t("login.sendingCode") : t("login.resendCode")}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* SUBMIT */}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? t("login.loading")
                : twoFactorRequired
                  ? t("login.verifyAndSignIn")
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

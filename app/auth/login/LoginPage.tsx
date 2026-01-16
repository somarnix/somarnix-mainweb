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
  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      const success = await login(email.trim(), password);

      if (success) {
        toast.success(t("login.success"));
        // redirect handled by useEffect
      } else {
        toast.error(t("login.errors.invalid"));
      }
    } finally {
      setSubmitting(false);
    }
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

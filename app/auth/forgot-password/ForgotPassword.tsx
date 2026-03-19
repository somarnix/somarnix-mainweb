"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { AuthBrand } from "../../components/AuthBrand";
import { AuthPageControls } from "../../components/AuthPageControls";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = { onNavigate: (page: string) => void };

export default function ForgotPassword({ onNavigate }: Props) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const v = email.trim();
    if (!v) {
      toast.error(t("login.errors.required") || "Email required");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error((data && data.error) || t("forgot.failed"));
        return;
      }

      toast.success(t("forgot.sent") || "If this email exists, a reset link was sent.");
      onNavigate("login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <AuthPageControls />
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <div className="mb-6 text-center">
            <AuthBrand />
          </div>
          <h2 className="text-xl font-bold mb-2">{t("forgot.title") || "Forgot password"}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {t("forgot.desc") || "Enter your email and we will send a reset link."}
          </p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">{t("login.emailLabel") || "Email"}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={submit} disabled={loading}>
              {loading ? (t("login.loading") || "Loading...") : (t("forgot.send") || "Send reset link")}
            </Button>

            <Button variant="outline" className="w-full" onClick={() => onNavigate("login")}>
              {t("forgot.back") || "Back to login"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

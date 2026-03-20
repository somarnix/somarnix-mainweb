"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import AuthCenteredCard from "../../components/auth/AuthCenteredCard";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  onNavigate: (page: string) => void;
};

export default function ResetPassword({ onNavigate }: Props) {
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState<{ email: string; token: string }>({ email: "", token: "" });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const search = new URLSearchParams(window.location.search);
    setParams({
      email: (search.get("email") || "").trim(),
      token: (search.get("token") || "").trim(),
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!params.email || !params.token) {
      toast.error(t("reset.invalidLink"));
      return;
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error(t("reset.fillAll"));
      return;
    }
    if (newPassword.trim().length < 6) {
      toast.error(t("reset.passwordTooShort"));
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      toast.error(t("reset.passwordMismatch"));
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: params.email,
          token: params.token,
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : t("reset.apiFailed"));
      }
      toast.success(t("reset.success"));
      onNavigate("login");
    } catch (err) {
      toast.error(t("reset.failed"), {
        description: err instanceof Error ? err.message : t("reset.tryAgain"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCenteredCard>
      <h2 className="text-xl font-bold mb-2">{t("reset.title")}</h2>
      <p className="text-sm text-gray-500 mb-6">
        {t("reset.description", {
          email: params.email || t("reset.accountFallback"),
        })}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="newPassword">{t("reset.newPassword")}</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword">{t("reset.confirmPassword")}</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? t("reset.saving") : t("reset.save")}
        </Button>
        <Button className="w-full" type="button" variant="outline" onClick={() => onNavigate("login")}>
          {t("reset.back")}
        </Button>
      </form>
    </AuthCenteredCard>
  );
}

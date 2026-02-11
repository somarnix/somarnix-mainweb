"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

type Props = {
  onNavigate: (page: string) => void;
};

export default function ResetPassword({ onNavigate }: Props) {
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
      toast.error("Reset link is invalid.");
      return;
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error("Please fill all fields.");
      return;
    }
    if (newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      toast.error("Password and confirm password do not match.");
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
        throw new Error(typeof data?.error === "string" ? data.error : "Reset password failed");
      }
      toast.success("Password reset successful. Please login.");
      onNavigate("login");
    } catch (err) {
      toast.error("Reset password failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-2">Reset password</h2>
        <p className="text-sm text-gray-500 mb-6">
          Set your new password for <span className="font-medium">{params.email || "your account"}</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save new password"}
          </Button>
          <Button className="w-full" type="button" variant="outline" onClick={() => onNavigate("login")}>
            Back to login
          </Button>
        </form>
      </div>
    </div>
  );
}

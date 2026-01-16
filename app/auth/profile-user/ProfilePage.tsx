"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  User,
  BookOpen,
  Settings,
  LogOut,
  Camera,
  Calendar,
  MapPin,
  CheckCircle,
  Clock,
  Award,
  Edit2,
  Globe,
  Sun,
  Moon,
  Trash2,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

type TabId = "overview" | "courses" | "settings";

const AVATARS: string[] = ["/Job Jik.jpg", "/Mrrecaps.png", "/Nut Roth Logo.png", "/Nut Roth.jpg"];

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, logout, updateProfile, deleteAccount } = useAuth();
  const { language, setLanguage, t } = useLanguage(); // ✅ must have t()
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    phone: "",
    location: "",
  });

  const redirectedRef = useRef(false);

  useEffect(() => {
    if (user) {
      redirectedRef.current = false;
      return;
    }
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    const tmr = setTimeout(() => onNavigate("login"), 0);
    return () => clearTimeout(tmr);
  }, [user, onNavigate]);

  const displayName = useMemo(() => {
    if (!user) return "";
    const fn = (user.firstName ?? "").trim();
    const ln = (user.lastName ?? "").trim();
    const full = `${fn} ${ln}`.trim();
    return full || user.username || user.email || "";
  }, [user]);

  const joinedText = useMemo(() => {
    if (!user?.joinedDate) return "";
    const d = new Date(user.joinedDate);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
  }, [user]);

  // const enrolledCourses = courses.slice(0, 3);

  const handleLogout = async () => {
    await logout();
    onNavigate("home");
  };

  const startEditing = () => {
    if (!user) return;
    const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    setEditForm({
      name: full || user.username || "",
      bio: user.bio || "",
      phone: user.phone || "",
      location: user.place || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => setIsEditing(false);

  const handleSaveProfile = async () => {
    if (!user) return;

    const parts = editForm.name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
    const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

    await updateProfile({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      bio: editForm.bio || undefined,
      phone: editForm.phone || undefined,
      place: editForm.location || undefined,
    });

    setIsEditing(false);
  };

  const tabs: Array<{ id: TabId; name: string; icon: typeof User }> = [
    { id: "overview", name: t("profile.overview"), icon: User },
    { id: "courses", name: t("profile.myCourses"), icon: BookOpen },
    { id: "settings", name: t("profile.settings"), icon: Settings },
  ];

  // ===== Change Password =====
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPw, setShowPw] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [pwOpen, setPwOpen] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const resetPwUI = () => {
    setPwOpen(false);
    setPwError(null);
    setPwSuccess(null);
    setPwLoading(false);
    setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPw({ current: false, next: false, confirm: false });
  };

  const handleChangePassword = async () => {
    setPwError(null);
    setPwSuccess(null);

    const cur = pwForm.currentPassword.trim();
    const nw = pwForm.newPassword.trim();
    const cf = pwForm.confirmPassword.trim();

    if (!cur || !nw || !cf) {
      setPwError(t("profile.passwordFillAll") || "Please fill all password fields.");
      return;
    }
    if (nw.length < 6) {
      setPwError(t("profile.passwordTooShort") || "New password must be at least 6 characters.");
      return;
    }
    if (nw !== cf) {
      setPwError(t("profile.passwordNotMatch") || "New password and confirm password do not match.");
      return;
    }

    try {
      setPwLoading(true);

      await updateProfile({
        currentPassword: cur,
        newPassword: nw,
      });

      setPwSuccess(t("profile.passwordChanged") || "Password updated successfully.");
      resetPwUI();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPwError(msg || (t("profile.passwordUpdateFailed") || "Password update failed."));
    } finally {
      setPwLoading(false);
    }
  };
  if (!user) return null;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="relative">
              <img
                src={user.avatarUrl || "/Job Jik.jpg"}
                alt={displayName}
                className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
              />

              <button
                onClick={() => setAvatarOpen((v) => !v)}
                className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white"
                type="button"
              >
                <Camera className="w-5 h-5" />
              </button>

              {avatarOpen && (
                <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 w-64 z-50">
                  <div className="text-sm font-semibold mb-2">
                    {t("profile.chooseAvatar")}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {AVATARS.map((src) => (
                      <button
                        key={src}
                        onClick={async () => {
                          await updateProfile({ avatarUrl: src });
                          setAvatarOpen(false);
                        }}
                        className="rounded-lg overflow-hidden border"
                        type="button"
                      >
                        <img src={src} className="w-full h-24 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white">{displayName}</h1>
              <p className="text-blue-100">{user.email}</p>

              <div className="flex gap-4 mt-2 justify-center md:justify-start">
                {!!joinedText && (
                  <span className="text-white flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> {t("profile.joined")} {joinedText}
                  </span>
                )}
                {!!user.place && (
                  <span className="text-white flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {user.place}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-white text-white"
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="w-4 h-4 mr-2" /> {t("profile.settings")}
              </Button>
              <Button
                variant="outline"
                className="border-white text-white"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" /> {t("profile.logout")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
                type="button"
              >
                <Icon className="w-5 h-5" /> {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* {activeTab === "overview" && (
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, label: t("profile.enrolled"), value: enrolledCourses.length },
              { icon: CheckCircle, label: t("profile.completed"), value: 12 },
              { icon: Clock, label: t("profile.hours"), value: "156h" },
              { icon: Award, label: t("profile.certificates"), value: 8 },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                  <Icon className="w-6 h-6 text-blue-600 mb-2" />
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-sm text-gray-500">{s.label}</div>
                </div>
              );
            })}
          </div>
        )} */}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold">{t("profile.about")}</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => (isEditing ? cancelEditing() : startEditing())}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {isEditing ? t("profile.cancel") : t("profile.edit")}
                </Button>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <Input
                    placeholder={t("profile.fullName")}
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <Input
                    placeholder={t("profile.bioPlaceholder")}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  />
                  <Input
                    placeholder={t("profile.phone")}
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                  <Input
                    placeholder={t("profile.location")}
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  />
                  <Button onClick={handleSaveProfile}>{t("profile.saveChanges")}</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>{user.bio || t("profile.passionate")}</p>
                  <p>{user.phone || t("profile.phone")}</p>
                  <p>{user.place || t("profile.location")}</p>
                </div>
              )}
            </div>
            {/* SECURITY / CHANGE PASSWORD */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{t("profile.security") || "Security"}</h3>

                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setPwError(null);
                    setPwSuccess(null);
                    setPwOpen((v) => !v);

                    // If closing panel, reset the form
                    if (pwOpen) {
                      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                      setShowPw({ current: false, next: false, confirm: false });
                    }
                  }}
                >
                  {pwOpen
                    ? (t("profile.close") || "Close")
                    : (t("profile.changePassword") || "Change Password")}
                </Button>
              </div>

              {!!pwError && <div className="mt-3 text-sm text-red-600">{pwError}</div>}
              {!!pwSuccess && <div className="mt-3 text-sm text-green-600">{pwSuccess}</div>}

              {pwOpen && (
                <div className="mt-4 space-y-3">
                  {/* Current Password */}
                  <div className="relative">
                    <Input
                      type={showPw.current ? "text" : "password"}
                      placeholder={t("profile.currentPassword") || "Current password"}
                      value={pwForm.currentPassword}
                      onChange={(e) =>
                        setPwForm({ ...pwForm, currentPassword: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                      onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                    >
                      {showPw.current ? "🙈" : "👁️"}
                    </button>
                  </div>

                  {/* New Password */}
                  <div className="relative">
                    <Input
                      type={showPw.next ? "text" : "password"}
                      placeholder={t("profile.newPassword") || "New password"}
                      value={pwForm.newPassword}
                      onChange={(e) =>
                        setPwForm({ ...pwForm, newPassword: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                      onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                    >
                      {showPw.next ? "🙈" : "👁️"}
                    </button>
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <Input
                      type={showPw.confirm ? "text" : "password"}
                      placeholder={t("profile.confirmNewPassword") || "Confirm new password"}
                      value={pwForm.confirmPassword}
                      onChange={(e) =>
                        setPwForm({ ...pwForm, confirmPassword: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                      onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                    >
                      {showPw.confirm ? "🙈" : "👁️"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={pwLoading}
                      type="button"
                    >
                      {pwLoading
                        ? (t("profile.saving") || "Saving...")
                        : (t("profile.savePassword") || "Save Password")}
                    </Button>

                    <Button
                      variant="outline"
                      type="button"
                      onClick={resetPwUI}
                    >
                      {t("profile.cancel") || "Cancel"}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500">
                    {t("profile.passwordTip") ||
                      "Tip: use 8+ characters with numbers and symbols."}
                  </p>
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
              <div className="flex justify-between items-center">
                <span>{t("profile.language")}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLanguage(language === "en" ? "km" : "en")}
                >
                  <Globe className="w-4 h-4 mr-2" /> {t("profile.switch")}
                </Button>
              </div>

              <div className="flex justify-between items-center">
                <span>{t("profile.theme")}</span>
                <Button size="sm" variant="outline" onClick={toggleTheme}>
                  {theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <div className="flex justify-between items-center">
                <div className="font-semibold text-red-600">{t("profile.deleteAccount")}</div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteText("");
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("profile.deleteAccount")}
                </Button>
              </div>

              {deleteOpen && (
                <div className="mt-4 border rounded-xl p-4">
                  <div className="font-bold mb-1">{t("profile.deleteWarnTitle")}</div>
                  <p className="text-sm text-gray-500 mb-3">{t("profile.deleteWarnBody")}</p>

                  <Input
                    placeholder={t("profile.confirmDelete")}
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                  />

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="destructive"
                      disabled={deleteText !== "DELETE"}
                      onClick={async () => {
                        await deleteAccount();
                        await logout();
                        onNavigate("home");
                      }}
                    >
                      {t("profile.confirm")}
                    </Button>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                      {t("profile.close")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

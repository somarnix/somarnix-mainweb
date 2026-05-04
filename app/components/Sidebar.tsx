"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Heart,
  ShoppingCart,
  Package,
  Layers,
  ChevronRight,
  User,
  X,
  Home,
  GraduationCap,
  Grid,
  Info,
  Edit,
  Code,
  Gamepad2,
  Wrench,
  Play,
  MessageCircle,
  LifeBuoy,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { ProfileAvatar } from "./ProfileAvatar";
import { UserOnlineStatus } from "./UserOnlineStatus";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useUserPresence } from "../lib/hooks/useUserPresence";

interface SidebarProps {
  isOpen: boolean;
  onNavigate: (page: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
  isAppShell?: boolean;
}

type NavLink = {
  id: string;
  page: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type ActionItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
};

type SidebarCountry = {
  name: string;
  code: string;
  flag: string;
  dial: string;
};

export function Sidebar({
  isOpen,
  onNavigate,
  onClose,
  isMobile = false,
  isAppShell = false,
}: SidebarProps) {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const userLevel = Number(user?.level ?? 1);
  const userHasLevelPerks = userLevel >= 2;
  const userAvatarBorderUrl = userHasLevelPerks ? user?.avatarBorderUrl ?? null : null;
  const userPresence = useUserPresence(user?.id ?? null);
  const verifiedBadgeSrc = "/border/blue%20verify.svg";
  const [sidebarCountry, setSidebarCountry] = useState<SidebarCountry | null>(null);

  useEffect(() => {
    const readCountry = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem("edugroit-country");
        if (!raw) {
          setSidebarCountry(null);
          return;
        }

        const parsed = JSON.parse(raw);
        if (parsed?.name && parsed?.cca2) {
          setSidebarCountry({
            name: String(parsed.name),
            code: String(parsed.cca2).toUpperCase(),
            flag: String(parsed.flag ?? "🌍"),
            dial: String(parsed.dial ?? ""),
          });
          return;
        }

        setSidebarCountry(null);
      } catch {
        setSidebarCountry(null);
      }
    };

    readCountry();
    const handler = () => readCountry();
    window.addEventListener("edugroit-country-change", handler);
    return () => window.removeEventListener("edugroit-country-change", handler);
  }, []);

  const navigationLinks: NavLink[] = [
    { id: "home", icon: Home, label: t("nav.home"), page: "home" },
    { id: "all", icon: Grid, label: t("nav.all"), page: "all" },
    { id: "courses", icon: GraduationCap, label: "AI", page: "courses" },
    { id: "programs", icon: Code, label: t("nav.programs"), page: "programs" },
    { id: "games", icon: Gamepad2, label: t("nav.games"), page: "games" },
    { id: "tools", icon: Wrench, label: t("nav.tools"), page: "tools" },
    { id: "video-courses", icon: GraduationCap, label: t("nav.videoCourses"), page: "video-courses" },
    { id: "blog", icon: Play, label: t("nav.blog"), page: "blog" },
    { id: "about", icon: Info, label: t("nav.about"), page: "services" },
  ];

  const sidebarMenuItems: ActionItem[] = [
    {
      id: "favorite",
      icon: Heart,
      label: t("profile.favorite"),
      onClick: () => {
        onNavigate("favorites");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "cart",
      icon: ShoppingCart,
      label: t("sidebar.cart"),
      onClick: () => {
        onNavigate("cart");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "orders",
      icon: Package,
      label: t("sidebar.orders"),
      onClick: () => {
        onNavigate("orders");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "chat",
      icon: MessageCircle,
      label: t("sidebar.chat"),
      onClick: () => {
        onNavigate("chat");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "services",
      icon: Layers,
      label: t("nav.about"),
      onClick: () => {
        onNavigate("services");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "profile",
      icon: User,
      label: t("sidebar.profile"),
      onClick: () => {
        onNavigate("profile");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "support-center",
      icon: LifeBuoy,
      label: t("sidebar.supportCenter"),
      onClick: () => {
        onNavigate("support-center");
        if (isMobile && onClose) onClose();
      },
    },
  ];

  const adminMenuItems = [
    { id: "admin-dashboard", label: t("admin.dashboard"), page: "admin-dashboard" },
    { id: "admin-orders-seller", label: t("admin.ordersSeller"), page: "admin-orders-seller" },
    { id: "admin-products", label: t("admin.products"), page: "admin-products" },
    { id: "admin-tools", label: t("admin.tools"), page: "admin-tools" },
    { id: "admin-tool-licenses", label: t("admin.toolLicenses"), page: "admin-tool-licenses" },
    { id: "admin-video-courses", label: t("admin.videoCourses"), page: "admin-video-courses" },
    { id: "admin-video-courses-promotions", label: t("admin.promotions"), page: "admin-video-courses-promotions" },
    { id: "admin-notifications", label: t("admin.notifications"), page: "admin-notifications" },
    { id: "admin-support-faq", label: "Support FAQ", page: "admin-support-faq" },
    { id: "admin-orders", label: t("admin.orders"), page: "admin-orders" },
    { id: "admin-users", label: t("admin.users"), page: "admin-users" },
    { id: "admin-test", label: t("admin.payments"), page: "admin-test" },
  ];

  const primaryExploreLinks = navigationLinks.slice(0, 6);
  const moreExploreLinks = navigationLinks.slice(6);

  if (!isOpen) return null;

  const overlayClass = isAppShell
    ? "fixed inset-0 z-40 bg-slate-950/72 backdrop-blur-sm"
    : "fixed inset-0 z-40 bg-black/50";

  const shellClass = isMobile
    ? isAppShell
      ? "fixed inset-y-0 left-0 z-50 h-full w-[88vw] max-w-[24rem] rounded-r-[2rem] border-r border-white/10"
      : "fixed top-0 left-0 z-50 h-full w-72 max-w-[82vw] sm:w-80"
    : "relative block";

  const surfaceClass = isAppShell
    ? "app-mobile-scroll bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(180deg,#081121_0%,#0f172a_52%,#111827_100%)]"
    : "bg-sidebar text-sidebar-foreground";

  return (
    <>
      {isMobile && <div className={overlayClass} onClick={onClose} />}

      <div
        className={`${shellClass} ${isMobile ? "" : "w-56 xl:w-72 2xl:w-80 sticky top-0 h-full self-stretch"} flex-shrink-0 overflow-y-auto shadow-2xl ${surfaceClass}`}
      >
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className={`absolute right-4 z-10 p-2 text-white transition-colors ${
              isAppShell
                ? "top-[calc(env(safe-area-inset-top,0px)+0.75rem)] rounded-full bg-white/10 hover:bg-white/15"
                : "top-4 rounded-lg hover:bg-gray-700"
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div
          className={`flex items-center justify-center gap-3 py-6 ${
            isAppShell
              ? "mx-4 mb-1 rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,1),_rgba(248,250,252,0.99)_58%,_rgba(239,246,255,0.98)_100%)] px-7 py-8 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
              : "px-6"
          }`}
        >
          <img
            src="/khqr-assets/somarnix-logo.png"
            alt="SOMARNIX"
            className={`flex-shrink-0 object-contain shadow-lg ${
              isAppShell
                ? "h-20 w-20 rounded-[1.75rem] bg-white p-1.5 shadow-[0_18px_34px_rgba(37,99,235,0.16)]"
                : "h-12 w-12 rounded-xl sm:h-14 sm:w-14"
            }`}
          />
          <div className="flex flex-col">
            <span
              className={`font-bold bg-gradient-to-r from-sky-500 via-blue-500 to-violet-500 bg-clip-text text-transparent tracking-tight ${
                isAppShell ? "text-[3.1rem] leading-[0.9]" : "text-2xl sm:text-3xl"
              }`}
            >
              SOMARNIX
            </span>
          </div>
        </div>

        {isAuthenticated && user ? (
          <div
            className={
              isAppShell
                ? "relative mx-4 mb-5 mt-0 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.28),_transparent_26%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.24),_transparent_38%),linear-gradient(160deg,#2563eb_0%,#1d4ed8_34%,#1e3a8a_68%,#172554_100%)] px-6 pb-7 pt-9 shadow-[0_24px_60px_rgba(15,23,42,0.5)]"
                : "relative mb-4 mt-2 rounded-b-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6"
            }
          >
            <div className="absolute top-0 right-0 flex gap-2">
              <button
                onClick={() => {
                  onNavigate("profile");
                  if (isMobile && onClose) onClose();
                }}
                className={`p-2 ${
                  isAppShell
                    ? "rounded-bl-2xl rounded-tr-[2rem] bg-slate-950/30 p-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-slate-950/40"
                    : "rounded-bl-xl bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-0 flex flex-col items-center text-center">
              <div className="relative">
                <ProfileAvatar
                  src={user.avatarUrl || "/avatar-default.png"}
                  alt={user.email}
                  fallback={user.username || user.email}
                  borderUrl={userAvatarBorderUrl}
                  className={isAppShell ? "h-[132px] w-[132px]" : "h-20 w-20"}
                  contentClassName={
                    userAvatarBorderUrl
                      ? `shadow-lg ${isAppShell ? "ring-4 ring-white/12" : ""}`
                      : `border-4 border-sidebar-foreground/20 shadow-lg ${isAppShell ? "ring-4 ring-white/12" : ""}`
                  }
                />
                <UserOnlineStatus
                  online={userPresence.online}
                  showLabel={false}
                  className="absolute bottom-1 right-1"
                  dotClassName={`border-2 border-white shadow-none dark:border-slate-900 ${
                    isAppShell ? "h-5 w-5" : "h-4 w-4"
                  }`}
                />
              </div>

              <div className="mt-4 w-full">
                <div className={isAppShell ? "flex justify-center" : ""}>
                  <div
                    className={`truncate text-xs ${
                      isAppShell ? "text-[15px] font-medium text-blue-100/90" : "text-blue-100/90"
                    }`}
                  >
                    {t("sidebar.userId")}: {user.id}
                  </div>
                </div>
                <div className="mt-3 flex min-w-0 items-center justify-center gap-2">
                  <div
                    className={`truncate font-bold text-white ${
                      isAppShell ? "text-[2.45rem] tracking-tight drop-shadow-[0_12px_28px_rgba(15,23,42,0.34)]" : ""
                    }`}
                  >
                    {user.username || user.email}
                  </div>
                  {userHasLevelPerks ? (
                    <Image
                      src={verifiedBadgeSrc}
                      alt="Verified"
                      width={32}
                      height={32}
                      className={`shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(14,165,233,0.45)] ${
                        isAppShell ? "h-8 w-8" : "h-5 w-5"
                      }`}
                    />
                  ) : null}
                </div>
                <div
                  className={`truncate text-blue-50 ${
                    isAppShell ? "mt-2 text-[15px] font-medium text-blue-50/95" : "text-xs"
                  }`}
                >
                  {user.email}
                </div>
                {isAppShell && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/80">
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                      {t("sidebar.androidApp")}
                    </span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                      {t("sidebar.nativeShell")}
                    </span>
                  </div>
                )}

                {sidebarCountry ? (
                  <div
                    className={`mt-3 flex w-full items-center justify-center gap-2 text-xs font-medium ${
                      isAppShell
                        ? "mx-auto mt-8 gap-3 text-[15px] font-semibold text-blue-50/95"
                        : "text-blue-100/85"
                    }`}
                  >
                    <span className={isAppShell ? "text-blue-100/80" : ""}>
                      {t("profile.country")}:
                    </span>
                    <span
                      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full text-base ${
                        isAppShell ? "h-11 w-11 bg-white/18 shadow-[0_10px_24px_rgba(15,23,42,0.25)]" : "h-7 w-7"
                      }`}
                    >
                      {sidebarCountry.flag.startsWith("http") ? (
                        <img
                          src={sidebarCountry.flag}
                          alt={sidebarCountry.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{sidebarCountry.flag}</span>
                      )}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={
              isAppShell
                ? "mx-4 mt-2 rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(37,99,235,0.96),rgba(29,78,216,0.9),rgba(124,58,237,0.82))] p-6"
                : "mt-2 rounded-b-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6"
            }
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                <User className="w-10 h-10" />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onNavigate("login");
                  if (isMobile && onClose) onClose();
                }}
                className="w-full bg-white text-blue-600"
              >
                {t("nav.login")}
              </Button>

              {sidebarCountry ? (
                <div className="mt-3 flex w-full items-center justify-center gap-2 text-xs font-medium text-blue-100/85">
                  <span>{t("profile.country")}:</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-base">
                    {sidebarCountry.flag.startsWith("http") ? (
                      <img
                        src={sidebarCountry.flag}
                        alt={sidebarCountry.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{sidebarCountry.flag}</span>
                    )}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {isMobile && isAppShell ? (
          <div className="space-y-5 px-4 pb-6">
            <SidebarSection title={t("sidebar.explore")}>
              {primaryExploreLinks.map((item) => (
                <AppShellLink
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  emphasize
                  onClick={() => {
                    onNavigate(item.page);
                    if (onClose) onClose();
                  }}
                />
              ))}
            </SidebarSection>

            <SidebarSection title={t("sidebar.library")}>
              {moreExploreLinks.map((item) => (
                <AppShellLink
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => {
                    onNavigate(item.page);
                    if (onClose) onClose();
                  }}
                />
              ))}
            </SidebarSection>

            <SidebarSection title={t("sidebar.mySpace")}>
              {sidebarMenuItems.map((item) => (
                <AppShellLink
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  onClick={item.onClick}
                />
              ))}
            </SidebarSection>
          </div>
        ) : isMobile ? (
          <div className="mb-4 px-3">
            {navigationLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.page);
                  if (onClose) onClose();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-primary hover:bg-secondary"
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        ) : null}

        {!isAppShell || !isMobile ? (
          <nav className="space-y-1 px-3">
            {sidebarMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-primary hover:bg-secondary"
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </nav>
        ) : null}

        {isAuthenticated && user?.role === "admin" && (
          <div
            className={
              isAppShell && isMobile
                ? "px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"
                : "mt-6 border-t border-white/10 px-3 pt-4"
            }
          >
            <p
              className={`mb-2 px-4 text-xs font-bold uppercase ${
                isAppShell && isMobile
                  ? "text-slate-400 tracking-[0.24em]"
                  : "text-gray-400 dark:text-slate-400"
              }`}
            >
              {t("sidebar.admin")}
            </p>
            <div className={isAppShell && isMobile ? "space-y-2 rounded-[1.5rem] border border-orange-400/15 bg-orange-500/5 p-2" : ""}>
              {adminMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.page);
                    if (isMobile && onClose) onClose();
                  }}
                  className={`flex w-full items-center px-4 py-3 text-orange-300 dark:text-orange-400 hover:bg-orange-500/10 ${
                    isAppShell && isMobile ? "rounded-[1.1rem]" : "rounded-lg"
                  }`}
                >
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        )}

        {isAppShell && isMobile ? (
          <div className="flex items-center gap-2 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] text-[11px] text-slate-500">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t("sidebar.appShellNavigation")}</span>
          </div>
        ) : null}
      </div>
    </>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {title}
      </p>
      <div className="space-y-2 rounded-[1.5rem] border border-white/8 bg-white/5 p-2">
        {children}
      </div>
    </div>
  );
}

function AppShellLink({
  icon: Icon,
  label,
  onClick,
  emphasize = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  emphasize?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[1.1rem] px-4 text-left transition hover:bg-white/8 ${
        emphasize ? "py-3.5 text-slate-100" : "py-3 text-slate-200"
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-2xl ${
          emphasize
            ? "h-11 w-11 bg-white/8 text-blue-200"
            : "h-10 w-10 bg-white/6 text-slate-200"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className={`block ${emphasize ? "text-base font-semibold" : "text-[15px] font-medium"}`}>
          {label}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-500" />
    </button>
  );
}

"use client";

import type { ComponentType, ReactNode } from "react";
import {
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
import Image from "next/image";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";

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

export function Sidebar({
  isOpen,
  onNavigate,
  onClose,
  isMobile = false,
  isAppShell = false,
}: SidebarProps) {
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();

  const navigationLinks: NavLink[] = [
    { id: "home", icon: Home, label: language === "km" ? "เนยโ€เนยยเนยโ€“เนยยเนยยเนยยเนยเธเนยย" : "Home", page: "home" },
    { id: "all", icon: Grid, label: language === "km" ? "เนยโ€เนยเธ–เนยยเนยยเนยเธเนยยเนยย" : "All", page: "all" },
    { id: "courses", icon: GraduationCap, label: "AI", page: "courses" },
    { id: "programs", icon: Code, label: language === "km" ? "เนยโฌเนยยเนยโ€เนยยเนยยเนยเธ—เนยโ€เนยเธ" : "Programs", page: "programs" },
    { id: "games", icon: Gamepad2, label: language === "km" ? "เนยย เนยโ€เนยยเนยยเนยย" : "Games", page: "games" },
    { id: "tools", icon: Wrench, label: language === "km" ? "เนยเธเนยโ€เนยโฌเนยยเนยยเนยย" : "Tools", page: "tools" },
    { id: "video-courses", icon: GraduationCap, label: language === "km" ? "Video Courses" : "Courses", page: "video-courses" },
    { id: "blog", icon: Play, label: language === "km" ? "เนยโ€เนยโ€เนยยเนยเธเนยโฌ" : "Blog", page: "blog" },
    { id: "about", icon: Info, label: language === "km" ? "เนยเธเนยยเนยโ€“เนยเธเนยยเนยเธเนยย" : "About", page: "services" },
  ];

  const sidebarMenuItems: ActionItem[] = [
    {
      id: "cart",
      icon: ShoppingCart,
      label: language === "km" ? "เนยโฌเนยโ€เนยโ€เนยยเนยโ€เนยยเนยโฌ" : "Cart",
      onClick: () => {
        onNavigate("cart");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "orders",
      icon: Package,
      label: language === "km" ? "เนยโฌเนยเธ–เนยยเนยโ€เนยยเนยโ€เนยยเนยเธ–เนยโ€เนยเธ—เนยย" : "Orders",
      onClick: () => {
        onNavigate("orders");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "chat",
      icon: MessageCircle,
      label: language === "km" ? "เนยยเนยยเนยยเนยโฌ" : "Chat",
      onClick: () => {
        onNavigate("chat");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "services",
      icon: Layers,
      label: language === "km" ? "เนยเธเนยยเนยโ€“เนยเธเนยยเนยเธเนยย" : "About",
      onClick: () => {
        onNavigate("services");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "profile",
      icon: User,
      label: language === "km" ? "เนยโ€เนยโ€เนยยเนยยเนยยเนยโ€เนยยเนยเธ—เนยยเนยเธเนยโ€" : "Profile",
      onClick: () => {
        onNavigate("profile");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "support-center",
      icon: LifeBuoy,
      label: language === "km" ? "เนยยเนยยเนยโ€เนยยเนยยเนยยเนยโ€เนยยเนยยเนยยเนยยเนยโ€เนยเธเนยย" : "Support Center",
      onClick: () => {
        onNavigate("support-center");
        if (isMobile && onClose) onClose();
      },
    },
  ];

  const adminMenuItems = [
    { id: "admin-dashboard", label: "Dashboard", page: "admin-dashboard" },
    { id: "admin-orders-seller", label: "Orders Seller", page: "admin-orders-seller" },
    { id: "admin-products", label: "Products", page: "admin-products" },
    { id: "admin-tools", label: "Tools", page: "admin-tools" },
    { id: "admin-tool-licenses", label: "License Tool", page: "admin-tool-licenses" },
    { id: "admin-video-courses", label: "Video Courses", page: "admin-video-courses" },
    { id: "admin-video-courses-promotions", label: "Promotions", page: "admin-video-courses-promotions" },
    { id: "admin-notifications", label: "Notifications", page: "admin-notifications" },
    { id: "admin-orders", label: "Orders", page: "admin-orders" },
    { id: "admin-users", label: "Users", page: "admin-users" },
    { id: "admin-test", label: "Payments", page: "admin-test" },
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
    : "bg-gradient-to-b from-gray-900 to-gray-800";

  return (
    <>
      {isMobile && <div className={overlayClass} onClick={onClose} />}

      <div
        className={`${shellClass} ${isMobile ? "" : "w-56 xl:w-72 2xl:w-80 sticky top-0 h-full self-stretch"} flex-shrink-0 overflow-y-auto text-white shadow-2xl ${surfaceClass}`}
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

        {isAuthenticated && user ? (
          <div
            className={
              isAppShell
                ? "relative mx-4 mb-5 mt-[calc(env(safe-area-inset-top,0px)+0.75rem)] rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(37,99,235,0.96),rgba(29,78,216,0.9),rgba(124,58,237,0.82))] px-6 pb-6 pt-7 shadow-[0_24px_60px_rgba(15,23,42,0.45)]"
                : "relative mb-4 rounded-b-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6"
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
                    ? "rounded-bl-2xl rounded-tr-[2rem] bg-black/20 hover:bg-black/30"
                    : "rounded-bl-xl bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2 flex flex-col items-center text-center">
              <Image
                src={user.avatarUrl || "/avatar-default.png"}
                alt={user.email}
                width={isAppShell ? 92 : 80}
                height={isAppShell ? 92 : 80}
                className={`rounded-full border-4 border-white object-cover shadow-lg ${
                  isAppShell ? "ring-4 ring-white/15" : ""
                }`}
              />

              <div className="mt-2 w-full">
                <div className="truncate text-xs text-blue-200">
                  {language === "km" ? "เนยเธเนยยเนยโ€เนยยเนยยเนยยเนยโ€เนยยเนยเธ–เนยย" : "User ID"}: {user.id}
                </div>
                <div className={`truncate font-bold ${isAppShell ? "mt-1 text-3xl tracking-tight" : ""}`}>
                  {user.username || user.email}
                </div>
                <div className={`truncate text-blue-100 ${isAppShell ? "mt-1 text-sm" : "text-xs"}`}>
                  {user.email}
                </div>
                {isAppShell && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/85">
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                      Android app
                    </span>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                      Native shell
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={
              isAppShell
                ? "mx-4 mt-[calc(env(safe-area-inset-top,0px)+0.75rem)] rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(37,99,235,0.96),rgba(29,78,216,0.9),rgba(124,58,237,0.82))] p-6"
                : "mt-12 rounded-b-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6"
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
                {language === "km" ? "เนยโ€ฆเนยเธเนยยเนยยเนยยเนยโ€เนยเธ" : "Login"}
              </Button>
            </div>
          </div>
        )}

        {isMobile && isAppShell ? (
          <div className="space-y-5 px-4 pb-6">
            <SidebarSection title="Explore">
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

            <SidebarSection title="Library">
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

            <SidebarSection title="My Space">
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
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-300 hover:bg-gray-700/50"
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
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-300 hover:bg-gray-700/50"
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
                  : "text-gray-400"
              }`}
            >
              Admin
            </p>
            <div className={isAppShell && isMobile ? "space-y-2 rounded-[1.5rem] border border-orange-400/15 bg-orange-500/5 p-2" : ""}>
              {adminMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.page);
                    if (isMobile && onClose) onClose();
                  }}
                  className={`flex w-full items-center px-4 py-3 text-orange-300 hover:bg-orange-500/10 ${
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
            <span>App shell navigation</span>
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

"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  Shield,
  ShoppingBag,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type AdminLayoutProps = {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
};

type AdminNavItem = {
  page: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const adminNavItems: AdminNavItem[] = [
  { page: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "admin-orders-seller", label: "Orders Seller", icon: ShoppingBag },
  { page: "admin-orders", label: "Orders", icon: ReceiptText },
  { page: "admin-products", label: "Products", icon: Package },
  { page: "admin-tools", label: "Tools", icon: Wrench },
  { page: "admin-cms", label: "CMS Pages", icon: FileText },
  { page: "admin-video-courses", label: "Video Courses", icon: BookOpen },
  { page: "admin-video-courses-promotions", label: "Promotions", icon: Settings },
  { page: "admin-tool-licenses", label: "License Tool", icon: Shield },
  { page: "admin-users", label: "Users", icon: Users },
  { page: "admin-notifications", label: "Notifications", icon: Bell },
  { page: "admin-support-faq", label: "Support FAQ", icon: LifeBuoy },
  { page: "admin-test", label: "Payments", icon: ReceiptText },
];

function getPageTitle(currentPage: string): string {
  return adminNavItems.find((item) => item.page === currentPage)?.label ?? "Admin";
}

export function AdminLayout({ children, currentPage, onNavigate }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentTitle = useMemo(() => getPageTitle(currentPage), [currentPage]);
  const accountName = user?.username || user?.firstName || user?.email || "Admin";

  const navigate = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const sidebar = (
    <aside
      className={`flex h-full flex-col bg-[#1d2327] text-[#c3c4c7] shadow-xl ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      <div className="flex h-14 items-center gap-3 border-b border-white/10 px-4">
        <img
          src="/khqr-assets/somarnix-logo.png"
          alt="SOMARNIX"
          className="h-9 w-9 shrink-0 rounded-md bg-white object-contain p-0.5"
        />
        {!collapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">SOMARNIX</div>
            <div className="truncate text-[11px] text-[#8c8f94]">Admin Console</div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <button
          onClick={() => navigate("home")}
          className="mb-2 flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[#c3c4c7] hover:bg-[#2c3338] hover:text-white"
          title="View site"
        >
          <Home className="h-4 w-4 shrink-0" />
          {!collapsed ? <span>View site</span> : null}
        </button>

        <div className="mb-2 border-t border-white/10" />

        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            currentPage === item.page ||
            (currentPage === "admin-video-course-detail" && item.page === "admin-video-courses");
          return (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              title={item.label}
              className={`flex w-full items-center gap-3 border-l-4 px-3 py-2.5 text-left text-sm transition ${
                active
                  ? "border-[#72aee6] bg-[#2271b1] text-white"
                  : "border-transparent text-[#c3c4c7] hover:bg-[#2c3338] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
              {!collapsed && active ? <ChevronRight className="ml-auto h-4 w-4" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        <button
          onClick={() => setCollapsed((value) => !value)}
          className="hidden w-full items-center gap-3 rounded px-2 py-2 text-sm text-[#c3c4c7] hover:bg-[#2c3338] hover:text-white lg:flex"
          title={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed ? <span>Collapse menu</span> : null}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f0f0f1] text-[#1d2327]">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-[280px] max-w-[84vw]">
            {sidebar}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute left-[calc(100%+0.75rem)] top-3 rounded bg-white p-2 text-slate-900 shadow"
              title="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}

      <div className={collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"}>
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-[#c3c4c7] bg-[#1d2327] px-3 text-white shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded p-2 hover:bg-white/10 lg:hidden"
              title="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{currentTitle}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("home")}
              className="hidden items-center gap-2 rounded px-3 py-1.5 text-xs text-[#c3c4c7] hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <ChevronLeft className="h-4 w-4" />
              View site
            </button>
            <div className="hidden h-5 w-px bg-white/20 sm:block" />
            <div className="hidden max-w-[220px] items-center gap-2 truncate text-xs text-[#c3c4c7] sm:flex">
              <User className="h-4 w-4" />
              <span className="truncate">{accountName}</span>
            </div>
            <button
              onClick={() => void logout()}
              className="rounded p-2 text-[#c3c4c7] hover:bg-white/10 hover:text-white"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3rem)] px-4 py-5 sm:px-6 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}

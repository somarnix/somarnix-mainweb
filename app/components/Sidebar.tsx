"use client";

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
} from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onNavigate: (page: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({
  isOpen,
  onNavigate,
  onClose,
  isMobile = false,
}: SidebarProps) {
  const { language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  /* ================= MOBILE NAV ================= */
  const navigationLinks = [
    { id: "home", icon: Home, label: language === "km" ? "ទំព័រដើម" : "Home", page: "home" },
    { id: "all", icon: Grid, label: language === "km" ? "ទាំងអស់" : "All", page: "all" },
    { id: "courses", icon: GraduationCap, label: language === "km" ? "វគ្គសិក្សា" : "Courses", page: "courses" },
    { id: "programs", icon: Code, label: language === "km" ? "កម្មវិធី" : "Programs", page: "programs" },
    { id: "games", icon: Gamepad2, label: language === "km" ? "ហ្គេម" : "Games", page: "games" },
    { id: "tools", icon: Wrench, label: language === "km" ? "ឧបករណ៍" : "Tools", page: "tools" },
    { id: "blog", icon: Play, label: language === "km" ? "វីដេអូ" : "Blog", page: "blog" },
    { id: "about", icon: Info, label: language === "km" ? "អំពីយើង" : "About", page: "about" },
  ];

  /* ================= MAIN MENU (SPA) ================= */
  const sidebarMenuItems = [
    {
      id: "cart",
      icon: ShoppingCart,
      label: language === "km" ? "កន្ត្រក" : "Cart",
      onClick: () => {
        onNavigate("cart");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "orders",
      icon: Package,
      label: language === "km" ? "ការបញ្ជាទិញ" : "Orders",
      onClick: () => {
        onNavigate("orders");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "services",
      icon: Layers,
      label: language === "km" ? "សេវាកម្ម" : "Services",
      onClick: () => {
        onNavigate("services");
        if (isMobile && onClose) onClose();
      },
    },
    {
      id: "profile",
      icon: User,
      label: language === "km" ? "ប្រវត្តិរូប" : "Profile",
      onClick: () => {
        onNavigate("profile");
        if (isMobile && onClose) onClose();
      },
    },
  ];

  /* ================= ADMIN MENU (ROUTER) ================= */
  const adminMenuItems = [
    { id: "admin-dashboard", label: "Dashboard", page: "admin-dashboard" },
    { id: "admin-products", label: "Products", page: "admin-products" },
    { id: "admin-orders", label: "Orders", page: "admin-orders" },
    { id: "admin-users", label: "Users", page: "admin-users" },
    { id: "admin-test", label: "AminTest", page: "admin-test" },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? "fixed top-0 left-0 h-full z-50 md:hidden"
            : "hidden md:block md:relative"
        } w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl overflow-y-auto`}
      >
        {/* Close button */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* USER CARD */}
        {isAuthenticated && user ? (
          <div className="relative p-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-b-3xl mb-4">
            <div className="absolute top-0 right-0 flex gap-2">
              <button
                onClick={() => {
                  onNavigate("profile");
                  if (isMobile && onClose) onClose();
                }}
                className="bg-gray-700 hover:bg-gray-600 p-2 rounded-bl-xl"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center mt-2">
              <Image
                src={user.avatarUrl || "/avatar-default.png"}
                alt={user.email}
                width={80}
                height={80}
                className="rounded-full border-4 border-white shadow-lg object-cover"
              />

              <div className="mt-2 w-full">
                <div className="text-xs text-blue-200 truncate">
                  {language === "km" ? "អត្តសញ្ញាណ" : "User ID"}: {user.id}
                </div>
                <div className="font-bold truncate">
                  {user.username || user.email}
                </div>
                <div className="text-xs text-blue-100 truncate">
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-b-3xl mt-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center">
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
                {language === "km" ? "ចូលគណនី" : "Login"}
              </Button>
            </div>
          </div>
        )}

        {/* MOBILE NAV */}
        {isMobile && (
          <div className="px-3 mb-4">
            {navigationLinks.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  onNavigate(l.page);
                  if (onClose) onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700/50"
              >
                <l.icon className="w-5 h-5" />
                <span className="flex-1 text-left">{l.label}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        )}

        {/* MAIN MENU */}
        <nav className="px-3 space-y-1">
          {sidebarMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700/50"
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          ))}
        </nav>

        {/* ADMIN MENU */}
        {isAuthenticated && user?.role === "admin" && (
          <div className="px-3 mt-6 border-t border-white/10 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase px-4 mb-2">
              Admin
            </p>
            {adminMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.page); // <-- use App.tsx navigation
                  if (isMobile && onClose) onClose();
                }}
                className="w-full flex items-center px-4 py-3 rounded-lg text-orange-300 hover:bg-orange-500/10"
              >
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}

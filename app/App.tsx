"use client";
// app/App.tsx
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MainLayout } from "./layouts/MainLayout";
import { useAppShellMode } from "./lib/app-shell";

import HomePage from "./pages/homepage/HomePage";
import { AllPage } from "./pages/all-category/AllPage";
import { AiPage } from "./pages/ai/AiPage";
import { ProgramsPage } from "./pages/programs/ProgramsPage";
import { GamesPage } from "./pages/games/GamesPage";
import { ToolsPage } from "./pages/tools-ai/ToolsPage";
import { CoursesPage } from "./pages/courses/CoursesPage";
import { VideoDetailPage } from "./pages/courses/VideoDetailPage";
import { ServicesPage } from "./pages/services/ServicesPage";
import { BlogPage } from "./pages/blogs/BlogPage";

import LoginPage from "./auth/login/LoginPage";
import { RegisterPage } from "./auth/register/RegisterPage";
import ForgotPassword from "./auth/forgot-password/ForgotPassword";
import ResetPassword from "./auth/reset-password/ResetPassword";
import { ProfilePage } from "./auth/profile-user/ProfilePage";

import { CartPage } from "./order/cart/CartPage";
import { CheckoutPage } from "./order/checkout/CheckoutPage";
import { OrdersPage } from "./pages/order-page/OrdersPage";
import { OrderDetailPage } from "./pages/order-page/OrderDetailPage";

import { Toaster } from "sonner";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";

import AdminDashboardPage from "./admin-pages/dashboard/AdminDashboardPage";
import AdminOrdersSellerPage from "./admin-pages/orders-seller/AdminOrdersSellerPage";
import AdminProductsPage from "./admin-pages/products/AdminProductsPage";
import AdminOrdersPage from "./admin-pages/orders/AdminOrdersPage";
import AdminUsersPage from "./admin-pages/users/AdminUsersPage";
import AdminTest from "./admin-pages/admin-test/AdminTest";
import AdminVideoCoursesPage from "./admin-pages/video-courses/AdminVideoCoursesPage";
import AdminToolLicensesPage from "./admin-pages/tool-licenses/AdminToolLicensesPage";
import AdminNotificationsPage from "./admin-pages/notifications/AdminNotificationsPage";

import ProductDetailPage from "./pages/product-detail/ProductDetailPage";
import { ChatPage } from "./pages/chat/ChatPage";
import { ChatConversationPage } from "./pages/chat/ChatConversationPage";
import Veo3 from "./pages/tools-ai/veo3/Veo3";
import ToolDownload from "./pages/tools-ai/tooldownloadvideo/ToolDownload";
import VideoEditorPage from "./pages/tools-ai/video-editor/Videoeditor";
import TranslateVideoAI from "./pages/tools-ai/translatevideo/TranslateVideoAI";
import PromtAi from "./pages/tools-ai/promt-ai/PromtAi";
import { SupportCenterPage } from "./pages/support/SupportCenterPage";

type AppPage =
  | "home"
  | "courses"
  | "programs"
  | "games"
  | "tools"
  | "all"
  | "chat"
  | "chat-detail"
  | "video-detail"
  | "tool-detail"
  | "product-detail"
  | "blog"
  | "video-courses"
  | "services"
  | "support-center"
  | "profile"
  | "account"
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "cart"
  | "checkout"
  | "orders"
  | "order-detail"
  | "admin-dashboard"
  | "admin-orders-seller"
  | "admin-products"
  | "admin-tools"
  | "admin-tool-licenses"
  | "admin-orders"
  | "admin-users"
  | "admin-test"
  | "admin-notifications"
  | "admin-video-courses"
  | "admin-video-courses-promotions"
  | "admin-video-course-detail";

type RouteState = {
  page: AppPage;
  productSlug: string | null;
  orderId: string | null;
  videoId: string | null;
  adminVideoCourseId: string | null;
  toolSlug: string | null;
  sellerId: string | null;
};

const ALL_PAGES: ReadonlyArray<AppPage> = [
  "home",
  "courses",
  "programs",
  "games",
  "tools",
  "all",
  "chat",
  "chat-detail",
  "video-detail",
  "product-detail",
  "blog",
  "video-courses",
  "services",
  "support-center",
  "profile",
  "account",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "cart",
  "checkout",
  "orders",
  "order-detail",
  "admin-dashboard",
  "admin-orders-seller",
  "admin-products",
  "admin-tools",
  "admin-tool-licenses",
  "admin-orders",
  "admin-users",
  "admin-test",
  "admin-notifications",
  "admin-video-courses",
  "admin-video-courses-promotions",
  "admin-video-course-detail",
];

const STATIC_ROUTES: Record<string, AppPage> = {
  "/": "home",
  "/ai": "courses",
  "/programs": "programs",
  "/games": "games",
  "/tools": "tools",
  "/all": "all",
  "/chat": "chat",
  "/courses": "video-courses",
  "/blog": "blog",
  "/services": "services",
  "/support": "support-center",
  "/profile": "profile",
  "/account": "account",
  "/login": "login",
  "/register": "register",
  "/forgot-password": "forgot-password",
  "/auth/reset-password": "reset-password",
  "/cart": "cart",
  "/checkout": "checkout",
  "/orders": "orders",
  "/admin/dashboard": "admin-dashboard",
  "/admin/orders-seller": "admin-orders-seller",
  "/admin/products": "admin-products",
  "/admin/tools": "admin-tools",
  "/admin/tools/licenses": "admin-tool-licenses",
  "/admin/orders": "admin-orders",
  "/admin/users": "admin-users",
  "/admin/test": "admin-test",
  "/admin/notifications": "admin-notifications",
  "/admin/video-courses": "admin-video-courses",
  "/admin/video-courses/promotions": "admin-video-courses-promotions",
};

function normalizePath(pathname?: string | null): string {
  if (!pathname || pathname === "") return "/";
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }
  return pathname;
}

function normalizeToolRouteSlug(value?: string | null): string {
  const slug = (value ?? "").trim().toLowerCase();
  if (!slug) return "";
  if (slug === "toolveo3") return "veo3";
  if (slug === "videoeditor") return "video-editor";
  if (slug === "translatevideo-ai") return "translatevideo";
  if (slug === "prompt-ai") return "promt-ai";
  return slug;
}

function resolveRoute(pathname?: string | null): RouteState {
  const normalized = normalizePath(pathname);
  const staticPage = STATIC_ROUTES[normalized];
  if (staticPage) {
    return {
      page: staticPage,
      productSlug: null,
      orderId: null,
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: null,
    };
  }

  const segments = normalized.split("/").filter(Boolean);

  if (segments.length >= 2 && segments[0] === "blog") {
    return {
      page: "blog",
      productSlug: null,
      orderId: null,
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: decodeURIComponent(segments[1]),
    };
  }

  if (segments.length >= 2 && (segments[0] === "video" || segments[0] === "courses")) {
    return {
      page: "video-detail",
      productSlug: null,
      orderId: null,
      videoId: decodeURIComponent(segments[1]),
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: null,
    };
  }

  if (segments.length >= 2 && segments[0] === "tools-ai") {
    return {
      page: "tool-detail",
      productSlug: null,
      orderId: null,
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: decodeURIComponent(segments[1]),
      sellerId: null,
    };
  }

  if (segments.length >= 2 && segments[0] === "product") {
    return {
      page: "product-detail",
      productSlug: decodeURIComponent(segments[1]),
      orderId: null,
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: null,
    };
  }

  if (segments.length >= 2 && segments[0] === "orders") {
    return {
      page: "order-detail",
      productSlug: null,
      orderId: decodeURIComponent(segments[1]),
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: null,
    };
  }

  if (segments.length >= 2 && segments[0] === "chat") {
    return {
      page: "chat-detail",
      productSlug: null,
      orderId: decodeURIComponent(segments[1]),
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: null,
    };
  }

  if (segments.length >= 3 && segments[0] === "admin" && segments[1] === "video-courses") {
    return {
      page: "admin-video-course-detail",
      productSlug: null,
      orderId: null,
      videoId: null,
      adminVideoCourseId: decodeURIComponent(segments[2]),
      toolSlug: null,
      sellerId: null,
    };
  }

  return {
    page: "home",
    productSlug: null,
    orderId: null,
    videoId: null,
    adminVideoCourseId: null,
    toolSlug: null,
    sellerId: null,
  };
}

function toAppPage(value: string): AppPage {
  return ALL_PAGES.includes(value as AppPage) ? (value as AppPage) : "home";
}

function buildPathForPage(
  page: AppPage,
  ctx?: {
    productSlug?: string | null;
    orderId?: string | number | null;
    videoId?: string | null;
    adminVideoCourseId?: string | null;
    sellerId?: string | null;
  }
): string {
  switch (page) {
    case "home":
      return "/";
    case "courses":
      return "/ai";
    case "programs":
      return "/programs";
    case "games":
      return "/games";
    case "tools":
      return "/tools";
    case "all":
      return "/all";
    case "chat":
      return "/chat";
    case "chat-detail":
      return ctx?.orderId ? `/chat/${encodeURIComponent(String(ctx.orderId))}` : "/chat";
    case "video-detail":
      return ctx?.videoId ? `/courses/${encodeURIComponent(String(ctx.videoId))}` : "/courses";
    case "blog":
      return ctx?.sellerId ? `/blog/${encodeURIComponent(String(ctx.sellerId))}` : "/blog";
    case "video-courses":
      return "/courses";
    case "services":
      return "/services";
    case "support-center":
      return "/support";
    case "profile":
      return "/profile";
    case "account":
      return "/account";
    case "login":
      return "/login";
    case "register":
      return "/register";
    case "forgot-password":
      return "/forgot-password";
    case "reset-password":
      return "/auth/reset-password";
    case "cart":
      return "/cart";
    case "checkout":
      return "/checkout";
    case "orders":
      return "/orders";
    case "admin-dashboard":
      return "/admin/dashboard";
    case "admin-orders-seller":
      return "/admin/orders-seller";
    case "admin-products":
      return "/admin/products";
    case "admin-tools":
      return "/admin/tools";
    case "admin-tool-licenses":
      return "/admin/tools/licenses";
    case "admin-orders":
      return "/admin/orders";
    case "admin-users":
      return "/admin/users";
    case "admin-test":
      return "/admin/test";
    case "admin-notifications":
      return "/admin/notifications";
    case "admin-video-courses":
      return "/admin/video-courses";
    case "admin-video-courses-promotions":
      return "/admin/video-courses/promotions";
    case "admin-video-course-detail":
      return ctx?.adminVideoCourseId
        ? `/admin/video-courses/${encodeURIComponent(String(ctx.adminVideoCourseId))}`
        : "/admin/video-courses";
      case "product-detail":
        return ctx?.productSlug ? `/product/${encodeURIComponent(ctx.productSlug)}` : "/all";
    case "order-detail":
      return ctx?.orderId
        ? `/orders/${encodeURIComponent(String(ctx.orderId))}`
        : "/orders";
    case "tool-detail":
      return ctx?.productSlug ? `/tools-ai/${encodeURIComponent(ctx.productSlug)}` : "/tools";
    default:
      return "/";
  }
}

type CartApiItem = {
  qty?: number;
  order_info_json?: string | null;
};

function getComboCourseQtyFromOrderInfo(raw: string | null | undefined): {
  comboId: string | null;
  courseQty: number;
} {
  if (!raw || typeof raw !== "string") {
    return { comboId: null, courseQty: 0 };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { comboId: null, courseQty: 0 };
    }
    const comboIdRaw = (parsed as Record<string, unknown>).promotion_combo_id;
    const comboId =
      comboIdRaw === null || comboIdRaw === undefined
        ? null
        : String(comboIdRaw).trim() || null;
    const courseItems = (parsed as Record<string, unknown>).promotion_course_items;
    if (!Array.isArray(courseItems)) {
      return { comboId, courseQty: 0 };
    }
    const courseQty = courseItems.reduce((sum, row) => {
      if (!row || typeof row !== "object") return sum;
      const qtyRaw = Number((row as Record<string, unknown>).qty ?? 1);
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
      return sum + qty;
    }, 0);
    return { comboId, courseQty };
  } catch {
    return { comboId: null, courseQty: 0 };
  }
}

export default function App() {
  const initialPath = usePathname() ?? "/";
  const [routeState, setRouteState] = useState<RouteState>(() => resolveRoute(initialPath));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = resolveRoute(window.location.pathname);
    window.history.replaceState(initial, "", window.location.pathname + window.location.search);

    const handlePop = (event: PopStateEvent) => {
      event.stopImmediatePropagation();
      const nextRaw =
        (event.state && typeof event.state === "object" && "page" in event.state
          ? (event.state as RouteState)
          : resolveRoute(window.location.pathname));
      const next: RouteState = {
        ...nextRaw,
        toolSlug: nextRaw.toolSlug ?? null,
        sellerId: nextRaw.sellerId ?? null,
      };
      setRouteState(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const activePage = routeState.page;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isAppShell = useAppShellMode();
  const [selectedCartGroupKeys, setSelectedCartGroupKeys] = useState<string[]>([]);

  /* ================= CART COUNT ================= */
  const [cartCount, setCartCount] = useState<number>(0);

  const refreshCartCount = async () => {
    try {
      const res = await fetch("/api/cart", { method: "GET", cache: "no-store" });

      if (!res.ok) {
        setCartCount(0);
        return;
      }

      const data = (await res.json()) as { items?: CartApiItem[] };

      const items = Array.isArray(data.items) ? data.items : [];

      // Count real cart rows qty + included combo-course qty (count once per combo).
      const totalQty = items.reduce((sum, it) => sum + Number(it.qty ?? 0), 0);
      const seenComboIds = new Set<string>();
      const comboCourseQty = items.reduce((sum, it) => {
        const { comboId, courseQty } = getComboCourseQtyFromOrderInfo(it.order_info_json);
        if (!comboId || seenComboIds.has(comboId)) return sum;
        seenComboIds.add(comboId);
        return sum + courseQty;
      }, 0);

      setCartCount(totalQty + comboCourseQty);
    } catch {
      setCartCount(0);
    }
  };

  // load once (and whenever you come back to app)
  useEffect(() => {
    const refresh = () => {
      void refreshCartCount();
    };
    refresh();
    if (typeof window !== "undefined") {
      window.addEventListener("cart:changed", refresh as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("cart:changed", refresh as EventListener);
      }
    };
  }, []);

  const navigateInternal = (next: RouteState) => {
    if (typeof window !== "undefined") {
      const target = buildPathForPage(next.page, {
        productSlug: next.productSlug ?? undefined,
        orderId: next.orderId ?? undefined,
        videoId: next.videoId ?? undefined,
        sellerId: next.sellerId ?? undefined,
      });
      if (window.location.pathname !== target) {
        window.history.pushState(next, "", target);
      } else {
        window.history.replaceState(next, "", target);
      }
    }
    setRouteState(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigate = (page: string) => {
    const normalized = toAppPage(page);
    const nextState: RouteState = {
      page: normalized,
      productSlug: normalized === "product-detail" ? routeState.productSlug : null,
      orderId: normalized === "order-detail" ? routeState.orderId : null,
      videoId: normalized === "video-detail" ? routeState.videoId : null,
      adminVideoCourseId:
        normalized === "admin-video-course-detail" ? routeState.adminVideoCourseId : null,
      toolSlug: normalized === "tool-detail" ? routeState.toolSlug : null,
      sellerId: normalized === "blog" ? routeState.sellerId : null,
    };
    navigateInternal(nextState);

    // optional: refresh when open cart/checkout/orders
    if (normalized === "cart" || normalized === "checkout") {
      refreshCartCount();
    }
  };

  const handleOpenOrderDetail = (orderId: number | string) => {
    navigateInternal({
      page: "order-detail",
      orderId: String(orderId),
      productSlug: null,
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: null,
    });
  };

  const handleOpenProductDetail = (slug: string) => {
    navigateInternal({
      page: "product-detail",
      productSlug: slug,
      orderId: null,
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: null,
    });
  };

  const handleOpenToolDetail = (slug: string) => {
    navigateInternal({
      page: "tool-detail",
      productSlug: null,
      orderId: null,
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: slug,
      sellerId: null,
    });
  };

  const handleOpenVideoDetail = (slug: string) => {
    navigateInternal({
      page: "video-detail",
      productSlug: null,
      orderId: null,
      videoId: slug,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: null,
    });
  };

  const handleOpenChat = (orderId: number) => {
    navigateInternal({
      page: "chat-detail",
      orderId: String(orderId),
      productSlug: null,
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: null,
    });
  };

  const handleOpenSellerBlog = (sellerId: number | string) => {
    navigateInternal({
      page: "blog",
      productSlug: null,
      orderId: null,
      videoId: null,
      adminVideoCourseId: null,
      toolSlug: null,
      sellerId: String(sellerId),
    });
  };

  const orderDetailId = useMemo(() => {
    if (routeState.page !== "order-detail") return null;
    if (!routeState.orderId) return null;
    return /^\d+$/.test(routeState.orderId) ? Number(routeState.orderId) : routeState.orderId;
  }, [routeState.orderId, routeState.page]);

  const videoDetailSlug = useMemo(() => {
    if (routeState.page !== "video-detail") return null;
    return routeState.videoId ?? null;
  }, [routeState.page, routeState.videoId]);

  const adminVideoCourseId = useMemo(() => {
    if (routeState.page !== "admin-video-course-detail") return null;
    return routeState.adminVideoCourseId ?? null;
  }, [routeState.adminVideoCourseId, routeState.page]);

  const chatDetailOrderId = useMemo(() => {
    if (routeState.page !== "chat-detail") return null;
    return routeState.orderId ?? null;
  }, [routeState.orderId, routeState.page]);

  const toolSlug = useMemo(() => {
    if (routeState.page !== "tool-detail") return null;
    return routeState.toolSlug ?? null;
  }, [routeState.page, routeState.toolSlug]);

  const renderPage = () => {
    switch (activePage) {
      case "home":
        return (
          <HomePage
            onNavigate={handleNavigate}
            onOpenProductDetail={handleOpenProductDetail}
          />
        );

      case "courses":
        return <AiPage onOpenProductDetail={handleOpenProductDetail} />;

      case "programs":
        return <ProgramsPage onOpenProductDetail={handleOpenProductDetail} />;

      case "games":
        return <GamesPage onOpenProductDetail={handleOpenProductDetail} />;

      case "tools":
        return <ToolsPage onOpenProductDetail={handleOpenProductDetail} />;

      case "all":
        return <AllPage onOpenProductDetail={handleOpenProductDetail} />;

      case "product-detail":
        return routeState.productSlug ? (
          <ProductDetailPage
            slug={routeState.productSlug}
            onBack={() => handleNavigate("all")}
            onOpenProduct={handleOpenProductDetail}
            onOpenSellerBlog={handleOpenSellerBlog}
            // ✅ allow detail page to refresh cart badge after add
            onCartChanged={refreshCartCount}
          />
        ) : (
          <AllPage onOpenProductDetail={handleOpenProductDetail} />
        );

      case "tool-detail":
        if (!toolSlug) return <ToolsPage onOpenProductDetail={handleOpenProductDetail} />;
        {
          const normalizedTool = normalizeToolRouteSlug(toolSlug);
          if (normalizedTool === "veo3") return <Veo3 toolSlug={toolSlug} />;
          if (normalizedTool === "tooldownloadvideo") return <ToolDownload toolSlug={toolSlug} />;
          if (normalizedTool === "video-editor") return <VideoEditorPage toolSlug={toolSlug} />;
          if (normalizedTool === "translatevideo")
            return <TranslateVideoAI />;
          if (normalizedTool === "promt-ai") return <PromtAi toolSlug={toolSlug} />;
        }
        return <ToolsPage onOpenProductDetail={handleOpenProductDetail} />;

      case "blog":
        return <BlogPage initialSellerId={routeState.sellerId} />;

      case "video-courses":
        return (
          <CoursesPage
            onNavigate={handleNavigate}
            onOpenVideoDetail={handleOpenVideoDetail}
          />
        );

      case "video-detail":
        return videoDetailSlug ? (
          <VideoDetailPage
            slug={videoDetailSlug}
            onNavigate={handleNavigate}
            onBack={() => handleNavigate("video-courses")}
            onOpenOrderDetail={handleOpenOrderDetail}
            onOpenSellerBlog={handleOpenSellerBlog}
          />
        ) : (
          <CoursesPage
            onNavigate={handleNavigate}
            onOpenVideoDetail={handleOpenVideoDetail}
          />
        );

      case "services":
        return <ServicesPage onNavigate={handleNavigate} />;

      case "support-center":
        return <SupportCenterPage />;

      case "chat":
        return (
          <ChatPage
            onNavigate={handleNavigate}
            onOpenOrderDetail={handleOpenOrderDetail}
            onOpenConversation={handleOpenChat}
          />
        );
      case "chat-detail":
        return chatDetailOrderId ? (
          <ChatConversationPage
            orderId={chatDetailOrderId}
            onNavigate={handleNavigate}
            onOpenOrderDetail={handleOpenOrderDetail}
          />
        ) : (
          <ChatPage
            onNavigate={handleNavigate}
            onOpenOrderDetail={handleOpenOrderDetail}
            onOpenConversation={handleOpenChat}
          />
        );

      case "profile":
      case "account":
        return (
          <ProfilePage
            onNavigate={handleNavigate}
            onOpenProductDetail={handleOpenProductDetail}
            onOpenToolDetail={handleOpenToolDetail}
            onOpenOrderDetail={handleOpenOrderDetail}
          />
        );

      case "login":
        return <LoginPage onNavigate={handleNavigate} />;

      case "register":
        return <RegisterPage onNavigate={handleNavigate} />;

      case "forgot-password":
        return <ForgotPassword onNavigate={handleNavigate} />;
      case "reset-password":
        return <ResetPassword onNavigate={handleNavigate} />;

      case "cart":
        return (
          <CartPage
            onNavigate={handleNavigate}
            selectedCartGroupKeys={selectedCartGroupKeys}
            onSelectionChange={setSelectedCartGroupKeys}
          />
        );

      case "checkout":
        return (
          <CheckoutPage
            onNavigate={handleNavigate}
            selectedCartGroupKeys={selectedCartGroupKeys}
            onSelectionChange={setSelectedCartGroupKeys}
            onClearSelection={() => setSelectedCartGroupKeys([])}
          />
        );

      case "orders":
        return (
          <OrdersPage
            onNavigate={handleNavigate}
            onOpenOrderDetail={handleOpenOrderDetail}
          />
        );

      case "admin-dashboard":
        return <AdminDashboardPage />;
      case "admin-orders-seller":
        return (
          <AdminOrdersSellerPage
            onOpenChat={(orderId) => handleOpenChat(orderId)}
            onOpenAdminOrders={() => handleNavigate("admin-orders")}
          />
        );

      case "admin-products":
        return <AdminProductsPage />;
      case "admin-tools":
        return <AdminProductsPage mode="tools" />;
      case "admin-tool-licenses":
        return <AdminToolLicensesPage />;

      case "admin-orders":
        return <AdminOrdersPage />;

      case "admin-users":
        return <AdminUsersPage />;

      case "admin-test":
        return <AdminTest />;
      case "admin-notifications":
        return <AdminNotificationsPage />;
      case "admin-video-courses":
        return <AdminVideoCoursesPage />;
      case "admin-video-courses-promotions":
        return <AdminVideoCoursesPage initialManagementTab="promotions" />;
      case "admin-video-course-detail":
        return adminVideoCourseId && /^\d+$/.test(adminVideoCourseId) ? (
          <AdminVideoCoursesPage
            courseId={Number(adminVideoCourseId)}
            onBack={() => handleNavigate("admin-video-courses")}
          />
        ) : (
          <AdminVideoCoursesPage />
        );

      case "order-detail":
        return orderDetailId ? (
          <OrderDetailPage
            orderId={orderDetailId}
            onBack={() => handleNavigate("orders")}
            onOpenChat={(id) => handleOpenChat(Number(id))}
          />
        ) : (
          <OrdersPage
            onNavigate={handleNavigate}
            onOpenOrderDetail={handleOpenOrderDetail}
          />
        );

      default:
        return (
          <HomePage
            onNavigate={handleNavigate}
            onOpenProductDetail={handleOpenProductDetail}
          />
        );
    }
  };

const showHeaderFooter =
  activePage !== "login" &&
  activePage !== "register" &&
  activePage !== "reset-password";

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <CurrencyProvider>
            <PresenceWatcher />
            <CartCountAuthWatcher />
            <div
              className={`min-h-screen flex flex-col bg-white dark:bg-gray-900 ${
                isAppShell ? "app-shell-root" : ""
              }`}
            >
              <Toaster position="top-right" richColors />

              {showHeaderFooter ? (
                <MainLayout
                  currentPage={activePage}
                  onNavigate={handleNavigate}
                  sidebarOpen={sidebarOpen}
                  setSidebarOpen={setSidebarOpen}
                  mobileSidebarOpen={mobileSidebarOpen}
                  setMobileSidebarOpen={setMobileSidebarOpen}
                  cartCount={cartCount}
                  onOpenChat={handleOpenChat}
                  isAppShell={isAppShell}
                >
                  {renderPage()}
                </MainLayout>
              ) : (
                <div className="flex-1">{renderPage()}</div>
              )}
            </div>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

function PresenceWatcher() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const getLoginDeviceId = () => {
      if (typeof window === "undefined") return null;
      const key = "gstech_login_device_id";
      const existing = window.localStorage.getItem(key);
      if (existing && existing.trim()) return existing;
      const created =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(key, created);
      return created;
    };

    const deviceId = getLoginDeviceId();
    const deviceName =
      typeof navigator !== "undefined" && navigator.userAgent
        ? navigator.userAgent.slice(0, 120)
        : "Web";

    const postStatus = (status: "online" | "offline") => {
      const body = JSON.stringify({ status, deviceId, deviceName });
      if (status === "offline" && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/presence", blob);
        return;
      }

      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: status === "offline",
      }).catch(() => {});
    };

    postStatus("online");
    const interval = window.setInterval(() => postStatus("online"), 60 * 1000);
    const handleBeforeUnload = () => postStatus("offline");
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      postStatus("offline");
    };
  }, [user?.id]);

  return null;
}

function CartCountAuthWatcher() {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("cart:changed"));
  }, [user?.id]);

  return null;
}

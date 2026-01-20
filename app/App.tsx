"use client";
// app/App.tsx
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";

import HomePage from "./pages/homepage/HomePage";
import { AllPage } from "./pages/all-category/AllPage";
import { CoursesPage } from "./pages/courses/CoursesPage";
import { ProgramsPage } from "./pages/programs/ProgramsPage";
import { GamesPage } from "./pages/games/GamesPage";
import { ToolsPage } from "./pages/tools-ai/ToolsPage";
import { BlogPage } from "./pages/video-blog/BlogPage";
import { VideoDetailPage } from "./pages/video-blog/VideoDetailPage";
import { ServicesPage } from "./pages/services/ServicesPage";

import LoginPage from "./auth/login/LoginPage";
import { RegisterPage } from "./auth/register/RegisterPage";
import ForgotPassword from "./auth/forgot-password/ForgotPassword";
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
import AdminProductsPage from "./admin-pages/products/AdminProductsPage";
import AdminOrdersPage from "./admin-pages/orders/AdminOrdersPage";
import AdminUsersPage from "./admin-pages/users/AdminUsersPage";
import AdminTest from "./admin-pages/admin-test/AdminTest";

import ProductDetailPage from "./pages/product-detail/ProductDetailPage";
import { ChatPage } from "./pages/chat/ChatPage";
import { ChatConversationPage } from "./pages/chat/ChatConversationPage";

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
  | "product-detail"
  | "blog"
  | "services"
  | "profile"
  | "account"
  | "login"
  | "register"
  | "forgot-password"
  | "cart"
  | "checkout"
  | "orders"
  | "order-detail"
  | "admin-dashboard"
  | "admin-products"
  | "admin-orders"
  | "admin-users"
  | "admin-test";

type RouteState = {
  page: AppPage;
  productSlug: string | null;
  orderId: string | null;
  videoId: string | null;
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
  "services",
  "profile",
  "account",
  "login",
  "register",
  "forgot-password",
  "cart",
  "checkout",
  "orders",
  "order-detail",
  "admin-dashboard",
  "admin-products",
  "admin-orders",
  "admin-users",
  "admin-test",
];

const STATIC_ROUTES: Record<string, AppPage> = {
  "/": "home",
  "/courses": "courses",
  "/programs": "programs",
  "/games": "games",
  "/tools": "tools",
  "/all": "all",
  "/chat": "chat",
  "/video-blog": "blog",
  "/blog": "blog",
  "/services": "services",
  "/profile": "profile",
  "/account": "account",
  "/login": "login",
  "/register": "register",
  "/forgot-password": "forgot-password",
  "/cart": "cart",
  "/checkout": "checkout",
  "/orders": "orders",
  "/admin/dashboard": "admin-dashboard",
  "/admin/products": "admin-products",
  "/admin/orders": "admin-orders",
  "/admin/users": "admin-users",
  "/admin/test": "admin-test",
};

function normalizePath(pathname?: string | null): string {
  if (!pathname || pathname === "") return "/";
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }
  return pathname;
}

function resolveRoute(pathname?: string | null): RouteState {
  const normalized = normalizePath(pathname);
  const staticPage = STATIC_ROUTES[normalized];
  if (staticPage) {
    return { page: staticPage, productSlug: null, orderId: null, videoId: null };
  }

  const segments = normalized.split("/").filter(Boolean);

  if (
    segments.length >= 2 &&
    (segments[0] === "blog" ||
      segments[0] === "video" ||
      segments[0] === "video-blog")
  ) {
    return {
      page: "video-detail",
      productSlug: null,
      orderId: null,
      videoId: decodeURIComponent(segments[1]),
    };
  }

  if (segments.length >= 2 && segments[0] === "product") {
    return {
      page: "product-detail",
      productSlug: decodeURIComponent(segments[1]),
      orderId: null,
      videoId: null,
    };
  }

  if (segments.length >= 2 && segments[0] === "orders") {
    return {
      page: "order-detail",
      productSlug: null,
      orderId: decodeURIComponent(segments[1]),
      videoId: null,
    };
  }

  if (segments.length >= 2 && segments[0] === "chat") {
    return {
      page: "chat-detail",
      productSlug: null,
      orderId: decodeURIComponent(segments[1]),
      videoId: null,
    };
  }

  return { page: "home", productSlug: null, orderId: null, videoId: null };
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
  }
): string {
  switch (page) {
    case "home":
      return "/";
    case "courses":
      return "/courses";
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
      return ctx?.videoId ? `/blog/${encodeURIComponent(String(ctx.videoId))}` : "/blog";
    case "blog":
      return "/blog";
    case "services":
      return "/services";
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
    case "cart":
      return "/cart";
    case "checkout":
      return "/checkout";
    case "orders":
      return "/orders";
    case "admin-dashboard":
      return "/admin/dashboard";
    case "admin-products":
      return "/admin/products";
    case "admin-orders":
      return "/admin/orders";
    case "admin-users":
      return "/admin/users";
    case "admin-test":
      return "/admin/test";
    case "product-detail":
      return ctx?.productSlug ? `/product/${encodeURIComponent(ctx.productSlug)}` : "/all";
    case "order-detail":
      return ctx?.orderId
        ? `/orders/${encodeURIComponent(String(ctx.orderId))}`
        : "/orders";
    default:
      return "/";
  }
}

type CartApiItem = { qty: number };

export default function App() {
  const initialPath = usePathname() ?? "/";
  const [routeState, setRouteState] = useState<RouteState>(() => resolveRoute(initialPath));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = resolveRoute(window.location.pathname);
    window.history.replaceState(initial, "", window.location.pathname + window.location.search);
    setRouteState(initial);

    const handlePop = (event: PopStateEvent) => {
      event.stopImmediatePropagation();
      const next =
        (event.state && typeof event.state === "object" && "page" in event.state
          ? (event.state as RouteState)
          : resolveRoute(window.location.pathname));
      setRouteState(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const activePage = routeState.page;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedCartItemId, setSelectedCartItemId] = useState<number | null>(null);

  /* ================= CART COUNT ================= */
  const [cartCount, setCartCount] = useState<number>(0);

  const refreshCartCount = async () => {
    try {
      const res = await fetch("/api/cart", { method: "GET" });

      if (!res.ok) {
        setCartCount(0);
        return;
      }

      const data = (await res.json()) as { items?: CartApiItem[] };

      const items = Array.isArray(data.items) ? data.items : [];

      // ✅ total qty (1+2+3 = 6)
      const totalQty = items.reduce((sum, it) => sum + Number(it.qty ?? 0), 0);

      setCartCount(totalQty);
    } catch {
      // keep old cartCount (or set 0 if you want)
    }
  };

  // load once (and whenever you come back to app)
  useEffect(() => {
    refreshCartCount();
  }, []);

  const navigateInternal = (next: RouteState) => {
    if (typeof window !== "undefined") {
      const target = buildPathForPage(next.page, {
        productSlug: next.productSlug ?? undefined,
        orderId: next.orderId ?? undefined,
        videoId: next.videoId ?? undefined,
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
    });
  };

  const handleOpenProductDetail = (slug: string) => {
    navigateInternal({
      page: "product-detail",
      productSlug: slug,
      orderId: null,
      videoId: null,
    });
  };

  const handleOpenVideoDetail = (slug: string) => {
    navigateInternal({
      page: "video-detail",
      productSlug: null,
      orderId: null,
      videoId: slug,
    });
  };

  const handleOpenChat = (orderId: number) => {
    navigateInternal({
      page: "chat-detail",
      orderId: String(orderId),
      productSlug: null,
      videoId: null,
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

  const chatDetailOrderId = useMemo(() => {
    if (routeState.page !== "chat-detail") return null;
    return routeState.orderId ?? null;
  }, [routeState.orderId, routeState.page]);

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
        return <CoursesPage onOpenProductDetail={handleOpenProductDetail} />;

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
            // ✅ allow detail page to refresh cart badge after add
            onCartChanged={refreshCartCount}
          />
        ) : (
          <AllPage onOpenProductDetail={handleOpenProductDetail} />
        );

      case "blog":
        return (
          <BlogPage
            onNavigate={handleNavigate}
            onOpenVideoDetail={handleOpenVideoDetail}
          />
        );

      case "video-detail":
        return videoDetailSlug ? (
          <VideoDetailPage
            slug={videoDetailSlug}
            onNavigate={handleNavigate}
            onBack={() => handleNavigate("blog")}
          />
        ) : (
          <BlogPage
            onNavigate={handleNavigate}
            onOpenVideoDetail={handleOpenVideoDetail}
          />
        );

      case "services":
        return <ServicesPage onNavigate={handleNavigate} />;

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
          />
        );

      case "login":
        return <LoginPage onNavigate={handleNavigate} />;

      case "register":
        return <RegisterPage onNavigate={handleNavigate} />;

      case "forgot-password":
        return <ForgotPassword onNavigate={handleNavigate} />;

      case "cart":
        return (
          <CartPage
            onNavigate={handleNavigate}
            selectedCartItemId={selectedCartItemId}
            onSelectCartItem={setSelectedCartItemId}
          />
        );

      case "checkout":
        return (
          <CheckoutPage
            onNavigate={handleNavigate}
            selectedCartItemId={selectedCartItemId}
            onClearSelection={() => setSelectedCartItemId(null)}
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

      case "admin-products":
        return <AdminProductsPage />;

      case "admin-orders":
        return <AdminOrdersPage />;

      case "admin-users":
        return <AdminUsersPage />;

      case "admin-test":
        return <AdminTest />;

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
  activePage !== "register";

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <CurrencyProvider>
            <PresenceWatcher />
            <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
              <Toaster position="top-right" richColors />

              {showHeaderFooter ? (
                <>
                  <Header
                    onNavigate={handleNavigate}
                    currentPage={activePage}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    mobileSidebarOpen={mobileSidebarOpen}
                    setMobileSidebarOpen={setMobileSidebarOpen}
                    cartCount={cartCount} // ✅ dynamic count
                    onOpenChat={handleOpenChat}
                  />

                  <main id="main_container" className="flex flex-1 min-h-0">
                    <div className="sidebar">
                      <Sidebar
                        isOpen={sidebarOpen}
                        onNavigate={handleNavigate}
                        isMobile={false}
                      />
                    </div>

                    <Sidebar
                      isOpen={mobileSidebarOpen}
                      onNavigate={handleNavigate}
                      onClose={() => setMobileSidebarOpen(false)}
                      isMobile={true}
                    />

                    <div className="content_area flex-1 min-w-0">
                      {renderPage()}
                    </div>
                  </main>

                  <Footer />
                </>
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

    const postStatus = (status: "online" | "offline") => {
      const body = JSON.stringify({ status });
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

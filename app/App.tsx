// app/App.tsx
import { useEffect, useState } from "react";
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
import { AuthProvider } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";

import AdminDashboardPage from "./admin-pages/dashboard/AdminDashboardPage";
import AdminProductsPage from "./admin-pages/products/AdminProductsPage";
import AdminOrdersPage from "./admin-pages/orders/AdminOrdersPage";
import AdminUsersPage from "./admin-pages/users/AdminUsersPage";
import AdminTest from "./admin-pages/admin-test/AdminTest";

import ProductDetailPage from "./pages/product-detail/ProductDetailPage";

type CartApiItem = { qty: number };

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(
    null
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // optional: refresh when open cart/checkout/orders
    if (page === "cart" || page === "checkout") {
      refreshCartCount();
    }
  };

  const handleOpenOrderDetail = (orderId: number) => {
    setSelectedOrderId(orderId);
    setCurrentPage("order-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenProductDetail = (slug: string) => {
    setSelectedProductSlug(slug);
    setCurrentPage("product-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPage = () => {
    switch (currentPage) {
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
        return selectedProductSlug ? (
          <ProductDetailPage
            slug={selectedProductSlug}
            onBack={() => handleNavigate("all")}
            // ✅ allow detail page to refresh cart badge after add
            onCartChanged={refreshCartCount}
          />
        ) : (
          <AllPage onOpenProductDetail={handleOpenProductDetail} />
        );

      case "blog":
        return <BlogPage onNavigate={handleNavigate} />;

      case "services":
        return <ServicesPage onNavigate={handleNavigate} />;

      case "profile":
      case "account":
        return <ProfilePage onNavigate={handleNavigate} />;

      case "login":
        return <LoginPage onNavigate={handleNavigate} />;

      case "register":
        return <RegisterPage onNavigate={handleNavigate} />;

      case "forgot-password":
        return <ForgotPassword onNavigate={handleNavigate} />;

      case "cart":
        return <CartPage onNavigate={handleNavigate} />;

      case "checkout":
        return <CheckoutPage onNavigate={handleNavigate} />;

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
        return selectedOrderId ? (
          <OrderDetailPage
            orderId={selectedOrderId}
            onBack={() => handleNavigate("orders")}
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

  const showHeaderFooter = currentPage !== "login" && currentPage !== "register";

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <CurrencyProvider>
            <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
              <Toaster position="top-right" richColors />

              {showHeaderFooter && (
                <Header
                  onNavigate={handleNavigate}
                  currentPage={currentPage}
                  sidebarOpen={sidebarOpen}
                  setSidebarOpen={setSidebarOpen}
                  mobileSidebarOpen={mobileSidebarOpen}
                  setMobileSidebarOpen={setMobileSidebarOpen}
                  cartCount={cartCount} // ✅ dynamic count
                />
              )}

              <div className="flex flex-1">
                {showHeaderFooter && (
                  <Sidebar
                    isOpen={sidebarOpen}
                    onNavigate={handleNavigate}
                    isMobile={false}
                  />
                )}

                {showHeaderFooter && (
                  <Sidebar
                    isOpen={mobileSidebarOpen}
                    onNavigate={handleNavigate}
                    onClose={() => setMobileSidebarOpen(false)}
                    isMobile={true}
                  />
                )}

                <main className="flex-1">{renderPage()}</main>
              </div>

              {showHeaderFooter && <Footer />}
            </div>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

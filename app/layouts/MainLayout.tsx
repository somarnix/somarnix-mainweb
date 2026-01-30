"use client";

import type { ReactNode } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { Footer } from "../components/Footer";

type MainLayoutProps = {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (value: boolean) => void;
  cartCount: number;
  onOpenChat: (orderId: number) => void;
};

export function MainLayout({
  children,
  currentPage,
  onNavigate,
  sidebarOpen,
  setSidebarOpen,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  cartCount,
  onOpenChat,
}: MainLayoutProps) {
  return (
    <>
      <Header
        onNavigate={onNavigate}
        currentPage={currentPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        cartCount={cartCount}
        onOpenChat={onOpenChat}
      />

      <main id="main_container" className="flex flex-1 min-h-0">
        <div className="sidebar">
          <Sidebar isOpen={sidebarOpen} onNavigate={onNavigate} isMobile={false} />
        </div>

        <Sidebar
          isOpen={mobileSidebarOpen}
          onNavigate={onNavigate}
          onClose={() => setMobileSidebarOpen(false)}
          isMobile={true}
        />

        <div className="content_area flex-1 min-w-0">{children}</div>
      </main>

      <Footer />
    </>
  );
}

"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Sidebar } from "../components/Sidebar";
import { Footer } from "../components/Footer";

const Header = dynamic(
  () => import("../components/Header").then((mod) => mod.Header),
  { ssr: false }
);

const subscribe = () => () => {};

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
  isAppShell: boolean;
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
  isAppShell,
}: MainLayoutProps) {
  const footerMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

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
        isAppShell={isAppShell}
      />

      <main
        id="main_container"
        className={`flex flex-1 min-h-0 ${isAppShell ? "bg-slate-50 dark:bg-slate-950" : ""}`}
      >
        <div className="sidebar">
          <Sidebar
            isOpen={sidebarOpen}
            onNavigate={onNavigate}
            isMobile={false}
            isAppShell={isAppShell}
          />
        </div>

        <Sidebar
          isOpen={mobileSidebarOpen}
          onNavigate={onNavigate}
          onClose={() => setMobileSidebarOpen(false)}
          isMobile={true}
          isAppShell={isAppShell}
        />

        <div className="content_area flex-1 min-w-0">{children}</div>
      </main>

      {footerMounted ? <Footer isAppShell={isAppShell} /> : null}
    </>
  );
}

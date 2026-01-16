// app\admin-pages\layout.tsx
"use client";

import { Sidebar } from "@/app/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={true} onNavigate={() => {}} />
      <main className="flex-1 p-6 bg-gray-50">
        {children}
      </main>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { AuthBrand } from "../AuthBrand";
import { AuthPageControls } from "../AuthPageControls";

export default function AuthCenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <AuthPageControls />
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <div className="mb-6 text-center">
            <AuthBrand />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

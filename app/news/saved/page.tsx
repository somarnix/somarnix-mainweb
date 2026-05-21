import type { Metadata } from "next";

import { AuthProvider } from "@/app/contexts/AuthContext";
import { LanguageProvider } from "@/app/contexts/LanguageContext";
import { buildMetadata } from "@/app/lib/buildMetadata";
import { SavedNewsPage as SavedNewsPageView } from "@/app/pages/news/SavedNewsPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Saved News",
  description: "View your saved SOMARNIX news stories.",
  path: "/news/saved",
});

export default function SavedNewsPage() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SavedNewsPageView />
      </AuthProvider>
    </LanguageProvider>
  );
}

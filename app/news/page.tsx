import type { Metadata } from "next";

import { AuthProvider } from "@/app/contexts/AuthContext";
import { LanguageProvider } from "@/app/contexts/LanguageContext";
import { buildMetadata } from "@/app/lib/buildMetadata";
import { NewsPage as NewsPageView } from "@/app/pages/news/NewsPage";
import { listPublishedCmsPosts } from "@/lib/cms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "News",
  description: "Read the latest SOMARNIX news, CMS posts, updates, guides, and announcements.",
  path: "/news",
});

export default async function NewsPage() {
  const posts = await listPublishedCmsPosts(60);
  return (
    <LanguageProvider>
      <AuthProvider>
        <NewsPageView posts={posts} />
      </AuthProvider>
    </LanguageProvider>
  );
}

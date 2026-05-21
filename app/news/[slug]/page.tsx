import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsContentView } from "@/app/components/public/CmsContentView";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { LanguageProvider } from "@/app/contexts/LanguageContext";
import { buildMetadata } from "@/app/lib/buildMetadata";
import { SavedNewsPage as SavedNewsPageView } from "@/app/pages/news/SavedNewsPage";
import {
  getPublishedCmsEntry,
  listPublishedCmsPosts,
  type CmsEntry,
} from "@/lib/cms";

export const dynamic = "force-dynamic";

async function getNewsEntry(slug: string): Promise<CmsEntry | null> {
  return (
    (await getPublishedCmsEntry("post", slug)) ||
    (await getPublishedCmsEntry("short", slug)) ||
    (await getPublishedCmsEntry("page", slug))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "saved") {
    return buildMetadata({
      title: "Saved News",
      description: "View your saved SOMARNIX news stories.",
      path: "/news/saved",
    });
  }

  const entry = await getNewsEntry(slug);
  if (!entry) return {};

  return buildMetadata({
    title: entry.seoTitle || entry.title,
    description: entry.seoDescription || entry.excerpt || undefined,
    path: `/news/${entry.slug}`,
  });
}

export default async function NewsCmsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "saved") {
    return (
      <LanguageProvider>
        <AuthProvider>
          <SavedNewsPageView />
        </AuthProvider>
      </LanguageProvider>
    );
  }

  const entry = await getNewsEntry(slug);
  if (!entry) notFound();
  const relatedEntries = await listPublishedCmsPosts(12);

  return (
    <LanguageProvider>
      <AuthProvider>
        <CmsContentView entry={entry} relatedEntries={relatedEntries} />
      </AuthProvider>
    </LanguageProvider>
  );
}

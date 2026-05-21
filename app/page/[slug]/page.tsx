import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsContentView } from "@/app/components/public/CmsContentView";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { LanguageProvider } from "@/app/contexts/LanguageContext";
import { buildMetadata } from "@/app/lib/buildMetadata";
import { getPublishedCmsEntry } from "@/lib/cms";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getPublishedCmsEntry("page", slug);
  if (!entry) return {};
  return buildMetadata({
    title: entry.seoTitle || entry.title,
    description: entry.seoDescription || entry.excerpt || undefined,
    path: `/page/${entry.slug}`,
  });
}

export default async function CmsPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getPublishedCmsEntry("page", slug);
  if (!entry) notFound();
  return (
    <LanguageProvider>
      <AuthProvider>
        <CmsContentView entry={entry} />
      </AuthProvider>
    </LanguageProvider>
  );
}

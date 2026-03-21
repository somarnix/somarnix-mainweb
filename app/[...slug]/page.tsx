import App from "../App";
import type { Metadata } from "next";

import { resolveDynamicShareMetadata } from "../lib/dynamicShareMetadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug = [] } = await params;
  return (await resolveDynamicShareMetadata(slug)) ?? {};
}

export default function CatchAllPage() {
  return <App />;
}

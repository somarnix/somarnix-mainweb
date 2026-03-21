import type { Metadata } from "next";

import App from "../../App";
import { resolveDynamicShareMetadata } from "../../lib/dynamicShareMetadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return (await resolveDynamicShareMetadata(["product", slug])) ?? {};
}

export default function ProductDetailCatchRoute() {
  return <App />;
}

import Link from "next/link";

import { ContentPageShell } from "../components/public/ContentPageShell";
import { buildMetadata } from "../lib/buildMetadata";

export const metadata = buildMetadata({
  title: "About",
  description:
    "Learn what SOMARNIX offers across digital products, AI tools, courses, and customer support.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <ContentPageShell
      title="About SOMARNIX"
      description="SOMARNIX brings together digital products, learning resources, AI tools, and support workflows in one place so users can discover, buy, learn, and get help without switching platforms."
    >
      <div className="space-y-8 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What We Offer</h2>
            <p className="mt-2">
              SOMARNIX combines marketplace listings, AI tools, and video learning so users can access products and training from one account.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">How We Support Users</h2>
            <p className="mt-2">
              Orders, chat, payment follow-up, and support are integrated into the platform to make purchase and delivery issues easier to resolve.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">How To Reach Us</h2>
            <p className="mt-2">
              Use the support center or contact page for payment, access, account, and business inquiries.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Platform Focus</h2>
          <p className="mt-3">
            The current platform focuses on digital commerce, course delivery, AI-assisted tools, and post-purchase support. The goal is to make buying, learning, and communicating with support feel connected instead of fragmented.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">What To Expect</h2>
          <ul className="mt-3 space-y-2">
            <li>Digital products, courses, and tools are managed from one account.</li>
            <li>Order and support conversations stay attached to the related purchase flow.</li>
            <li>Policy, support, and legal pages are available from the footer on every public page.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Need Help Or Have A Business Question?</h2>
          <p className="mt-2">
            For support, policy questions, partnerships, or instructor-related requests, start from the contact page or support center.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Contact Us
            </Link>
            <Link
              href="/support"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Open Support Center
            </Link>
          </div>
        </section>
      </div>
    </ContentPageShell>
  );
}

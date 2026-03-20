import Link from "next/link";

import { ContentPageShell } from "./components/public/ContentPageShell";

export default function NotFound() {
  return (
    <ContentPageShell
      title="Page Not Found"
      description="The page you requested is not available. Use the links below to return to the main website sections."
    >
      <div className="space-y-5 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        <p>The URL may be outdated, incomplete, or no longer available.</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Go Home
          </Link>
          <Link
            href="/courses"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Browse Courses
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </ContentPageShell>
  );
}

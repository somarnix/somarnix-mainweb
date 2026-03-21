"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ContentPageShell } from "./components/public/ContentPageShell";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ContentPageShell
      title="Something Went Wrong"
      description="A page error interrupted the request. You can retry the action or return to a stable area of the website."
    >
      <div className="space-y-5 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        <p>
          The request could not be completed successfully. Try again, or return to the homepage and continue from there.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Go Home
          </Link>
        </div>
      </div>
    </ContentPageShell>
  );
}

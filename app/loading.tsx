export default function Loading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-8 w-56 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 h-4 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="mt-2 h-4 w-3/4 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="mt-6 animate-pulse rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-4 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-4 w-5/6 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-4 w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </main>
  );
}

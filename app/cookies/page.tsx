import { ContentPageShell } from "../components/public/ContentPageShell";
import { buildMetadata } from "../lib/buildMetadata";
import { POLICY_LAST_UPDATED } from "../lib/siteConfig";

export const metadata = buildMetadata({
  title: "Cookie Policy",
  description:
    "Read how SOMARNIX uses cookies and similar storage for sessions, preferences, and operational functionality.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <ContentPageShell
      title="Cookie Policy"
      description={`Last updated ${POLICY_LAST_UPDATED}. SOMARNIX uses cookies and similar browser storage for essential session behavior, preferences, and service operation.`}
    >
      <div className="space-y-6 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Essential Cookies</h2>
          <p className="mt-2">
            Essential cookies and storage are used to keep users signed in, maintain interface preferences, and support core platform behavior.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Preference Storage</h2>
          <p className="mt-2">
            Browser storage may be used for language, theme, and other account-related convenience settings so the experience stays consistent across visits.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Service Operation</h2>
          <p className="mt-2">
            Additional storage may be used for support flows, order workflows, and installed app behavior where technically required.
          </p>
        </section>
      </div>
    </ContentPageShell>
  );
}

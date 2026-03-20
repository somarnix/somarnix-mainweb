import { ContentPageShell } from "../components/public/ContentPageShell";
import { buildMetadata } from "../lib/buildMetadata";
import { POLICY_LAST_UPDATED, SUPPORT_EMAIL } from "../lib/siteConfig";

export const metadata = buildMetadata({
  title: "Terms of Use",
  description:
    "Read the GSTECHKH terms covering account use, digital products, support expectations, and prohibited activity.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <ContentPageShell
      title="Terms of Use"
      description={`Last updated ${POLICY_LAST_UPDATED}. These terms summarize the expected rules for using GSTECHKH, buying digital products, and accessing support services.`}
    >
      <div className="space-y-6 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Acceptable Use</h2>
          <p className="mt-2">
            Users must not abuse the platform, attempt to bypass access controls, scrape private data, or use automated activity that harms service performance.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Accounts And Orders</h2>
          <p className="mt-2">
            Users are responsible for maintaining accurate account information and reviewing their order details before payment or subscription activation.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Digital Access</h2>
          <p className="mt-2">
            Access to digital products, tools, and courses depends on the order status, selected plan, and platform rules connected to that purchase.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Questions</h2>
          <p className="mt-2">
            Terms and legal questions can be sent to <a className="font-medium text-sky-600 dark:text-sky-400" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </section>
      </div>
    </ContentPageShell>
  );
}

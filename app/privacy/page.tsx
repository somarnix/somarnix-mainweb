import { ContentPageShell } from "../components/public/ContentPageShell";
import { buildMetadata } from "../lib/buildMetadata";
import { POLICY_LAST_UPDATED, SUPPORT_EMAIL } from "../lib/siteConfig";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Read the SOMARNIX privacy policy covering account data, order data, support communications, and operational analytics.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <ContentPageShell
      title="Privacy Policy"
      description={`Last updated ${POLICY_LAST_UPDATED}. This page explains what information SOMARNIX collects, why it is used, and how users can contact the team about privacy-related questions.`}
    >
      <div className="space-y-6 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Information We Use</h2>
          <p className="mt-2">
            SOMARNIX processes account details, order records, payment-related status data, course access data, and support conversation content to operate the platform.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Why We Use It</h2>
          <p className="mt-2">
            Information is used to authenticate users, fulfill orders, provide course access, support customer service, detect abuse, and maintain service quality.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Support And Communication Records</h2>
          <p className="mt-2">
            Messages sent through order chat, support workflows, and operational notifications may be retained to review payment issues, delivery problems, and account support requests.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">User Requests</h2>
          <p className="mt-2">
            If you have a privacy question or need help with account data, contact <a className="font-medium text-sky-600 dark:text-sky-400" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </section>
      </div>
    </ContentPageShell>
  );
}

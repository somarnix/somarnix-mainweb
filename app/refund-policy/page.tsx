import { ContentPageShell } from "../components/public/ContentPageShell";
import { buildMetadata } from "../lib/buildMetadata";
import { POLICY_LAST_UPDATED, SUPPORT_EMAIL } from "../lib/siteConfig";

export const metadata = buildMetadata({
  title: "Refund Policy",
  description:
    "Read SOMARNIX guidance for refund and billing review requests for digital products, tools, and course access.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <ContentPageShell
      title="Refund Policy"
      description={`Last updated ${POLICY_LAST_UPDATED}. SOMARNIX sells digital products and access-based services, so refund requests are reviewed carefully based on order status and delivery state.`}
    >
      <div className="space-y-6 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Digital Goods And Access</h2>
          <p className="mt-2">
            Because SOMARNIX provides digital products, AI tools, and course access, refund eligibility may be limited after delivery, activation, or visible access has already been provided.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Request Review</h2>
          <p className="mt-2">
            If you believe there was a billing issue, duplicate payment, failed delivery, or access problem, contact support with your order number, payment detail, and a short explanation of the issue.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">How To Contact The Team</h2>
          <p className="mt-2">
            Send refund and billing review requests to <a className="font-medium text-sky-600 dark:text-sky-400" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or use the support workflow linked from your order.
          </p>
        </section>
      </div>
    </ContentPageShell>
  );
}

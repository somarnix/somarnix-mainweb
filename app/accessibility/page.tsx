import { ContentPageShell } from "../components/public/ContentPageShell";
import { buildMetadata } from "../lib/buildMetadata";
import { POLICY_LAST_UPDATED, SUPPORT_EMAIL } from "../lib/siteConfig";

export const metadata = buildMetadata({
  title: "Accessibility",
  description:
    "Read the SOMARNIX accessibility commitment and how to report issues that block access to the website or app experience.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <ContentPageShell
      title="Accessibility"
      description={`Last updated ${POLICY_LAST_UPDATED}. SOMARNIX is working to keep core navigation, account access, support, and order flows available across devices and assistive scenarios.`}
    >
      <div className="space-y-6 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Accessibility Commitment</h2>
          <p className="mt-2">
            The platform aims to keep primary website functions usable on modern desktop and mobile browsers, including account access, navigation, orders, and support pages.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Known Gaps</h2>
          <p className="mt-2">
            Some older interfaces and highly interactive screens may still need further polish. Feedback is welcome when accessibility issues block a task.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Report An Issue</h2>
          <p className="mt-2">
            If you encounter an accessibility problem, email <a className="font-medium text-sky-600 dark:text-sky-400" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the page URL, device, browser, and a short description of what happened.
          </p>
        </section>
      </div>
    </ContentPageShell>
  );
}

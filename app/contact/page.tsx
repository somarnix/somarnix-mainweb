import { LifeBuoy, Mail, MessageSquare } from "lucide-react";

import { ContentPageShell } from "../components/public/ContentPageShell";
import { buildMetadata } from "../lib/buildMetadata";
import { SUPPORT_EMAIL } from "../lib/siteConfig";

export const metadata = buildMetadata({
  title: "Contact",
  description:
    "Reach GSTECHKH support for orders, account access, business inquiries, partnerships, and instructor requests.",
  path: "/contact",
});

const telegramSupportUrl = process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_URL || "/support";

export default function ContactPage() {
  return (
    <ContentPageShell
      title="Contact GSTECHKH"
      description="Use the right channel for support, billing questions, partnerships, careers, or instructor-related requests."
    >
      <div className="space-y-8 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        <section className="grid gap-4 md:grid-cols-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          >
            <Mail className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Email Support</h2>
            <p className="mt-2">{SUPPORT_EMAIL}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Best for account, billing, policy, and copyright questions.
            </p>
          </a>

          <a
            href={telegramSupportUrl}
            target={telegramSupportUrl.startsWith("http") ? "_blank" : undefined}
            rel={telegramSupportUrl.startsWith("http") ? "noreferrer" : undefined}
            className="rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          >
            <MessageSquare className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Telegram Support</h2>
            <p className="mt-2">Open the support bot for fast order and payment follow-up.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Best for active order questions or quick escalation.
            </p>
          </a>
        </section>

        <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Before You Contact Support</h2>
          </div>
          <ul className="mt-3 space-y-2">
            <li>Include your order number if the issue is related to a purchase.</li>
            <li>Include product, course, or tool name when possible.</li>
            <li>Add screenshots or a short screen recording for technical issues.</li>
            <li>Use the same email address that you used on your GSTECHKH account.</li>
          </ul>
        </section>

        <section id="instructor" className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Instructor Requests</h2>
          <p className="mt-3">
            If you want to publish courses, teach through the platform, or discuss educational content opportunities, contact the team by email with your experience, topic area, and sample material.
          </p>
        </section>

        <section id="partnerships" className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Partnerships</h2>
          <p className="mt-3">
            Partnership discussions, business inquiries, and integration proposals should be sent by email with a short overview of the company, collaboration idea, and expected scope.
          </p>
        </section>

        <section id="careers" className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Careers</h2>
          <p className="mt-3">
            Career-related inquiries can be sent to the same support email until a dedicated careers inbox or jobs portal is published.
          </p>
        </section>
      </div>
    </ContentPageShell>
  );
}

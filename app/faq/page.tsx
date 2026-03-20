import Link from "next/link";

import { ContentPageShell } from "../components/public/ContentPageShell";
import { buildMetadata } from "../lib/buildMetadata";

export const metadata = buildMetadata({
  title: "FAQ",
  description:
    "Read common GSTECHKH questions about buying, orders, course access, and support.",
  path: "/faq",
});

const FAQ_ITEMS = [
  {
    question: "How do I buy a product or tool?",
    answer:
      "Open the product page, review the available plan or option, add it to checkout, and complete payment from the order flow.",
  },
  {
    question: "Where can I check my order status?",
    answer:
      "Open the Orders section from your account or sidebar. Each order includes its current state, payment progress, and related conversation history.",
  },
  {
    question: "How do I access a purchased video course?",
    answer:
      "After your course order is approved or activated, open the Courses area and enter the purchased course from your account.",
  },
  {
    question: "What should I do if payment is pending?",
    answer:
      "Keep your order number and use support chat or Telegram support so the team can review the payment and order status.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Use the support center for common answers or go to the contact page for email and Telegram support options.",
  },
  {
    question: "Can I ask about partnerships or instructor opportunities?",
    answer:
      "Yes. Use the contact page and include a short explanation of your request so the team can route it correctly.",
  },
];

export default function FaqPage() {
  return (
    <ContentPageShell
      title="Frequently Asked Questions"
      description="Quick answers to common questions about products, courses, orders, and support."
    >
      <div className="space-y-4">
        {FAQ_ITEMS.map((item) => (
          <section
            key={item.question}
            className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {item.question}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              {item.answer}
            </p>
          </section>
        ))}

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Need More Help?
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            If the answer is not here, open the support center or contact the team directly.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/support"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Open Support Center
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Contact Support
            </Link>
          </div>
        </section>
      </div>
    </ContentPageShell>
  );
}

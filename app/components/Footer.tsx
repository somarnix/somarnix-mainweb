"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  Globe,
  LifeBuoy,
  Mail,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { SITE_NAME, SUPPORT_EMAIL } from "../lib/siteConfig";

interface FooterProps {
  isAppShell?: boolean;
}

export function Footer({ isAppShell = false }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const telegramSupportUrl = process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_URL || "/support";

  if (isAppShell) {
    return null;
  }

  const quickLinks = [
    { label: t("footer.aboutUs"), href: "/about" },
    { label: t("footer.allCourses"), href: "/courses" },
    { label: t("footer.becomeInstructor"), href: "/contact#instructor" },
    { label: t("footer.partnerships"), href: "/contact#partnerships" },
    { label: t("footer.careers"), href: "/contact#careers" },
    { label: t("footer.blog"), href: "/blog" },
  ];

  const supportLinks = [
    { label: t("footer.helpCenter"), href: "/support" },
    { label: t("footer.faqs"), href: "/faq" },
    { label: t("footer.terms"), href: "/terms" },
    { label: t("footer.privacy"), href: "/privacy" },
    { label: t("footer.cookies"), href: "/cookies" },
    { label: t("footer.accessibility"), href: "/accessibility" },
  ];

  const socialLinks = [
    {
      icon: MessageSquare,
      color: "hover:text-sky-400",
      href: telegramSupportUrl,
      label: "Telegram Support",
      external: telegramSupportUrl.startsWith("http"),
    },
    {
      icon: Mail,
      color: "hover:text-blue-400",
      href: `mailto:${SUPPORT_EMAIL}`,
      label: "Email Support",
      external: false,
    },
    {
      icon: ShieldCheck,
      color: "hover:text-emerald-400",
      href: "/copyright",
      label: "Copyright Notice",
      external: false,
    },
  ];

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = newsletterEmail.trim()
      ? `Please subscribe this email to ${SITE_NAME} updates:\n\n${newsletterEmail.trim()}`
      : `Please subscribe me to ${SITE_NAME} updates.`;

    const href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Newsletter Subscription")}&body=${encodeURIComponent(message)}`;
    window.location.href = href;
  };

  return (
    <footer className="relative overflow-hidden border-t border-gray-200 dark:border-slate-800 bg-gradient-to-br from-blue-50 via-purple-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-600 dark:text-slate-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.12),_transparent_45%),radial-gradient(ellipse_at_top_right,_rgba(147,51,234,0.08),_transparent_42%)] dark:bg-[radial-gradient(ellipse_at_top_left,_rgba(14,165,233,0.14),_transparent_45%),radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.12),_transparent_42%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <img
                src="/khqr-assets/somarnix-logo.png"
                alt="SOMARNIX"
                className="h-11 w-11 rounded-xl object-contain shadow-lg shadow-blue-900/20 dark:shadow-blue-900/40"
              />
              <div>
                <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  SOMARNIX
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                  Learn Faster
                </p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-6 text-gray-500 dark:text-slate-400">
              {t("footer.description")}
            </p>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                  aria-label={item.label}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/70 text-gray-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-slate-500 ${item.color}`}
                >
                  <item.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-900 dark:text-white">
              {t("footer.quickLinks")}
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 transition-colors hover:text-sky-600 dark:hover:text-sky-300"
                  >
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-900 dark:text-white">
              {t("footer.support")}
            </h3>
            <ul className="space-y-2.5">
              {supportLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-500 dark:text-slate-400 transition-colors hover:text-sky-600 dark:hover:text-sky-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/80 p-5 shadow-lg shadow-black/5 dark:shadow-black/20 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-gray-900 dark:text-white">
                {t("footer.newsletter")}
              </h3>
              <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
                {t("footer.newsletterDesc")}
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <Input
                  type="email"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder={t("footer.emailPlaceholder")}
                  className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
                >
                  {t("footer.subscribe")}
                </Button>
              </form>
              <div className="mt-5 space-y-2.5 border-t border-gray-200 dark:border-slate-800 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="transition-colors hover:text-sky-600 dark:hover:text-sky-300"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <MessageSquare className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <a
                    href={telegramSupportUrl}
                    target={telegramSupportUrl.startsWith("http") ? "_blank" : undefined}
                    rel={telegramSupportUrl.startsWith("http") ? "noreferrer" : undefined}
                    className="transition-colors hover:text-sky-600 dark:hover:text-sky-300"
                  >
                    Telegram Support
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <LifeBuoy className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <Link
                    href="/support"
                    className="transition-colors hover:text-sky-600 dark:hover:text-sky-300"
                  >
                    Support Center
                  </Link>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <Globe className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span>{SITE_NAME}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-gray-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:flex-row lg:px-8">
          <div className="text-center sm:text-left">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              &copy; {currentYear} {SITE_NAME}. {t("footer.rights")}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Unauthorized copying, scraping, or reproduction is strictly prohibited.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500 dark:text-slate-400">
            <Link href="/terms" className="transition-colors hover:text-sky-600 dark:hover:text-sky-300">
              {t("footer.terms")}
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-sky-600 dark:hover:text-sky-300">
              {t("footer.privacy")}
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-sky-600 dark:hover:text-sky-300">
              {t("footer.cookies")}
            </Link>
            <a href="/sitemap.xml" className="transition-colors hover:text-sky-600 dark:hover:text-sky-300">
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

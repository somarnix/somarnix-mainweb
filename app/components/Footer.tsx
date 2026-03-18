import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";

interface FooterProps {
  isAppShell?: boolean;
}

export function Footer({ isAppShell = false }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  if (isAppShell) {
    return null;
  }

  const quickLinks = [
    t("footer.aboutUs"),
    t("footer.allCourses"),
    t("footer.becomeInstructor"),
    t("footer.partnerships"),
    t("footer.careers"),
    t("footer.blog"),
  ];

  const supportLinks = [
    t("footer.helpCenter"),
    t("footer.faqs"),
    t("footer.terms"),
    t("footer.privacy"),
    t("footer.cookies"),
    t("footer.accessibility"),
  ];

  const socialLinks = [
    { icon: Facebook, color: "hover:text-blue-400" },
    { icon: Twitter, color: "hover:text-sky-400" },
    { icon: Instagram, color: "hover:text-pink-400" },
    { icon: Linkedin, color: "hover:text-blue-300" },
    { icon: Youtube, color: "hover:text-red-400" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(14,165,233,0.14),_transparent_45%),radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.12),_transparent_42%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/40">
                <span className="text-lg font-bold text-white">E</span>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-white">
                  Edugroit
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
                  Learn Faster
                </p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-400">
              {t("footer.description")}
            </p>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((item, index) => (
                <a
                  key={index}
                  href="#"
                  className={`flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-500 ${item.color}`}
                >
                  <item.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-white">
              {t("footer.quickLinks")}
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    className="group inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-sky-300"
                  >
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-white">
              {t("footer.support")}
            </h3>
            <ul className="space-y-2.5">
              {supportLinks.map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    className="text-sm text-slate-400 transition-colors hover:text-sky-300"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-white">
                {t("footer.newsletter")}
              </h3>
              <p className="mb-4 text-sm text-slate-400">
                {t("footer.newsletterDesc")}
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder={t("footer.emailPlaceholder")}
                  className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500"
                />
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500">
                  {t("footer.subscribe")}
                </Button>
              </div>
              <div className="mt-5 space-y-2.5 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Mail className="h-4 w-4 text-sky-400" />
                  <span>support@edugroit.com</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Phone className="h-4 w-4 text-sky-400" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-300">
                  <MapPin className="mt-0.5 h-4 w-4 text-sky-400" />
                  <span>123 Learning St, Education City, EC 12345</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:flex-row lg:px-8">
          <p className="text-sm text-slate-400">
            &copy; {currentYear} Edugroit. {t("footer.rights")}
          </p>
          <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400">
            <a href="#" className="transition-colors hover:text-sky-300">
              {t("footer.terms")}
            </a>
            <a href="#" className="transition-colors hover:text-sky-300">
              {t("footer.privacy")}
            </a>
            <a href="#" className="transition-colors hover:text-sky-300">
              {t("footer.cookies")}
            </a>
            <a href="#" className="transition-colors hover:text-sky-300">
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

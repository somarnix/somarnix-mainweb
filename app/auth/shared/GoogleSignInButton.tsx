"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/button";
import { useLanguage, type Language } from "../../contexts/LanguageContext";
import { ensureGoogleGsiReady } from "./useGoogleGsiReady";

type GoogleSignInButtonProps = {
  text: "signin_with" | "signup_with";
  clientId: string | undefined;
  loadingLabel: string;
  unavailableLabel: string;
  onCredential: (credential: string) => Promise<void> | void;
};

const GOOGLE_LOCALES: Partial<Record<Language, string>> = {
  en: "en",
  km: "km",
  zh: "zh-CN",
  ja: "ja",
  ko: "ko",
  vi: "vi",
  fr: "fr",
  de: "de",
  es: "es",
  ru: "ru",
  ar: "ar",
  hi: "hi",
  tl: "fil",
  sv: "sv",
  th: "th",
  id: "id",
  ms: "ms",
  pt: "pt",
  it: "it",
  nl: "nl",
  tr: "tr",
  pl: "pl",
  uk: "uk",
};

export function GoogleSignInButton({
  text,
  clientId,
  loadingLabel,
  unavailableLabel,
  onCredential,
}: GoogleSignInButtonProps) {
  const { language } = useLanguage();
  const googleLocale = GOOGLE_LOCALES[language] ?? "en";
  const frameRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [readyLocale, setReadyLocale] = useState<string | null>(null);
  const [buttonWidth, setButtonWidth] = useState(320);
  const ready = readyLocale === googleLocale;

  useEffect(() => {
    const element = frameRef.current;
    if (!element || typeof window === "undefined") return;

    const updateWidth = () => {
      const nextWidth = Math.max(220, Math.min((element.clientWidth || 344) - 16, 400));
      setButtonWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    };

    updateWidth();

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateWidth) : null;
    observer?.observe(element);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const setup = async () => {
      if (!clientId || !containerRef.current) return;

      containerRef.current.innerHTML = "";
      const googleReady = await ensureGoogleGsiReady(googleLocale);
      if (!active || !googleReady || !window.google?.accounts?.id || !containerRef.current) {
        return;
      }

      const googleId = window.google.accounts.id as unknown as {
        initialize: (config: unknown) => void;
        renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
      };

      googleId.initialize({
        client_id: clientId,
        ux_mode: "popup",
        callback: async (response: { credential?: string }) => {
          const credential = typeof response?.credential === "string" ? response.credential : "";
          if (!credential) return;
          await onCredential(credential);
        },
        use_fedcm_for_prompt: false,
        use_fedcm_for_button: false,
      });

      googleId.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        locale: googleLocale,
        shape: "pill",
        logo_alignment: "left",
        width: String(buttonWidth),
      });

      setReadyLocale(googleLocale);
    };

    void setup();

    return () => {
      active = false;
    };
  }, [buttonWidth, clientId, googleLocale, onCredential, text]);

  if (!clientId) {
    return (
      <div
        className="w-full rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80"
        data-no-auto-translate
        translate="no"
      >
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          disabled
        >
          {unavailableLabel}
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className="w-full rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-2 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80"
      data-no-auto-translate
      translate="no"
    >
      {!ready && (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          disabled
        >
          {loadingLabel}
        </Button>
      )}
      <div
        key={googleLocale}
        ref={containerRef}
        className={ready ? "min-h-[48px] w-full flex items-center justify-center" : "hidden"}
        aria-hidden={!ready}
      />
    </div>
  );
}

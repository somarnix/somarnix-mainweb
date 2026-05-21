"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLanguage, type Language } from "../contexts/LanguageContext";

type LanguageSelectProps = {
  buttonClassName?: string;
  menuClassName?: string;
};

function LanguageFlag({ flagCode }: { flagCode: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-6 rounded-sm bg-cover bg-center bg-no-repeat ring-1 ring-black/10"
      style={{ backgroundImage: `url(https://flagcdn.com/w40/${flagCode}.png)` }}
    />
  );
}

export function LanguageSelect({
  buttonClassName = "",
  menuClassName = "",
}: LanguageSelectProps) {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLanguage = languages.find((item) => item.code === language) ?? languages[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const chooseLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-block text-left" data-no-auto-translate>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-2 rounded-md px-2 py-1 font-semibold uppercase outline-none transition hover:bg-slate-100 dark:hover:bg-slate-900 ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <LanguageFlag flagCode={selectedLanguage.flagCode} />
        <span>{selectedLanguage.shortLabel} {selectedLanguage.label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {open ? (
        <div
          className={`absolute left-0 top-full z-50 mt-1 max-h-80 min-w-56 overflow-y-auto overscroll-contain rounded-md border border-slate-200 bg-white py-1 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 ${menuClassName}`}
          role="listbox"
          aria-label="Language"
        >
          {languages.map((item) => {
            const active = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => chooseLanguage(item.code)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold uppercase transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
                role="option"
                aria-selected={active}
              >
                <LanguageFlag flagCode={item.flagCode} />
                <span className="flex-1 whitespace-nowrap">
                  {item.shortLabel} {item.label}
                </span>
                {active ? <Check className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

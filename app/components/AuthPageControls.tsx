"use client";

import { Globe, Moon, Sun } from "lucide-react";
import { LanguageSelect } from "./LanguageSelect";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

export function AuthPageControls() {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative z-40 mb-4 flex flex-wrap items-center justify-center gap-2 sm:justify-end">
      <div
        title={t("auth.controls.language")}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-white/80 px-3 text-sm font-medium shadow-xs backdrop-blur hover:bg-accent hover:text-accent-foreground dark:bg-gray-900/70"
        data-no-auto-translate
      >
        <Globe className="h-4 w-4" />
        <LanguageSelect
          buttonClassName="bg-transparent p-0 text-sm"
          menuClassName="left-1/2 max-h-[min(18rem,calc(100vh-8rem))] w-72 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleTheme}
        title={`${t("auth.controls.theme")}: ${
          theme === "light" ? t("theme.dark") : t("theme.light")
        }`}
        className="bg-white/80 backdrop-blur dark:bg-gray-900/70"
      >
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        <span>{theme === "light" ? t("theme.dark") : t("theme.light")}</span>
      </Button>
    </div>
  );
}

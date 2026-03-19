"use client";

import { Globe, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

export function AuthPageControls() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const nextLanguage = language === "en" ? "km" : "en";

  return (
    <div className="mb-4 flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setLanguage(nextLanguage)}
        title={`${t("auth.controls.language")}: ${
          nextLanguage === "km" ? t("lang.khmer") : t("lang.english")
        }`}
        className="bg-white/80 backdrop-blur dark:bg-gray-900/70"
      >
        <Globe className="h-4 w-4" />
        <span>{nextLanguage === "km" ? t("lang.khmer") : t("lang.english")}</span>
      </Button>

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

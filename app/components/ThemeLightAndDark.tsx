"use client";

import type { ReactNode } from "react";

type ThemeLightAndDarkProps = {
  children: ReactNode;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const themePageCardClass = "theme-page-card";
export const themeContentFrameClass = "theme-content-frame";
export const themePageEyebrowClass = "theme-page-eyebrow";
export const themePageTitleClass = "theme-page-title";
export const themePageDescriptionClass = "theme-page-description";

export function themeTabButtonClasses(active: boolean, activeClasses: string) {
  return joinClasses("theme-tab-button", active ? activeClasses : "theme-tab-button-inactive");
}

export default function ThemeLightAndDark({ children }: ThemeLightAndDarkProps) {
  return <div className="theme-page-shell">{children}</div>;
}

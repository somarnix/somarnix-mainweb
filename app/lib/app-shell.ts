"use client";

import { useSyncExternalStore } from "react";

export function detectAppShellMode(): boolean {
  if (typeof window === "undefined") return false;

  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;

  if (capacitor?.isNativePlatform?.()) {
    return true;
  }

  const ua = window.navigator.userAgent.toLowerCase();

  return (
    ua.includes("edugroitapp/") ||
    ua.includes("capacitor") ||
    ua.includes("; wv") ||
    ua.includes("version/4.0") ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function subscribeToAppShellChange(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(display-mode: standalone)");
  const handleChange = () => onStoreChange();

  mediaQuery.addEventListener?.("change", handleChange);
  window.addEventListener("appinstalled", handleChange);
  window.addEventListener("focus", handleChange);

  return () => {
    mediaQuery.removeEventListener?.("change", handleChange);
    window.removeEventListener("appinstalled", handleChange);
    window.removeEventListener("focus", handleChange);
  };
}

export function useAppShellMode() {
  return useSyncExternalStore(subscribeToAppShellChange, detectAppShellMode, () => false);
}

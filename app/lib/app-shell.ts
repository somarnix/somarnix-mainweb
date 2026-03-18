"use client";

import { useEffect, useState } from "react";

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

export function useAppShellMode() {
  const [isAppShell, setIsAppShell] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const update = () => setIsAppShell(detectAppShellMode());

    update();
    mediaQuery.addEventListener?.("change", update);
    window.addEventListener("appinstalled", update);
    window.addEventListener("focus", update);

    return () => {
      mediaQuery.removeEventListener?.("change", update);
      window.removeEventListener("appinstalled", update);
      window.removeEventListener("focus", update);
    };
  }, []);

  return isAppShell;
}

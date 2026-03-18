"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, MonitorSmartphone, Smartphone, X } from "lucide-react";

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "edugroit-install-dismissed";

export default function PWAInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<DeferredInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "1");

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as DeferredInstallPromptEvent);
    };

    const onInstalled = () => {
      setPromptEvent(null);
      setDismissed(true);
      window.localStorage.setItem(STORAGE_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canShow = useMemo(() => {
    if (dismissed || isStandalone) return false;
    return Boolean(promptEvent) || isIos;
  }, [dismissed, isStandalone, promptEvent, isIos]);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  };

  const handleInstall = async () => {
    if (!promptEvent) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      setPromptEvent(null);
    } finally {
      setInstalling(false);
    }
  };

  if (!canShow) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-sky-100 bg-white/95 p-4 shadow-2xl backdrop-blur sm:bottom-6 sm:right-6">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Close install prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
          {isIos ? <Smartphone className="h-5 w-5" /> : <MonitorSmartphone className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <div className="pr-8 text-sm font-semibold text-gray-900">
            Install Edugroit App
          </div>
          <div className="mt-1 text-xs leading-5 text-gray-500">
            {isIos
              ? "On iPhone or iPad, tap Share and then Add to Home Screen."
              : "Install this app for faster access, a full-screen experience, and app-like usage."}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {!isIos ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            disabled={!promptEvent || installing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {installing ? "Preparing..." : "Install now"}
          </button>
        ) : (
          <div className="w-full rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
            iPhone install path: Share button -&gt; Add to Home Screen.
          </div>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
        >
          Later
        </button>
      </div>
    </div>
  );
}

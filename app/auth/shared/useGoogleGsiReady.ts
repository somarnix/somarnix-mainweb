"use client";

import { useEffect, useState } from "react";

const GOOGLE_GSI_SCRIPT_ID = "google-gsi-script";
const GOOGLE_GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function hasGoogleGsi() {
  return typeof window !== "undefined" && Boolean(window.google?.accounts?.id);
}

function ensureGoogleScriptTag() {
  let script = document.getElementById(GOOGLE_GSI_SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = GOOGLE_GSI_SCRIPT_ID;
    script.src = GOOGLE_GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  return script;
}

export async function ensureGoogleGsiReady(timeoutMs = 5000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (hasGoogleGsi()) return true;

  const script = ensureGoogleScriptTag();

  await new Promise<void>((resolve) => {
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };

    const handleLoad = () => finish();
    script.addEventListener("load", handleLoad, { once: true });

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      if (hasGoogleGsi() || Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(intervalId);
        script.removeEventListener("load", handleLoad);
        finish();
      }
    }, 100);
  });

  return hasGoogleGsi();
}

export function useGoogleGsiReady() {
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let active = true;
    let intervalId: number | null = null;

    const markReady = () => {
      if (!active || !hasGoogleGsi()) return false;
      setGoogleReady(true);
      return true;
    };

    if (markReady()) {
      return;
    }

    const script = ensureGoogleScriptTag();

    const handleLoad = () => {
      markReady();
    };

    script.addEventListener("load", handleLoad);

    intervalId = window.setInterval(() => {
      if (markReady() && intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }, 250);

    return () => {
      active = false;
      script?.removeEventListener("load", handleLoad);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return googleReady;
}

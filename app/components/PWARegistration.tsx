"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const shouldDisableServiceWorker =
      process.env.NODE_ENV !== "production" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    const cleanupServiceWorkers = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
        }
      } catch (error) {
        console.error("SERVICE WORKER CLEANUP ERROR:", error);
      }
    };

    const register = async () => {
      try {
        if (shouldDisableServiceWorker) {
          await cleanupServiceWorkers();
          return;
        }

        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.error("SERVICE WORKER REGISTER ERROR:", error);
      }
    };

    void register();
  }, []);

  return null;
}

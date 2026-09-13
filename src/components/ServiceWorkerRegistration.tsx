"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalación de PWA es progresiva: si falla, la app sigue funcionando como web normal
      });
    }
  }, []);

  return null;
}

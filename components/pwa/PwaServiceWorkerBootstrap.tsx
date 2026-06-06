"use client";

import { useEffect } from "react";
import { startServiceWorkerRegistration } from "@/lib/pwa-service-worker";

/** Complète l'enregistrement SW (retries + workbox) après hydratation React. */
export default function PwaServiceWorkerBootstrap() {
  useEffect(() => {
    void startServiceWorkerRegistration();
  }, []);

  return null;
}

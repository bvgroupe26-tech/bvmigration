"use client";

import { useEffect } from "react";
import { bootstrapServiceWorker } from "@/lib/pwa-service-worker";

/** Enregistre le service worker dès l’ouverture de l’app (PWA / mobile). */
export default function PwaServiceWorkerBootstrap() {
  useEffect(() => {
    void bootstrapServiceWorker();
  }, []);

  return null;
}

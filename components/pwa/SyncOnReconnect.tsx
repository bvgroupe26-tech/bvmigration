"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { BV_RH_SYNC_MESSAGE } from "@/lib/sync/constants";
import { processSyncQueue, registerBackgroundSync } from "@/lib/sync/syncManager";

/**
 * Écoute le SW (Background Sync) et `online` pour rejouer la file hors ligne.
 * Complète OfflineBanner (Safari n'a pas toujours l'API sync).
 */
export default function SyncOnReconnect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const runSync = async () => {
      const { synced, failed } = await processSyncQueue();
      if (synced > 0) {
        toast.success(
          synced === 1
            ? "1 action synchronisée"
            : `${synced} actions synchronisées`
        );
      }
      if (failed > 0) {
        toast.error(
          "Certaines actions hors ligne n'ont pas pu être envoyées. Réessayez depuis l'application."
        );
      }
    };

    const onOnline = () => {
      void runSync();
      void registerBackgroundSync();
    };

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === BV_RH_SYNC_MESSAGE) {
        void runSync();
      }
    };

    window.addEventListener("online", onOnline);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    void registerBackgroundSync();

    return () => {
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, []);

  return null;
}

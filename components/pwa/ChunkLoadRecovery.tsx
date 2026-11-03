"use client";

import { useEffect } from "react";

const STORAGE_KEY = "bv-chunk-reload";
const CLEAR_FLAG_AFTER_MS = 10_000;

function isChunkLoadFailure(message: string): boolean {
  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

/**
 * Après un déploiement, le service worker peut servir d’anciens chunks :
 * rechargement automatique une fois pour récupérer les assets à jour.
 */
export default function ChunkLoadRecovery() {
  useEffect(() => {
    // Page chargée sans erreur pendant quelques secondes : on réarme la récupération pour le prochain déploiement.
    const clearFlagTimer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }, CLEAR_FLAG_AFTER_MS);

    const tryRecover = (message: string) => {
      if (!isChunkLoadFailure(message)) return;
      window.clearTimeout(clearFlagTimer);
      try {
        const already = sessionStorage.getItem(STORAGE_KEY);
        if (already) return;
        sessionStorage.setItem(STORAGE_KEY, "1");
        window.location.reload();
      } catch {
        window.location.reload();
      }
    };

    const onError = (event: ErrorEvent) => {
      tryRecover(event.message || "");
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "";
      tryRecover(message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.clearTimeout(clearFlagTimer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useState } from "react";

export type OnlineStatus = {
  isOnline: boolean;
  wasOffline: boolean;
};

const WAS_OFFLINE_RESET_MS = 4_000;

function readNavigatorOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Statut réseau client (SSR-safe).
 * `wasOffline` : true juste après un retour en ligne, remis à false après 4s.
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setIsOnline(readNavigatorOnline());

    const onOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    const onOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => {
    if (!wasOffline) return;

    const timer = window.setTimeout(() => {
      setWasOffline(false);
    }, WAS_OFFLINE_RESET_MS);

    return () => window.clearTimeout(timer);
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

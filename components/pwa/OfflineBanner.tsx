"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnlineStatus } from "@/hooks/useOfflineStatus";
import { processSyncQueue } from "@/lib/sync/syncManager";

const RECONNECTED_HIDE_MS = 3_000;

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (wasOffline && isOnline) {
      setShowReconnected(true);
      void processSyncQueue().catch(() => {
        /* SyncOnReconnect / toast gèrent le retour utilisateur */
      });
    }
  }, [wasOffline, isOnline, mounted]);

  useEffect(() => {
    if (!showReconnected) return;

    const timer = window.setTimeout(() => {
      setShowReconnected(false);
    }, RECONNECTED_HIDE_MS);

    return () => window.clearTimeout(timer);
  }, [showReconnected]);

  if (!mounted) return null;

  const visible = !isOnline || showReconnected;
  const reconnecting = isOnline && showReconnected;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key={reconnecting ? "reconnected" : "offline"}
          role="status"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className={`no-print fixed inset-x-0 top-0 z-50 px-4 py-2.5 text-center text-sm font-medium text-white shadow-md ${
            reconnecting ? "bg-green-600/90" : "bg-yellow-500/90"
          }`}
        >
          {reconnecting
            ? "✅ Reconnecté — synchronisation en cours..."
            : "📶 Hors ligne — données locales affichées"}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

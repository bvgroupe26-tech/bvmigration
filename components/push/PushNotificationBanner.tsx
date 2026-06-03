"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { dismissPushBanner } from "@/lib/push-notifications";
import { cn } from "@/lib/utils";

const ACTIVATION_SAFETY_MS = 24_000;

type PushNotificationBannerProps = {
  onSubscribe: () => Promise<boolean>;
  onDismiss?: () => void;
  needsInstallFirst?: boolean;
  className?: string;
};

export default function PushNotificationBanner({
  onSubscribe,
  onDismiss,
  needsInstallFirst = false,
  className,
}: PushNotificationBannerProps) {
  const [activating, setActivating] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  useEffect(() => () => clearSafetyTimer(), []);

  const handleDismiss = () => {
    clearSafetyTimer();
    setActivating(false);
    dismissPushBanner();
    onDismiss?.();
  };

  const handleSubscribe = async () => {
    if (activating) return;

    setActivating(true);
    setFailedOnce(false);
    clearSafetyTimer();
    safetyTimerRef.current = setTimeout(() => {
      setActivating(false);
      setFailedOnce(true);
    }, ACTIVATION_SAFETY_MS);

    try {
      const ok = await onSubscribe();
      if (!ok) setFailedOnce(true);
    } catch {
      setFailedOnce(true);
    } finally {
      clearSafetyTimer();
      setActivating(false);
    }
  };

  const buttonLabel = activating
    ? "Activation…"
    : failedOnce
      ? "Réessayer"
      : "Activer les notifications";

  return (
    <div
      role="region"
      aria-label="Activer les notifications push"
      className={cn(
        "sticky top-0 z-[9990] border-b border-[#1F3F73]/15 bg-gradient-to-r from-[#1F3F73] to-[#2F5F9D] px-4 py-3 text-white shadow-md no-print",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Bell className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">Notifications en temps réel</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/80">
              {needsInstallFirst
                ? "Sur iPhone, installez l'app sur l'écran d'accueil pour recevoir les alertes même fermée."
                : "Recevez les alertes RH sur votre appareil, même quand l'application est fermée."}
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          {!needsInstallFirst ? (
            <button
              type="button"
              onClick={() => void handleSubscribe()}
              disabled={activating}
              className="inline-flex min-w-[10.5rem] flex-1 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1F3F73] transition hover:bg-white/90 disabled:opacity-70 sm:flex-none"
            >
              {buttonLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
            aria-label="Ignorer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

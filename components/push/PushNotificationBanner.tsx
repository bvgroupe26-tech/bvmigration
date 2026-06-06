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
      : "Activer";

  return (
    <div
      role="region"
      aria-label="Activer les notifications push"
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.04] no-print",
        className
      )}
    >
      <div className="h-0.5 bg-gradient-to-r from-[#1F3F73] via-[#2F5F9D] to-[#F2C94C]" />

      <div className="relative p-4">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Ignorer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F0FA] text-[#1F3F73] ring-1 ring-[#2F5F9D]/10">
            <Bell className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold leading-snug text-[#1F3F73]">
              Notifications en temps réel
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {needsInstallFirst
                ? "Sur iPhone, installez l'app sur l'écran d'accueil pour recevoir les alertes même fermée."
                : "Recevez les alertes RH sur votre appareil, même quand l'application est fermée."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Plus tard
          </button>
          {!needsInstallFirst ? (
            <button
              type="button"
              onClick={() => void handleSubscribe()}
              disabled={activating}
              className="inline-flex flex-[1.2] items-center justify-center rounded-xl bg-[#1F3F73] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2F5F9D] disabled:opacity-70"
            >
              {buttonLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { isIosDevice, isStandaloneMode } from "@/lib/pwa-install";

/** Safari iOS : Web Push uniquement en PWA installée (écran d'accueil). */
export function needsPwaInstallForPush(): boolean {
  if (typeof window === "undefined") return false;
  return isIosDevice() && !isStandaloneMode();
}

export function canUseWebPush(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

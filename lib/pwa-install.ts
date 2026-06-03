export const PWA_DISMISS_KEY = "bv-pwa-install-dismissed";
/** Réafficher après fermeture « Plus tard » */
export const PWA_DISMISS_DAYS = 3;

export type InstallPlatform = "in-app" | "ios" | "android" | "desktop";

export function detectInstallPlatform(): InstallPlatform {
  if (isInAppBrowser()) return "in-app";
  if (isIosDevice()) return "ios";
  if (isAndroidDevice()) return "android";
  return "desktop";
}

export function getInstallPlatformLabel(platform: InstallPlatform): string {
  switch (platform) {
    case "in-app":
      return "Navigateur intégré (Facebook, Instagram…)";
    case "ios":
      return "iPhone / iPad — Safari";
    case "android":
      return "Android — Chrome";
    default:
      return "Ordinateur — Chrome / Edge";
  }
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  return isIosDevice() || isAndroidDevice();
}

/** Facebook / Instagram / LinkedIn in-app : pas d'installation PWA fiable */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|LinkedInApp|Twitter|Snapchat/i.test(ua);
}

export const PWA_INSTALLED_EVENT = "bv-pwa-installed";

export function wasInstallDismissedRecently(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(PWA_DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    const ms = PWA_DISMISS_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < ms;
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  try {
    localStorage.setItem(PWA_DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearInstallDismiss(): void {
  try {
    localStorage.removeItem(PWA_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

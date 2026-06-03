"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  detectInstallPlatform,
  dismissInstallPrompt,
  getInstallPlatformLabel,
  isInAppBrowser,
  isIosDevice,
  isMobileDevice,
  isStandaloneMode,
  PWA_INSTALLED_EVENT,
  wasInstallDismissedRecently,
  type BeforeInstallPromptEvent,
  type InstallPlatform,
} from "@/lib/pwa-install";

const EXCLUDED_PATH_PREFIXES = ["/offline"];

function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function readPlatformState() {
  if (typeof window === "undefined") {
    return {
      platform: "desktop" as InstallPlatform,
      isIos: false,
      isMobile: false,
      inAppBrowser: false,
    };
  }
  const platform = detectInstallPlatform();
  return {
    platform,
    isIos: isIosDevice(),
    isMobile: isMobileDevice(),
    inAppBrowser: isInAppBrowser(),
  };
}

export function usePwaInstall() {
  const pathname = usePathname() || "";
  const initial = readPlatformState();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>(initial.platform);
  const [isIos, setIsIos] = useState(initial.isIos);
  const [isMobile, setIsMobile] = useState(initial.isMobile);
  const [inAppBrowser, setInAppBrowser] = useState(initial.inAppBrowser);

  const canShowRoute = !isExcludedRoute(pathname);

  useLayoutEffect(() => {
    if (typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI) {
      return;
    }
    if (!canShowRoute) {
      setPromptOpen(false);
      return;
    }
    if (isStandaloneMode() || wasInstallDismissedRecently()) {
      setPromptOpen(false);
      return;
    }

    const state = readPlatformState();
    setPlatform(state.platform);
    setIsIos(state.isIos);
    setIsMobile(state.isMobile);
    setInAppBrowser(state.inAppBrowser);
    setPromptOpen(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPromptOpen(true);
    };

    const onInstalled = () => {
      setPromptOpen(false);
      setDeferredPrompt(null);
      dismissInstallPrompt();
      window.dispatchEvent(new CustomEvent(PWA_INSTALLED_EVENT));
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [canShowRoute, pathname]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setPromptOpen(false);
        setDeferredPrompt(null);
        dismissInstallPrompt();
        window.dispatchEvent(new CustomEvent(PWA_INSTALLED_EVENT));
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    dismissInstallPrompt();
    setPromptOpen(false);
  }, []);

  const openPrompt = useCallback(() => {
    if (isStandaloneMode()) return;
    setPromptOpen(true);
  }, []);

  const canNativeInstall = Boolean(deferredPrompt);
  const platformLabel = getInstallPlatformLabel(platform);
  const visible = canShowRoute && promptOpen && !isStandaloneMode();

  return {
    visible,
    installing,
    platform,
    platformLabel,
    isIos,
    isMobile,
    inAppBrowser,
    canNativeInstall,
    install,
    dismiss,
    openPrompt,
    isStandalone: isStandaloneMode(),
  };
}

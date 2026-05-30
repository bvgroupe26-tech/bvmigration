"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dismissInstallPrompt,
  isIosDevice,
  isMobileDevice,
  isStandaloneMode,
  wasInstallDismissedRecently,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI) {
      return;
    }
    if (isStandaloneMode() || wasInstallDismissedRecently()) return;

    const ios = isIosDevice();
    const mobile = isMobileDevice();
    setIsIos(ios);
    setIsMobile(mobile);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      dismissInstallPrompt();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const timer = window.setTimeout(() => {
      if (isStandaloneMode() || wasInstallDismissedRecently()) return;
      setVisible(true);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        setDeferredPrompt(null);
        dismissInstallPrompt();
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
    setVisible(false);
  }, []);

  const canNativeInstall = Boolean(deferredPrompt);

  return {
    visible,
    installing,
    isIos,
    isMobile,
    canNativeInstall,
    install,
    dismiss,
  };
}

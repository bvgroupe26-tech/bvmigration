"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

/** Routes d’entrée : le message d’installation doit toujours être proposé. */
const INSTALL_ENTRY_PATHS = new Set(["/", "/login"]);

function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isInstallEntryRoute(pathname: string): boolean {
  return INSTALL_ENTRY_PATHS.has(pathname);
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

type PwaInstallContextValue = {
  visible: boolean;
  installing: boolean;
  platform: InstallPlatform;
  platformLabel: string;
  isIos: boolean;
  isMobile: boolean;
  inAppBrowser: boolean;
  canNativeInstall: boolean;
  isStandalone: boolean;
  isLoginEntry: boolean;
  install: () => Promise<boolean>;
  dismiss: () => void;
  openPrompt: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
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
  const isLoginEntry = isInstallEntryRoute(pathname);

  useLayoutEffect(() => {
    if (typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI) {
      return;
    }
    if (!canShowRoute) {
      setPromptOpen(false);
      return;
    }
    if (isStandaloneMode()) {
      setPromptOpen(false);
      return;
    }

    const dismissed = wasInstallDismissedRecently();
    if (dismissed && !isLoginEntry) {
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
  }, [canShowRoute, isLoginEntry, pathname]);

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

  const value = useMemo(
    () => ({
      visible,
      installing,
      platform,
      platformLabel,
      isIos,
      isMobile,
      inAppBrowser,
      canNativeInstall,
      isStandalone: isStandaloneMode(),
      isLoginEntry,
      install,
      dismiss,
      openPrompt,
    }),
    [
      visible,
      installing,
      platform,
      platformLabel,
      isIos,
      isMobile,
      inAppBrowser,
      canNativeInstall,
      isLoginEntry,
      install,
      dismiss,
      openPrompt,
    ]
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall doit être utilisé dans PwaInstallProvider.");
  }
  return ctx;
}

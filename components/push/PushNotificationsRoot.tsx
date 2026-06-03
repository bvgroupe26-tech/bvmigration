"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { BV_AUTH_READY_EVENT, PWA_INSTALLED_EVENT } from "@/lib/pwa-install";
import { wasPushBannerDismissed } from "@/lib/push-notifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import PushNotificationBanner from "@/components/push/PushNotificationBanner";

function isElectron(): boolean {
  return typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI != null;
}

export default function PushNotificationsRoot() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const {
    isSupported,
    isSubscribed,
    permission,
    needsInstallFirst,
    subscribe,
    syncSubscriptionState,
  } = usePushNotifications();
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const autoSubscribeDoneRef = useRef(false);
  const lastSilentRetryRef = useRef(0);

  const runSilentSubscribe = useCallback(async () => {
    if (needsInstallFirst || permission !== "granted") return;
    const now = Date.now();
    if (now - lastSilentRetryRef.current < 30_000) return;
    lastSilentRetryRef.current = now;
    await subscribe({ silent: true, requestPermission: false });
  }, [needsInstallFirst, permission, subscribe]);

  useEffect(() => {
    setBannerDismissed(wasPushBannerDismissed());
  }, []);

  useEffect(() => {
    if (isElectron() || isLoading || !isAuthenticated || !user || !isSupported) return;
    if (autoSubscribeDoneRef.current) return;
    if (permission !== "granted" || needsInstallFirst) return;

    autoSubscribeDoneRef.current = true;
    void runSilentSubscribe();
  }, [
    user,
    isAuthenticated,
    isSupported,
    isLoading,
    permission,
    needsInstallFirst,
    runSilentSubscribe,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !isSupported) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void syncSubscriptionState();
      if (Notification.permission === "granted" && !needsInstallFirst && !isSubscribed) {
        void runSilentSubscribe();
      }
    };

    const onPwaInstalled = () => {
      setBannerDismissed(false);
      autoSubscribeDoneRef.current = false;
      void subscribe({ silent: false, requestPermission: true });
    };

    const onAuthReady = () => {
      if (Notification.permission === "granted" && !needsInstallFirst) {
        void runSilentSubscribe();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);
    window.addEventListener(BV_AUTH_READY_EVENT, onAuthReady);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);
      window.removeEventListener(BV_AUTH_READY_EVENT, onAuthReady);
    };
  }, [
    isAuthenticated,
    isSupported,
    isSubscribed,
    needsInstallFirst,
    runSilentSubscribe,
    subscribe,
    syncSubscriptionState,
  ]);

  if (isElectron() || isLoading || !isAuthenticated || !user || !isSupported) {
    return null;
  }

  if (isSubscribed) {
    return null;
  }

  if (permission === "denied") {
    return null;
  }

  if (bannerDismissed && permission === "granted") {
    return null;
  }

  const showBanner =
    !bannerDismissed &&
    (permission === "default" || (permission === "granted" && !isSubscribed) || needsInstallFirst);

  if (!showBanner) {
    return null;
  }

  return (
    <div className="no-print fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+2.75rem)] z-[10001] px-3 sm:px-4">
      <PushNotificationBanner
        onSubscribe={async () => {
          const ok = await subscribe({ silent: false, requestPermission: true });
          if (ok) setBannerDismissed(true);
          return ok;
        }}
        onDismiss={() => setBannerDismissed(true)}
        needsInstallFirst={needsInstallFirst}
      />
    </div>
  );
}

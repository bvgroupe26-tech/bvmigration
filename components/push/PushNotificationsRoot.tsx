"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PWA_INSTALLED_EVENT } from "@/lib/pwa-install";
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
    loading,
    needsInstallFirst,
    subscribe,
    syncSubscriptionState,
  } = usePushNotifications();
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    setBannerDismissed(wasPushBannerDismissed());
  }, []);

  useEffect(() => {
    if (isElectron() || isLoading || !isAuthenticated || !user || !isSupported) return;
    if (needsInstallFirst) return;

    if (permission === "granted" && !isSubscribed && !loading) {
      void subscribe();
    }
  }, [
    user,
    isAuthenticated,
    isSupported,
    permission,
    isSubscribed,
    loading,
    isLoading,
    needsInstallFirst,
    subscribe,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !isSupported) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void syncSubscriptionState();
      if (Notification.permission === "granted" && !needsInstallFirst) {
        void subscribe();
      }
    };

    const onPwaInstalled = () => {
      void syncSubscriptionState();
      if (!wasPushBannerDismissed()) {
        setBannerDismissed(false);
      }
      void subscribe();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);
    };
  }, [
    isAuthenticated,
    isSupported,
    needsInstallFirst,
    subscribe,
    syncSubscriptionState,
  ]);

  if (isElectron() || isLoading || !isAuthenticated || !user || !isSupported) {
    return null;
  }

  if (isSubscribed || bannerDismissed) {
    return null;
  }

  if (permission === "denied") {
    return null;
  }

  const showBanner =
    permission === "default" ||
    (permission === "granted" && !isSubscribed) ||
    needsInstallFirst;

  if (!showBanner) {
    return null;
  }

  return (
    <div className="no-print fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+2.75rem)] z-[10001] px-3 sm:px-4">
      <PushNotificationBanner
        onSubscribe={subscribe}
        onDismiss={() => setBannerDismissed(true)}
        loading={loading}
        needsInstallFirst={needsInstallFirst}
      />
    </div>
  );
}

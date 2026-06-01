"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { wasPushBannerDismissed } from "@/lib/push-notifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import PushNotificationBanner from "@/components/push/PushNotificationBanner";

function isElectron(): boolean {
  return typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI != null;
}

export default function PushNotificationsRoot() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isSupported, isSubscribed, permission, loading, subscribe } = usePushNotifications();
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    setBannerDismissed(wasPushBannerDismissed());
  }, []);

  useEffect(() => {
    if (isElectron() || isLoading || !isAuthenticated || !user || !isSupported) return;
    if (permission !== "granted" || isSubscribed || loading) return;

    void subscribe();
  }, [user, isAuthenticated, isSupported, permission, isSubscribed, loading, isLoading, subscribe]);

  if (isElectron() || isLoading || !isAuthenticated || !user || !isSupported) {
    return null;
  }

  if (permission === "denied" || isSubscribed || bannerDismissed) {
    return null;
  }

  if (permission !== "default") {
    return null;
  }

  return (
    <PushNotificationBanner
      onSubscribe={subscribe}
      onDismiss={() => setBannerDismissed(true)}
      loading={loading}
    />
  );
}

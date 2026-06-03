"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { wasPushBannerDismissed } from "@/lib/push-notifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import PushNotificationBanner from "@/components/push/PushNotificationBanner";

function isElectron(): boolean {
  return typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI != null;
}

/** Bannière push — activation uniquement au clic (pas d’auto-abonnement en arrière-plan). */
export default function PushNotificationsRoot() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isSupported, isSubscribed, permission, needsInstallFirst, subscribe } =
    usePushNotifications();
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    setBannerDismissed(wasPushBannerDismissed());
  }, []);

  if (isElectron() || isLoading || !isAuthenticated || !user || !isSupported) {
    return null;
  }

  if (isSubscribed || permission === "denied") {
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

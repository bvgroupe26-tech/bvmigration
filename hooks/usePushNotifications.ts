"use client";

import { useCallback, useEffect, useState } from "react";
import { canUseWebPush, needsPwaInstallForPush } from "@/lib/push-device";
import { PWA_INSTALLED_EVENT } from "@/lib/pwa-install";
import {
  removePushSubscription,
  resolveVapidPublicKey,
  sendPushSubscription,
  urlBase64ToUint8Array,
  waitForServiceWorkerRegistration,
} from "@/lib/push-notifications";

function isElectron(): boolean {
  return typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI != null;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [needsInstallFirst, setNeedsInstallFirst] = useState(false);

  const syncSubscriptionState = useCallback(async (registration?: ServiceWorkerRegistration) => {
    if (!canUseWebPush()) {
      setIsSubscribed(false);
      return;
    }

    const reg = registration ?? (await waitForServiceWorkerRegistration(8_000));
    if (!reg) {
      setIsSubscribed(false);
      return;
    }

    const subscription = await reg.pushManager.getSubscription();
    setIsSubscribed(Boolean(subscription));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isElectron()) return;

    const supported = canUseWebPush();
    setIsSupported(supported);
    setPermission(Notification.permission);
    setNeedsInstallFirst(needsPwaInstallForPush());

    if (!supported) return;

    let cancelled = false;

    const init = async () => {
      try {
        const registration = await waitForServiceWorkerRegistration();
        if (cancelled) return;
        await syncSubscriptionState(registration ?? undefined);
      } catch {
        if (!cancelled) setIsSubscribed(false);
      }
    };

    void init();

    const onPermissionChange = () => {
      setPermission(Notification.permission);
      setNeedsInstallFirst(needsPwaInstallForPush());
    };

    const onPwaInstalled = () => {
      setNeedsInstallFirst(needsPwaInstallForPush());
    };

    if (navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          status.onchange = onPermissionChange;
        })
        .catch(() => undefined);
    }

    window.addEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);

    return () => {
      cancelled = true;
      window.removeEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);
    };
  }, [syncSubscriptionState]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || loading) return false;

    if (needsPwaInstallForPush()) {
      return false;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const registration = await waitForServiceWorkerRegistration();
      if (!registration?.active) {
        throw new Error("Service worker indisponible. Rechargez la page ou installez l'application.");
      }

      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        await sendPushSubscription(existing);
        setIsSubscribed(true);
        return true;
      }

      const publicKey = await resolveVapidPublicKey();
      if (!publicKey) throw new Error("Clé VAPID publique introuvable");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await sendPushSubscription(subscription);
      setIsSubscribed(true);
      return true;
    } catch {
      setIsSubscribed(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, loading]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || loading) return false;

    setLoading(true);
    try {
      const registration = await waitForServiceWorkerRegistration();
      if (!registration) {
        setIsSubscribed(false);
        return true;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        return true;
      }

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await removePushSubscription(endpoint);
      setIsSubscribed(false);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, loading]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    needsInstallFirst,
    subscribe,
    unsubscribe,
    syncSubscriptionState,
  };
}

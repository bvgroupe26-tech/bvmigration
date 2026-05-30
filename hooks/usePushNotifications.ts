"use client";

import { useCallback, useEffect, useState } from "react";
import {
  removePushSubscription,
  resolveVapidPublicKey,
  sendPushSubscription,
  urlBase64ToUint8Array,
} from "@/lib/push-notifications";

const SW_URL = "/sw.js";

function isElectron(): boolean {
  return typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI != null;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  const syncSubscriptionState = useCallback(async (registration?: ServiceWorkerRegistration) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSubscribed(false);
      return;
    }

    const reg = registration ?? (await navigator.serviceWorker.ready.catch(() => null));
    if (!reg) {
      setIsSubscribed(false);
      return;
    }

    const subscription = await reg.pushManager.getSubscription();
    setIsSubscribed(Boolean(subscription));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isElectron()) return;

    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    setPermission(Notification.permission);

    if (!supported) return;

    let cancelled = false;

    const registerServiceWorker = async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistration("/");
        const registration =
          existing ?? (await navigator.serviceWorker.register(SW_URL, { scope: "/" }));

        if (cancelled) return;

        await navigator.serviceWorker.ready;
        if (cancelled) return;

        await syncSubscriptionState(registration);
      } catch {
        if (!cancelled) setIsSubscribed(false);
      }
    };

    void registerServiceWorker();

    const onPermissionChange = () => {
      setPermission(Notification.permission);
    };

    if (navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          status.onchange = onPermissionChange;
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [syncSubscriptionState]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || loading) return false;

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
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
      const registration = await navigator.serviceWorker.ready;
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
    subscribe,
    unsubscribe,
  };
}

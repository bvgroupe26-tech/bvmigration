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
    // #region agent log
    fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
      body: JSON.stringify({
        sessionId: "cd157f",
        runId: "pre-fix",
        hypothesisId: "H1-H5",
        location: "usePushNotifications.ts:subscribe:start",
        message: "subscribe started",
        data: { isSupported, sw: "serviceWorker" in navigator },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      // #region agent log
      fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
        body: JSON.stringify({
          sessionId: "cd157f",
          runId: "pre-fix",
          hypothesisId: "H5",
          location: "usePushNotifications.ts:subscribe:afterPermission",
          message: "permission result",
          data: { result },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (result !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      // #region agent log
      fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
        body: JSON.stringify({
          sessionId: "cd157f",
          runId: "pre-fix",
          hypothesisId: "H1",
          location: "usePushNotifications.ts:subscribe:afterSwReady",
          message: "service worker ready",
          data: { scope: registration.scope },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        await sendPushSubscription(existing);
        setIsSubscribed(true);
        return true;
      }

      const publicKey = await resolveVapidPublicKey();
      // #region agent log
      fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
        body: JSON.stringify({
          sessionId: "cd157f",
          runId: "pre-fix",
          hypothesisId: "H2",
          location: "usePushNotifications.ts:subscribe:afterVapid",
          message: "vapid key resolved",
          data: { hasKey: Boolean(publicKey), keyLen: publicKey?.length ?? 0 },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!publicKey) throw new Error("Clé VAPID publique introuvable");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await sendPushSubscription(subscription);
      // #region agent log
      fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
        body: JSON.stringify({
          sessionId: "cd157f",
          runId: "pre-fix",
          hypothesisId: "H3",
          location: "usePushNotifications.ts:subscribe:afterSend",
          message: "subscription sent to API",
          data: { ok: true },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setIsSubscribed(true);
      return true;
    } catch (err) {
      // #region agent log
      fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
        body: JSON.stringify({
          sessionId: "cd157f",
          runId: "pre-fix",
          hypothesisId: "H1-H3",
          location: "usePushNotifications.ts:subscribe:catch",
          message: "subscribe failed",
          data: { error: err instanceof Error ? err.message : "unknown" },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setIsSubscribed(false);
      return false;
    } finally {
      // #region agent log
      fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
        body: JSON.stringify({
          sessionId: "cd157f",
          runId: "pre-fix",
          hypothesisId: "H4",
          location: "usePushNotifications.ts:subscribe:finally",
          message: "subscribe finished",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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

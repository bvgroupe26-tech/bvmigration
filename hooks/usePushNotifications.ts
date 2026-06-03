"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { canUseWebPush, needsPwaInstallForPush } from "@/lib/push-device";
import { BV_AUTH_READY_EVENT, PWA_INSTALLED_EVENT } from "@/lib/pwa-install";
import {
  ensureWebPushSubscription,
  removePushSubscription,
  waitForServiceWorkerRegistration,
  withPushTimeout,
  type EnsurePushResult,
} from "@/lib/push-notifications";

function isElectron(): boolean {
  return typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI != null;
}

const SUBSCRIBE_TIMEOUT_MS = 28_000;

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [needsInstallFirst, setNeedsInstallFirst] = useState(false);
  const inFlightRef = useRef(false);

  const syncSubscriptionState = useCallback(async () => {
    if (!canUseWebPush()) {
      setIsSubscribed(false);
      return;
    }

    const reg = await waitForServiceWorkerRegistration(5_000);
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

    void syncSubscriptionState();

    const onPermissionChange = () => {
      setPermission(Notification.permission);
      setNeedsInstallFirst(needsPwaInstallForPush());
    };

    const onPwaInstalled = () => setNeedsInstallFirst(needsPwaInstallForPush());

    const onAuthReady = () => {
      if (Notification.permission === "granted" && !inFlightRef.current) {
        void ensureWebPushSubscription(false).then((r) => {
          if (r.ok) void syncSubscriptionState();
        });
      }
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
    window.addEventListener(BV_AUTH_READY_EVENT, onAuthReady);

    return () => {
      window.removeEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);
      window.removeEventListener(BV_AUTH_READY_EVENT, onAuthReady);
    };
  }, [syncSubscriptionState]);

  const subscribe = useCallback(
    async (opts?: { silent?: boolean; requestPermission?: boolean }): Promise<boolean> => {
      if (!isSupported || inFlightRef.current) return false;

      inFlightRef.current = true;
      setLoading(true);
      try {
        const result: EnsurePushResult = await withPushTimeout(
          ensureWebPushSubscription(
            opts?.requestPermission ?? Notification.permission === "default"
          ),
          SUBSCRIBE_TIMEOUT_MS,
          "Délai dépassé. Rechargez la page, ou testez sur l'URL de production (HTTPS + PWA)."
        );

        if (result.ok) {
          setIsSubscribed(true);
          setPermission("granted");
          if (!opts?.silent) {
            toast.success("Notifications activées — vous serez alerté même hors de l'application");
          }
          return true;
        }

        setIsSubscribed(false);
        if (!opts?.silent) {
          if (result.reason === "needs_install") {
            toast.message(result.message);
          } else {
            toast.error(result.message);
          }
        }
        return false;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Impossible d'activer les notifications";
        if (!opts?.silent) toast.error(message);
        return false;
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        void syncSubscriptionState();
      }
    },
    [isSupported, syncSubscriptionState]
  );

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || inFlightRef.current) return false;

    inFlightRef.current = true;
    setLoading(true);
    try {
      const registration = await waitForServiceWorkerRegistration(8_000);
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
      toast.message("Notifications push désactivées");
      return true;
    } catch {
      return false;
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [isSupported]);

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

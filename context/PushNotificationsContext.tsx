"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { canUseWebPush, needsPwaInstallForPush } from "@/lib/push-device";
import { PWA_INSTALLED_EVENT } from "@/lib/pwa-install";
import {
  ensureWebPushSubscription,
  removePushSubscription,
  resyncPushAfterAuth,
  syncPushSubscriptionToServer,
  waitForServiceWorkerRegistration,
  withPushTimeout,
  type EnsurePushResult,
} from "@/lib/push-notifications";

function isElectron(): boolean {
  return typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI != null;
}

const SUBSCRIBE_TIMEOUT_MS = 45_000;
const PUSH_RESYNC_MESSAGE = "BV_PUSH_RESYNC";

type PushNotificationsContextValue = {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  loading: boolean;
  needsInstallFirst: boolean;
  subscribe: (opts?: { silent?: boolean; requestPermission?: boolean }) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  syncSubscriptionState: () => Promise<void>;
};

const PushNotificationsContext = createContext<PushNotificationsContextValue | null>(null);

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
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

    // next-pwa enregistre déjà /sw.js — on attend ready sans second register()
    const reg = await waitForServiceWorkerRegistration(5_000);
    if (!reg?.pushManager) {
      setIsSubscribed(false);
      setPermission(Notification.permission);
      return;
    }

    const subscription = await reg.pushManager.getSubscription();
    setIsSubscribed(Boolean(subscription));
    setPermission(Notification.permission);
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

    const onSwPushResync = (event: MessageEvent) => {
      if (event.data?.type !== PUSH_RESYNC_MESSAGE || !isAuthenticated) return;
      void syncPushSubscriptionToServer().then(() => syncSubscriptionState());
    };

    if (navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          status.onchange = onPermissionChange;
        })
        .catch(() => undefined);
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setPermission(Notification.permission);
        void syncSubscriptionState();
      }
    };

    window.addEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);
    window.addEventListener("focus", onPermissionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    navigator.serviceWorker?.addEventListener("message", onSwPushResync);

    return () => {
      window.removeEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);
      window.removeEventListener("focus", onPermissionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      navigator.serviceWorker?.removeEventListener("message", onSwPushResync);
    };
  }, [isAuthenticated, syncSubscriptionState]);

  useEffect(() => {
    if (!isAuthenticated || !isSupported) return;
    void resyncPushAfterAuth().then(() => syncSubscriptionState());
  }, [isAuthenticated, isSupported, syncSubscriptionState]);

  const subscribe = useCallback(
    async (opts?: { silent?: boolean; requestPermission?: boolean }): Promise<boolean> => {
      if (!isSupported) {
        if (!opts?.silent) toast.error("Notifications push non supportées sur ce navigateur.");
        return false;
      }

      if (!isAuthenticated) {
        if (!opts?.silent) toast.error("Connectez-vous pour activer les notifications.");
        return false;
      }

      if (inFlightRef.current) {
        if (!opts?.silent) toast.message("Activation déjà en cours…");
        return false;
      }

      inFlightRef.current = true;
      setLoading(true);

      try {
        const result: EnsurePushResult = await withPushTimeout(
          ensureWebPushSubscription(
            opts?.requestPermission ?? Notification.permission === "default"
          ),
          SUBSCRIBE_TIMEOUT_MS,
          "Délai dépassé. Réessayez ou testez en production (HTTPS)."
        );

        if (result.ok) {
          setIsSubscribed(true);
          setPermission("granted");
          if (!opts?.silent) {
            toast.success("Notifications activées — alertes même hors de l'application");
          }
          return true;
        }

        setIsSubscribed(false);
        if (!opts?.silent) {
          if (result.reason === "needs_install") toast.message(result.message);
          else toast.error(result.message);
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
    [isAuthenticated, isSupported, syncSubscriptionState]
  );

  /** Permission déjà accordée dans le navigateur → finaliser l'abonnement push automatiquement. */
  useEffect(() => {
    if (
      !isAuthenticated ||
      !isSupported ||
      isSubscribed ||
      loading ||
      inFlightRef.current ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    void subscribe({ silent: true, requestPermission: false });
  }, [isAuthenticated, isSupported, isSubscribed, loading, subscribe]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || inFlightRef.current) return false;

    inFlightRef.current = true;
    setLoading(true);
    try {
      const registration = await waitForServiceWorkerRegistration(6_000);
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

  const value: PushNotificationsContextValue = {
    isSupported,
    isSubscribed,
    permission,
    loading,
    needsInstallFirst,
    subscribe,
    unsubscribe,
    syncSubscriptionState,
  };

  return (
    <PushNotificationsContext.Provider value={value}>{children}</PushNotificationsContext.Provider>
  );
}

export function usePushNotifications(): PushNotificationsContextValue {
  const ctx = useContext(PushNotificationsContext);
  if (!ctx) {
    throw new Error("usePushNotifications doit être utilisé dans PushNotificationsProvider.");
  }
  return ctx;
}

import { apiFetch } from "@/lib/apiClient";
import { getAccessToken } from "@/lib/authClient";
import { needsPwaInstallForPush } from "@/lib/push-device";
import { isStandaloneMode } from "@/lib/pwa-install";

const VAPID_ENV_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SW_PATH = "/sw.js";

export const PUSH_BANNER_DISMISS_KEY = "bv-push-banner-dismissed";
const PUSH_DISMISS_DAYS = 14;

export function wasPushBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(PUSH_BANNER_DISMISS_KEY);
    if (!raw) return false;
    if (raw === "1") return true;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < PUSH_DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissPushBanner(): void {
  localStorage.setItem(PUSH_BANNER_DISMISS_KEY, String(Date.now()));
}

function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

export async function withPushTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Attend le SW enregistré par next-pwa (register: true) — sans second register(). */
function waitForWorkerActivation(
  registration: ServiceWorkerRegistration,
  timeoutMs: number
): Promise<ServiceWorkerRegistration | null> {
  if (registration.active) return Promise.resolve(registration);

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    let worker = registration.installing || registration.waiting;

    const finish = () => {
      resolve(registration.active ? registration : null);
    };

    const attach = (sw: ServiceWorker) => {
      const onStateChange = () => {
        if (sw.state === "activated" || sw.state === "redundant") {
          sw.removeEventListener("statechange", onStateChange);
          finish();
        }
      };
      sw.addEventListener("statechange", onStateChange);
      if (sw.state === "activated") {
        sw.removeEventListener("statechange", onStateChange);
        finish();
      }
    };

    if (worker) {
      attach(worker);
    } else {
      void registration.update().catch(() => undefined);
      worker = registration.installing || registration.waiting;
      if (worker) attach(worker);
    }

    setTimeout(finish, Math.max(0, deadline - Date.now()));
  });
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return null;
  return registrations.find((reg) => reg.active) ?? registrations[0] ?? null;
}

async function ensureServiceWorkerRegistered(): Promise<ServiceWorkerRegistration | null> {
  let registration = await getServiceWorkerRegistration();
  if (registration) return registration;

  try {
    registration = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    return registration;
  } catch {
    return getServiceWorkerRegistration();
  }
}

function serviceWorkerUnavailableMessage(): string {
  const devHint =
    process.env.NODE_ENV === "development"
      ? " En mode développement, testez avec « npm run build && npm run start » ou sur l'URL de production."
      : "";

  if (isStandaloneMode()) {
    return `Service worker indisponible. Fermez complètement l'application, rouvrez-la depuis l'icône, puis réessayez.${devHint}`;
  }

  if (needsPwaInstallForPush()) {
    return `Service worker indisponible. Installez l'application sur l'écran d'accueil, puis réessayez.${devHint}`;
  }

  return `Service worker indisponible. Rechargez la page ou installez l'application.${devHint}`;
}

export async function waitForServiceWorkerRegistration(
  maxWaitMs = 12_000
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  await ensureServiceWorkerRegistered();

  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    try {
      const ready = await raceTimeout(
        navigator.serviceWorker.ready,
        Math.min(3_000, remaining)
      );
      if (ready) {
        const activated = await waitForWorkerActivation(ready, Math.min(4_000, remaining));
        if (activated?.active) return activated;
      }
    } catch {
      /* ignore */
    }

    const registration = await getServiceWorkerRegistration();
    if (registration) {
      const activated = await waitForWorkerActivation(
        registration,
        Math.min(3_000, remaining)
      );
      if (activated?.active) return activated;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const last = await getServiceWorkerRegistration();
  if (!last) return null;
  const activated = await waitForWorkerActivation(last, 2_000);
  return activated?.active ? activated : null;
}

export type EnsurePushResult =
  | { ok: true; subscribed: boolean }
  | { ok: false; reason: "unsupported" | "denied" | "needs_install" | "error"; message: string };

/** Demande la permission, abonne au push et enregistre sur le serveur. */
export async function ensureWebPushSubscription(
  requestPermission = false
): Promise<EnsurePushResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "unsupported", message: "Environnement non supporté" };
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, reason: "unsupported", message: "Navigateur incompatible avec les notifications push" };
  }

  if (needsPwaInstallForPush()) {
    return {
      ok: false,
      reason: "needs_install",
      message: "Sur iPhone, installez l'application sur l'écran d'accueil pour recevoir les alertes.",
    };
  }

  let permission = Notification.permission;
  if (permission === "default" && requestPermission) {
    permission = await requestNotificationPermission();
  }

  if (permission === "denied") {
    return {
      ok: false,
      reason: "denied",
      message: "Notifications bloquées — autorisez-les dans les paramètres du navigateur.",
    };
  }

  if (permission !== "granted") {
    return {
      ok: false,
      reason: "denied",
      message: "Autorisation des notifications requise.",
    };
  }

  const swWaitMs = process.env.NODE_ENV === "development" ? 8_000 : 15_000;
  const registration = await waitForServiceWorkerRegistration(swWaitMs);
  if (!registration?.active) {
    return {
      ok: false,
      reason: "error",
      message: serviceWorkerUnavailableMessage(),
    };
  }

  try {
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const publicKey = await withPushTimeout(
        resolveVapidPublicKey(),
        10_000,
        "Impossible de récupérer la clé VAPID (serveur injoignable ou non configuré)."
      );
      if (!publicKey) {
        return {
          ok: false,
          reason: "error",
          message: "Notifications push non configurées sur le serveur (clés VAPID).",
        };
      }
      if (!isValidVapidPublicKey(publicKey)) {
        return {
          ok: false,
          reason: "error",
          message:
            "Clé VAPID invalide (vérifiez NEXT_PUBLIC_VAPID_PUBLIC_KEY sur Vercel — générez-la avec npx web-push generate-vapid-keys).",
        };
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    if (!getAccessToken()) {
      return {
        ok: false,
        reason: "error",
        message: "Connectez-vous pour enregistrer les notifications sur le serveur.",
      };
    }

    await withPushTimeout(
      sendPushSubscription(subscription),
      15_000,
      "Enregistrement sur le serveur trop long — vérifiez la connexion et réessayez."
    );
    return { ok: true, subscribed: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec de l'abonnement push";
    return { ok: false, reason: "error", message };
  }
}

/** Clé publique VAPID valide = 65 octets une fois décodée (format web-push). */
export function isValidVapidPublicKey(key: string): boolean {
  const trimmed = key?.trim();
  if (!trimmed || trimmed.length < 80) return false;
  try {
    return urlBase64ToUint8Array(trimmed).length === 65;
  } catch {
    return false;
  }
}

async function requestNotificationPermission(timeoutMs = 90_000): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission !== "default") {
    return Notification.permission;
  }
  try {
    return await withPushTimeout(
      Notification.requestPermission(),
      timeoutMs,
      "permission-timeout"
    );
  } catch {
    return Notification.permission;
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function subscriptionToPayload(subscription: PushSubscription) {
  const p256dh = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: p256dh ? bufferToBase64(p256dh) : "",
      auth: auth ? bufferToBase64(auth) : "",
    },
  };
}

type VapidKeyResponse = {
  publicKey?: string;
  public_key?: string;
  key?: string;
};

export async function resolveVapidPublicKey(): Promise<string> {
  if (VAPID_ENV_KEY?.trim()) {
    return VAPID_ENV_KEY.trim();
  }

  const result = await apiFetch<VapidKeyResponse | string>("/push/vapid-public-key");
  if (!result.ok) {
    throw new Error(result.error || "Clé VAPID indisponible");
  }

  const payload = result.data;
  if (typeof payload === "string") return payload;

  return payload.publicKey || payload.public_key || payload.key || "";
}

export async function sendPushSubscription(subscription: PushSubscription): Promise<void> {
  const result = await apiFetch("/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscriptionToPayload(subscription)),
  });
  if (!result.ok) throw new Error(result.error);
}

/** Ré-enregistre l’abonnement navigateur sur le serveur (JWT requis). */
export async function syncPushSubscriptionToServer(): Promise<void> {
  const registration = await waitForServiceWorkerRegistration(15_000);
  if (!registration?.active) {
    throw new Error(serviceWorkerUnavailableMessage());
  }

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    throw new Error("Aucun abonnement sur cet appareil — touchez « Activer les notifications ».");
  }

  await withPushTimeout(
    sendPushSubscription(subscription),
    15_000,
    "Enregistrement sur le serveur trop long — vérifiez la connexion."
  );
}

export type PushTestResult = {
  sent: number;
  failed: number;
  userId?: number;
  vapidConfigured?: boolean;
  subscriptionCount?: number;
  message?: string;
};

export async function fetchPushStatus(): Promise<{
  userId: number;
  vapidConfigured: boolean;
  subscriptionCount: number;
}> {
  const result = await apiFetch<{
    userId: number;
    vapidConfigured: boolean;
    subscriptionCount: number;
  }>("/push/status");
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function sendTestPushNotification(): Promise<PushTestResult> {
  const result = await apiFetch<PushTestResult>("/push/test", {
    method: "POST",
  });
  if (!result.ok) throw new Error(result.error);
  return result.data ?? { sent: 0, failed: 0 };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const result = await apiFetch("/push/unsubscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
  if (!result.ok) throw new Error(result.error);
}

/** Abonnement push sans hook (bootstrap auth, resync SW). */
export async function subscribePush(): Promise<boolean> {
  if (!getAccessToken()) return false;
  const result = await ensureWebPushSubscription(false);
  return result.ok;
}

/** Après login / refresh session : recréer ou ré-enregistrer la subscription côté serveur. */
export async function resyncPushAfterAuth(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getAccessToken()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) {
      await ensureWebPushSubscription(false);
      return;
    }
    await syncPushSubscriptionToServer();
  } catch {
    /* silencieux au bootstrap */
  }
}

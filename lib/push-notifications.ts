import { apiFetch } from "@/lib/apiClient";

const VAPID_ENV_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

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

/** Attend le SW next-pwa (ne pas enregistrer un second /sw.js). */
const SW_URL = "/sw.js";

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

export async function waitForServiceWorkerRegistration(
  maxWaitMs = 12_000
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const deadline = Date.now() + maxWaitMs;
  const perWaitMs = Math.min(2_500, maxWaitMs);

  while (Date.now() < deadline) {
    let reg = await navigator.serviceWorker.getRegistration("/");
    if (reg?.active) return reg;

    if (!reg && Date.now() > deadline - maxWaitMs + 3_000) {
      try {
        reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
        await raceTimeout(navigator.serviceWorker.ready, perWaitMs);
        reg = await navigator.serviceWorker.getRegistration("/");
        if (reg?.active) return reg;
      } catch {
        /* next-pwa peut prendre le relais */
      }
    }

    await raceTimeout(navigator.serviceWorker.ready, perWaitMs);
    reg = await navigator.serviceWorker.getRegistration("/");
    if (reg?.active) return reg;

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const last = await navigator.serviceWorker.getRegistration("/");
  return last?.active ? last : null;
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

  const { needsPwaInstallForPush } = await import("@/lib/push-device");
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

  const swWaitMs = process.env.NODE_ENV === "development" ? 5_000 : 10_000;
  const registration = await waitForServiceWorkerRegistration(swWaitMs);
  if (!registration?.active) {
    const devHint =
      process.env.NODE_ENV === "development"
        ? " En mode développement, testez avec « npm run build && npm run start » ou sur l'URL de production."
        : "";
    return {
      ok: false,
      reason: "error",
      message: `Service worker indisponible. Rechargez la page ou installez l'application.${devHint}`,
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
  const registration = await waitForServiceWorkerRegistration(12_000);
  if (!registration?.active) {
    throw new Error("Service worker indisponible — rechargez l'application.");
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

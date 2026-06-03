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
export async function waitForServiceWorkerRegistration(
  maxWaitMs = 20_000
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (reg?.active) return reg;

    try {
      await navigator.serviceWorker.ready;
      const ready = await navigator.serviceWorker.getRegistration("/");
      if (ready?.active) return ready;
    } catch {
      /* next-pwa pas encore prêt */
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
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
    expirationTime: subscription.expirationTime,
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
    throw new Error(result.error);
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

export async function removePushSubscription(endpoint: string): Promise<void> {
  const result = await apiFetch("/push/unsubscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
  if (!result.ok) throw new Error(result.error);
}

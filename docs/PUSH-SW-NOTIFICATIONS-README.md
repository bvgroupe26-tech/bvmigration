# Notifications push & Service Worker — BV Groupe RH

Documentation complète des fichiers liés aux **notifications push Web** et au **service worker** dans le projet PWA.

**Date :** juin 2026  
**Frontend :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh`  
**Backend :** `c:\Users\MICHEL_BOUTSINDI\Desktop\bvGrooupebackend`

---

## Table des matières

1. [Architecture rapide](#architecture-rapide)
2. [Service Worker — `worker/index.js`](#1-service-worker--workerindexjs)
3. [Service Worker — `public/sw.js`](#2-service-worker--publicswjs)
4. [Manifest PWA — `app/manifest.ts`](#3-manifest-pwa--appmanifestts)
5. [Abonnement push — `lib/push-notifications.ts`](#4-abonnement-push--libpush-notificationsts)
6. [Abonnement push — `lib/push-device.ts`](#5-abonnement-push--libpush-devicets)
7. [Contexte React — `context/PushNotificationsContext.tsx`](#6-contexte-react--contextpushnotificationscontexttsx)
8. [Hook — `hooks/usePushNotifications.ts`](#7-hook--hooksusepushnotificationsts)
9. [Bannière — `components/push/PushNotificationBanner.tsx`](#8-bannière--componentspushpushnotificationbannertsx)
10. [Racine push — `components/push/PushNotificationsRoot.tsx`](#9-racine-push--componentspushpushnotificationsroottsx)
11. [Profil — `components/pwa/PwaPushSettingsCard.tsx`](#10-profil--componentspwapwapushsettingscardtsx)
12. [Enregistrement SW + PWA — `next.config.ts`](#11-enregistrement-sw--pwa--nextconfigts)
13. [Layout — `app/layout.tsx`](#12-layout--applayouttsx)
14. [Backend envoi — `push-notification.service.ts`](#13-backend-envoi--push-notificationservicets)
15. [Backend API — `push-notification.controller.ts`](#14-backend-api--push-notificationcontrollerts)
16. [Backend module — `push-notifications.module.ts`](#15-backend-module--push-notificationsmodulets)
17. [Backend types — `push-notification.types.ts`](#16-backend-types--push-notificationtypests)
18. [Backend payloads — `notifications-push.util.ts`](#17-backend-payloads--notifications-pushutilts)
19. [Backend dispatch — `notifications.service.ts`](#18-backend-dispatch--notificationsservicets)
20. [Backend DTO — `subscribe-push.dto.ts`](#19-backend-dto--subscribe-pushdtots)
21. [Variables d'environnement](#variables-denvironnement)

---

## Architecture rapide

```
Navigateur
  ├─ Notification.requestPermission()
  ├─ serviceWorker.register("/sw.js")  ← next-pwa (register: true) OU lib/push-notifications.ts
  ├─ registration.pushManager.subscribe(VAPID)
  └─ POST /api/nest/push/subscribe

Backend NestJS
  ├─ webPush.setVapidDetails()
  ├─ Prisma push_subscriptions
  └─ webPush.sendNotification() lors d'une notif métier

Service Worker (worker/index.js → bundlé dans /sw.js en prod)
  ├─ addEventListener("push") → showNotification()
  └─ addEventListener("notificationclick") → focus / openWindow
```

**Note :** Il n’y a pas de `manifest.json` statique. Le manifest est généré par Next.js via `app/manifest.ts` → servi sur `/manifest.webmanifest`.

---

## 1. Service Worker — `worker/index.js`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\worker\index.js`  
**Rôle :** Code custom injecté dans le SW Workbox par `@ducanh2912/next-pwa` (`customWorkerSrc: "worker"`).

```javascript
/* Push notifications — bundlé par next-pwa et importé dans /sw.js en production. */

const DEFAULT_ICON = "/icons/icon-192.png";
const DEFAULT_BADGE = "/icons/icon-192.png";

function assetUrl(path) {
  if (!path || path.startsWith("http://") || path.startsWith("https://")) {
    return path || assetUrl(DEFAULT_ICON);
  }
  return new URL(path, self.location.origin).href;
}
const VAPID_KEY_URL = "/api/nest/push/vapid-public-key";
const SUBSCRIBE_URL = "/api/nest/push/subscribe";

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function subscriptionToJson(subscription) {
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

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function fetchVapidPublicKey() {
  const res = await fetch(VAPID_KEY_URL, { credentials: "include" });
  if (!res.ok) throw new Error("Impossible de récupérer la clé VAPID");
  const json = await res.json();
  const payload = json?.data !== undefined ? json.data : json;
  return (
    payload?.publicKey ||
    payload?.public_key ||
    payload?.key ||
    (typeof payload === "string" ? payload : "")
  );
}

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      try {
        payload = { body: event.data.text() };
      } catch {
        payload = {};
      }
    }
  }

  const data = payload.data || {};
  const title = payload.title || "BV Groupe RH";
  const body = payload.body || "Nouvelle notification";
  const icon = assetUrl(payload.icon || data.icon || DEFAULT_ICON);
  const badge = assetUrl(payload.badge || data.badge || DEFAULT_BADGE);
  const tag = payload.tag || data.tag || "bv-groupe-rh";
  const url = data.url || payload.url || "/notifications";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { url, ...data },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/notifications";
  const targetHref = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetHref);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetHref);
      }
    })()
  );
});

const BV_RH_SYNC_TAG = "bv-rh-sync";
const BV_RH_SYNC_MESSAGE = "BV_RH_SYNC";

self.addEventListener("sync", (event) => {
  if (event.tag !== BV_RH_SYNC_TAG) return;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: BV_RH_SYNC_MESSAGE });
      }
    })()
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const oldSubscription = event.oldSubscription;
      if (oldSubscription) {
        try {
          await fetch(SUBSCRIBE_URL.replace("/subscribe", "/unsubscribe"), {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ endpoint: oldSubscription.endpoint }),
          });
        } catch {
          /* ignore */
        }
      }

      const publicKey = await fetchVapidPublicKey();
      if (!publicKey) return;

      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch(SUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(subscriptionToJson(subscription)),
      });
    })()
  );
});
```

---

## 2. Service Worker — `public/sw.js`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\public\sw.js`  
**Rôle :** Fallback push seul (dev ou si PWA désactivée). En **production**, `next build` génère un `/sw.js` Workbox + import du worker custom.

```javascript
/* Push notifications — chargé via importScripts par next-pwa ou enregistré directement si PWA désactivée. */

const DEFAULT_ICON = "/icons/icon-192.png";
const DEFAULT_BADGE = "/icons/icon-192.png";
const VAPID_KEY_URL = "/api/nest/push/vapid-public-key";
const SUBSCRIBE_URL = "/api/nest/push/subscribe";

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function subscriptionToJson(subscription) {
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

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function fetchVapidPublicKey() {
  const res = await fetch(VAPID_KEY_URL, { credentials: "include" });
  if (!res.ok) throw new Error("Impossible de récupérer la clé VAPID");
  const json = await res.json();
  const payload = json?.data !== undefined ? json.data : json;
  return (
    payload?.publicKey ||
    payload?.public_key ||
    payload?.key ||
    (typeof payload === "string" ? payload : "")
  );
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const data = payload.data || {};
  const title = payload.title || "BV Groupe RH";
  const body = payload.body || "Nouvelle notification";
  const icon = payload.icon || data.icon || DEFAULT_ICON;
  const badge = payload.badge || data.badge || DEFAULT_BADGE;
  const tag = payload.tag || data.tag || "bv-groupe-rh";
  const url = data.url || payload.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url, ...data },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          const clientUrl = new URL(client.url);
          const target = new URL(targetUrl, self.location.origin);
          if (clientUrl.pathname === target.pathname) {
            await client.focus();
            if ("navigate" in client) {
              await client.navigate(target.href);
            }
            return;
          }
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const oldSubscription = event.oldSubscription;
      if (oldSubscription) {
        try {
          await fetch(SUBSCRIBE_URL.replace("/subscribe", "/unsubscribe"), {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ endpoint: oldSubscription.endpoint }),
          });
        } catch {
          /* ignore */
        }
      }

      const publicKey = await fetchVapidPublicKey();
      if (!publicKey) return;

      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch(SUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(subscriptionToJson(subscription)),
      });
    })()
  );
});
```

---

## 3. Manifest PWA — `app/manifest.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\app\manifest.ts`  
**URL servie :** `/manifest.webmanifest` (référencé dans `app/layout.tsx` metadata)

```typescript
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BV Groupe — Gestion RH",
    short_name: "BV Groupe RH",
    description: "Application RH BV Groupe : employés, paie, présences, congés.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#1F3F73",
    theme_color: "#1F3F73",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
```

---

## 4. Abonnement push — `lib/push-notifications.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\lib\push-notifications.ts`  
**Rôle :** `requestPermission`, `pushManager.subscribe`, `serviceWorker.register`, envoi subscription au backend.

```typescript
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

export async function removePushSubscription(endpoint: string): Promise<void> {
  const result = await apiFetch("/push/unsubscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
  if (!result.ok) throw new Error(result.error);
}
```

**Enregistrement SW explicite (ligne clé) :**

```typescript
reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
```

**Abonnement PushManager (ligne clé) :**

```typescript
subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
});
```

---

## 5. Abonnement push — `lib/push-device.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\lib\push-device.ts`

```typescript
import { isIosDevice, isStandaloneMode } from "@/lib/pwa-install";

/** Safari iOS : Web Push uniquement en PWA installée (écran d'accueil). */
export function needsPwaInstallForPush(): boolean {
  if (typeof window === "undefined") return false;
  return isIosDevice() && !isStandaloneMode();
}

export function canUseWebPush(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
```

---

## 6. Contexte React — `context/PushNotificationsContext.tsx`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\context\PushNotificationsContext.tsx`

```typescript
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
import { canUseWebPush, needsPwaInstallForPush } from "@/lib/push-device";
import { PWA_INSTALLED_EVENT } from "@/lib/pwa-install";
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

const SUBSCRIBE_TIMEOUT_MS = 22_000;

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

    const reg = await waitForServiceWorkerRegistration(4_000);
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
      window.removeEventListener(PWA_INSTALLED_EVENT, onPwaInstalled);
    };
  }, [syncSubscriptionState]);

  const subscribe = useCallback(
    async (opts?: { silent?: boolean; requestPermission?: boolean }): Promise<boolean> => {
      if (!isSupported) {
        if (!opts?.silent) toast.error("Notifications push non supportées sur ce navigateur.");
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
    [isSupported, syncSubscriptionState]
  );

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
```

---

## 7. Hook — `hooks/usePushNotifications.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\hooks\usePushNotifications.ts`

```typescript
export { usePushNotifications, PushNotificationsProvider } from "@/context/PushNotificationsContext";
```

---

## 8. Bannière — `components/push/PushNotificationBanner.tsx`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\components\push\PushNotificationBanner.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { dismissPushBanner } from "@/lib/push-notifications";
import { cn } from "@/lib/utils";

const ACTIVATION_SAFETY_MS = 24_000;

type PushNotificationBannerProps = {
  onSubscribe: () => Promise<boolean>;
  onDismiss?: () => void;
  needsInstallFirst?: boolean;
  className?: string;
};

export default function PushNotificationBanner({
  onSubscribe,
  onDismiss,
  needsInstallFirst = false,
  className,
}: PushNotificationBannerProps) {
  const [activating, setActivating] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  useEffect(() => () => clearSafetyTimer(), []);

  const handleDismiss = () => {
    clearSafetyTimer();
    setActivating(false);
    dismissPushBanner();
    onDismiss?.();
  };

  const handleSubscribe = async () => {
    if (activating) return;

    setActivating(true);
    setFailedOnce(false);
    clearSafetyTimer();
    safetyTimerRef.current = setTimeout(() => {
      setActivating(false);
      setFailedOnce(true);
    }, ACTIVATION_SAFETY_MS);

    try {
      const ok = await onSubscribe();
      if (!ok) setFailedOnce(true);
    } catch {
      setFailedOnce(true);
    } finally {
      clearSafetyTimer();
      setActivating(false);
    }
  };

  const buttonLabel = activating
    ? "Activation…"
    : failedOnce
      ? "Réessayer"
      : "Activer les notifications";

  return (
    <div
      role="region"
      aria-label="Activer les notifications push"
      className={cn(
        "sticky top-0 z-[9990] border-b border-[#1F3F73]/15 bg-gradient-to-r from-[#1F3F73] to-[#2F5F9D] px-4 py-3 text-white shadow-md no-print",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Bell className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">Notifications en temps réel</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/80">
              {needsInstallFirst
                ? "Sur iPhone, installez l'app sur l'écran d'accueil pour recevoir les alertes même fermée."
                : "Recevez les alertes RH sur votre appareil, même quand l'application est fermée."}
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          {!needsInstallFirst ? (
            <button
              type="button"
              onClick={() => void handleSubscribe()}
              disabled={activating}
              className="inline-flex min-w-[10.5rem] flex-1 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1F3F73] transition hover:bg-white/90 disabled:opacity-70 sm:flex-none"
            >
              {buttonLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
            aria-label="Ignorer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 9. Racine push — `components/push/PushNotificationsRoot.tsx`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\components\push\PushNotificationsRoot.tsx`

```tsx
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
```

---

## 10. Profil — `components/pwa/PwaPushSettingsCard.tsx`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\components\pwa\PwaPushSettingsCard.tsx`

```tsx
"use client";

import { Bell, Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import GlassCard from "@/components/ui/GlassCard";

export default function PwaPushSettingsCard() {
  const { openPrompt, isStandalone, canNativeInstall, install, installing } = usePwaInstall();
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    needsInstallFirst,
    subscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <GlassCard className="p-4">
        <p className="text-sm text-slate-600">
          Les notifications push ne sont pas prises en charge par ce navigateur.
        </p>
      </GlassCard>
    );
  }

  async function handleEnablePush() {
    const ok = await subscribe({ requestPermission: true });
    if (ok) return;
    if (needsInstallFirst) {
      toast.message("Installez d'abord l'application sur l'écran d'accueil.");
      return;
    }
    if (permission === "denied") {
      toast.error("Autorisez les notifications dans les paramètres du navigateur.");
    }
    /* autres erreurs : toast déjà affiché par subscribe */
  }

  return (
    <GlassCard className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F3F73]/10 text-[#1F3F73]">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-semibold text-slate-900">Application & notifications</h3>
          <p className="mt-1 text-sm text-slate-600">
            {isSubscribed
              ? "Vous recevrez les alertes RH même lorsque l'application est fermée."
              : "Installez l'app et activez les notifications pour ne rien manquer."}
          </p>
        </div>
      </div>

      {!isStandalone ? (
        <button
          type="button"
          onClick={() => {
            if (canNativeInstall) void install();
            else openPrompt();
          }}
          disabled={installing}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1F3F73] transition hover:bg-slate-50 disabled:opacity-60"
        >
          {canNativeInstall ? (
            <Download className="h-4 w-4" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
          {installing ? "Installation…" : "Installer l'application"}
        </button>
      ) : null}

      {!isSubscribed ? (
        <button
          type="button"
          onClick={() => void handleEnablePush()}
          disabled={loading || needsInstallFirst}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F5F9D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1F3F73] disabled:opacity-60"
        >
          <Bell className="h-4 w-4" />
          {loading ? "Activation…" : "Activer les notifications"}
        </button>
      ) : (
        <p className="text-center text-xs font-medium text-green-700">Notifications activées</p>
      )}

      {needsInstallFirst ? (
        <p className="text-xs text-amber-800">
          Sur iPhone : installez l&apos;app via Partager → Sur l&apos;écran d&apos;accueil, puis revenez ici.
        </p>
      ) : null}
    </GlassCard>
  );
}
```

---

## 11. Enregistrement SW — PWA — `next.config.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\next.config.ts`  
**Enregistrement automatique :** `register: true` (next-pwa injecte l’enregistrement de `/sw.js` au build)

```typescript
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const OFFLINE_ASSETS_REVISION = "6";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.DISABLE_PWA === "true",
  register: true,
  sw: "sw.js",
  customWorkerSrc: "worker",
  customWorkerDest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  extendDefaultRuntimeCaching: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    navigateFallback: "/offline",
    navigateFallbackDenylist: [
      /^\/api\//,
      /^\/_next\//,
      /^\/login/,
      /^\/manifest\.webmanifest$/,
      /^\/icons\//,
      /^\/favicon/,
      /\/.*\.[a-zA-Z0-9]+$/,
    ],
    additionalManifestEntries: [
      { url: "/", revision: OFFLINE_ASSETS_REVISION },
      { url: "/offline", revision: OFFLINE_ASSETS_REVISION },
      { url: "/login", revision: OFFLINE_ASSETS_REVISION },
      { url: "/dashboard", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employes", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employes/nouveau", revision: OFFLINE_ASSETS_REVISION },
      { url: "/presence", revision: OFFLINE_ASSETS_REVISION },
      { url: "/paie", revision: OFFLINE_ASSETS_REVISION },
      { url: "/budget", revision: OFFLINE_ASSETS_REVISION },
      { url: "/recrutement", revision: OFFLINE_ASSETS_REVISION },
      { url: "/notifications", revision: OFFLINE_ASSETS_REVISION },
      { url: "/profile", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/dashboard", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/presence", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/leaves", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/documents", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/profile", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/notifications", revision: OFFLINE_ASSETS_REVISION },
      { url: "/employee/paie", revision: OFFLINE_ASSETS_REVISION },
    ],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api/auth/"),
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ sameOrigin, url }) =>
          sameOrigin && url.pathname.startsWith("/api/nest/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "api-nest-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 80,
            maxAgeSeconds: 3600,
          },
        },
      },
      {
        urlPattern: /\/_next\/data\/.*\.json$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "rsc-cache",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 3600,
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|woff|woff2|ttf|otf|eot)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-media-cache",
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 86400,
          },
        },
      },
    ],
  },
});

const DEFAULT_LOCAL_API = "http://127.0.0.1:3001";
const DEFAULT_PROD_API = "https://bv-groupe.onrender.com";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ??
  (process.env.NODE_ENV === "production" ? DEFAULT_PROD_API : DEFAULT_LOCAL_API);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.60"],
  images: {
    unoptimized: true,
  },
  turbopack: {},
  serverExternalPackages: ["better-sqlite3", "electron"],
  async rewrites() {
    const target = apiProxyTarget.replace(/\/$/, "");
    return [
      {
        source: "/uploads/:path*",
        destination: `${target}/uploads/:path*`,
      },
      {
        source: "/api/nest/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
```

---

## 12. Layout — `app/layout.tsx`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\RH\bv-groupe-rh\app\layout.tsx`  
**Montage :** `PushNotificationsProvider` + `PushNotificationsRoot`

```tsx
import type { Metadata } from "next";
import { Syne, JetBrains_Mono, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { TitlebarLayoutShell } from "@/components/Titlebar";
import { AuthProvider } from "@/context/AuthContext";
import { PwaInstallProvider } from "@/context/PwaInstallContext";
import SessionKeeper from "@/components/auth/SessionKeeper";
import PushNotificationsRoot from "@/components/push/PushNotificationsRoot";
import { PushNotificationsProvider } from "@/hooks/usePushNotifications";
import ChunkLoadRecovery from "@/components/pwa/ChunkLoadRecovery";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { SwrOfflineConfig } from "@/components/pwa/SwrOfflineConfig";
import OfflineBanner from "@/components/pwa/OfflineBanner";
import SyncOnReconnect from "@/components/pwa/SyncOnReconnect";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BV GROUPE — Gestion RH",
  description:
    "Plateforme moderne de gestion des ressources humaines : employés, paie, présences, recrutement, compétences.",
  manifest: "/manifest.webmanifest",
  applicationName: "BV Groupe RH",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BV Groupe RH",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#1F3F73",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-slate-100 font-sans text-text-primary antialiased"
        suppressHydrationWarning
      >
        <OfflineBanner />
        <PwaInstallProvider>
          <AuthProvider>
            <PushNotificationsProvider>
              <SwrOfflineConfig>
                <SyncOnReconnect />
                <SessionKeeper />
                <TitlebarLayoutShell>
                  <ChunkLoadRecovery />
                  <PushNotificationsRoot />
                  {children}
                </TitlebarLayoutShell>
              </SwrOfflineConfig>
            </PushNotificationsProvider>
          </AuthProvider>
          <PwaInstallPrompt />
          <Toaster
            theme="light"
            position="top-right"
            richColors
            toastOptions={{
              style: {
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.1)",
                color: "#0f172a",
                boxShadow: "0 10px 40px rgba(15,23,42,0.08)",
              },
              className: "font-sans",
            }}
          />
        </PwaInstallProvider>
      </body>
    </html>
  );
}
```

---

## 13. Backend envoi — `push-notification.service.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\bvGrooupebackend\src\modules\push-notifications\push-notification.service.ts`

```typescript
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushSubscription } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as webPush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import {
  DEFAULT_PUSH_ICON,
  PushNotificationPayload,
} from './types/push-notification.types';

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private vapidConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const mailto = this.config.get<string>('VAPID_MAILTO');

    if (!publicKey || !privateKey || !mailto) {
      this.logger.warn(
        'VAPID non configuré (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_MAILTO) — push Web désactivé',
      );
      return;
    }

    webPush.setVapidDetails(mailto, publicKey, privateKey);
    this.vapidConfigured = true;
    this.logger.log('Web Push VAPID configuré');
  }

  getVapidPublicKey(): string {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    if (!publicKey) {
      throw new ServiceUnavailableException(
        'VAPID_PUBLIC_KEY non configurée sur le serveur',
      );
    }
    return publicKey;
  }

  async subscribe(
    userId: number,
    dto: SubscribePushDto,
  ): Promise<PushSubscription> {
    const keysJson = {
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
    } satisfies Prisma.InputJsonObject;

    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        keys: keysJson,
      },
      update: {
        userId,
        keys: keysJson,
        deletedAt: null,
      },
    });
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async sendPush(
    userId: number,
    payload: PushNotificationPayload,
  ): Promise<{ sent: number; failed: number }> {
    if (!this.vapidConfigured) {
      return { sent: 0, failed: 0 };
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const frontendBase =
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') || '';
    const iconPath = payload.icon || DEFAULT_PUSH_ICON;
    const icon =
      iconPath.startsWith('http://') || iconPath.startsWith('https://')
        ? iconPath
        : `${frontendBase}${iconPath.startsWith('/') ? iconPath : `/${iconPath}`}`;

    const normalized: PushNotificationPayload = {
      title: payload.title,
      body: payload.body.slice(0, 100),
      tag: payload.tag,
      url: payload.url,
      icon: icon || DEFAULT_PUSH_ICON,
    };

    const body = JSON.stringify(normalized);
    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys as webPush.PushSubscription['keys'],
            },
            body,
          );
          sent++;
        } catch (error) {
          failed++;
          await this.handlePushError(subscription.id, error);
        }
      }),
    );

    return { sent, failed };
  }

  private async handlePushError(
    subscriptionId: number,
    error: unknown,
  ): Promise<void> {
    const statusCode =
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      typeof (error as { statusCode: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : undefined;

    if (statusCode === 410 || statusCode === 404) {
      try {
        await this.prisma.pushSubscription.delete({
          where: { id: subscriptionId },
        });
        this.logger.debug(
          `Subscription push #${subscriptionId} supprimée (expirée ${statusCode})`,
        );
      } catch {
        // déjà supprimée
      }
      return;
    }

    this.logger.warn(
      `Échec envoi push subscription #${subscriptionId}`,
      error instanceof Error ? error.message : String(error),
    );
  }
}
```

---

## 14. Backend API — `push-notification.controller.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\bvGrooupebackend\src\modules\push-notifications\push-notification.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiAuthResponses,
  ApiCreatedDataResponse,
  ApiNoContentResponse,
  ApiOkDataResponse,
} from '../../common/swagger/api-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/types/auth.types';
import {
  SubscribePushDto,
  UnsubscribePushDto,
} from './dto/subscribe-push.dto';
import { PushNotificationService } from './push-notification.service';

@ApiTags('push')
@Controller('push')
export class PushNotificationController {
  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Get('vapid-public-key')
  @Public()
  @ApiOperation({
    summary: 'Clé publique VAPID',
    description:
      'Clé nécessaire côté client pour PushManager.subscribe() avant enregistrement.',
  })
  @ApiOkDataResponse('Clé publique VAPID')
  getVapidPublicKey(): { publicKey: string } {
    return {
      publicKey: this.pushNotificationService.getVapidPublicKey(),
    };
  }

  @Post('subscribe')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Enregistrer une subscription Web Push',
    description:
      'Associe l\'endpoint du navigateur au compte connecté (admin ou employé).',
  })
  @ApiBody({ type: SubscribePushDto })
  @ApiCreatedDataResponse('Subscription enregistrée')
  @ApiAuthResponses()
  subscribe(
    @CurrentUser() user: UserPayload,
    @Body() dto: SubscribePushDto,
  ) {
    return this.pushNotificationService.subscribe(user.id, dto);
  }

  @Delete('unsubscribe')
  @HttpCode(204)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Désabonner une subscription Web Push',
    description: 'Retire l\'endpoint pour l\'utilisateur connecté.',
  })
  @ApiBody({ type: UnsubscribePushDto })
  @ApiNoContentResponse()
  @ApiAuthResponses()
  async unsubscribe(
    @CurrentUser() user: UserPayload,
    @Body() dto: UnsubscribePushDto,
  ): Promise<void> {
    await this.pushNotificationService.unsubscribe(user.id, dto.endpoint);
  }
}
```

---

## 15. Backend module — `push-notifications.module.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\bvGrooupebackend\src\modules\push-notifications\push-notifications.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PushNotificationController } from './push-notification.controller';
import { PushNotificationService } from './push-notification.service';

@Module({
  controllers: [PushNotificationController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class PushNotificationsModule {}
```

---

## 16. Backend types — `push-notification.types.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\bvGrooupebackend\src\modules\push-notifications\types\push-notification.types.ts`

```typescript
export interface PushNotificationPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  icon: string;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export const DEFAULT_PUSH_ICON = '/icons/icon-192.png';
```

---

## 17. Backend payloads — `notifications-push.util.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\bvGrooupebackend\src\modules\notifications\notifications-push.util.ts`

```typescript
import { Notification, TypeNotification } from '@prisma/client';
import {
  DEFAULT_PUSH_ICON,
  PushNotificationPayload,
} from '../push-notifications/types/push-notification.types';
import { NotificationMeta } from './types/notification-meta.type';

type PushRecipient = 'user' | 'employe';

export function buildPushPayload(
  titre: string,
  message: string,
  type: TypeNotification,
  meta: NotificationMeta | undefined,
  recipient: PushRecipient,
  notificationId?: number,
): PushNotificationPayload {
  return {
    title: titre,
    body: message.slice(0, 100),
    tag: buildPushTag(type, meta, notificationId),
    url: buildPushUrl(type, meta, recipient),
    icon: DEFAULT_PUSH_ICON,
  };
}

export function buildPushPayloadFromNotification(
  notification: Notification,
  recipient: PushRecipient,
): PushNotificationPayload {
  return buildPushPayload(
    notification.titre,
    notification.message,
    notification.type,
    (notification.meta as NotificationMeta | null) ?? undefined,
    recipient,
    notification.id,
  );
}

function buildPushTag(
  type: TypeNotification,
  meta: NotificationMeta | undefined,
  notificationId?: number,
): string {
  if (meta?.absenceId) {
    return `absence-${meta.absenceId}`;
  }
  if (meta?.paieId) {
    return `paie-${meta.paieId}`;
  }
  if (notificationId) {
    return `notif-${notificationId}`;
  }
  return `notif-${type}-${Date.now()}`;
}

function buildPushUrl(
  type: TypeNotification,
  meta: NotificationMeta | undefined,
  recipient: PushRecipient,
): string {
  if (type === TypeNotification.paie && meta?.paieId) {
    return recipient === 'employe'
      ? `/payslips/${meta.paieId}`
      : `/paie/${meta.paieId}`;
  }

  if (type === TypeNotification.conge && meta?.absenceId) {
    return recipient === 'employe'
      ? '/leaves'
      : `/absences/${meta.absenceId}`;
  }

  if (type === TypeNotification.document) {
    return recipient === 'employe' ? '/documents' : '/documents';
  }

  return '/notifications';
}
```

---

## 18. Backend dispatch — `notifications.service.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\bvGrooupebackend\src\modules\notifications\notifications.service.ts`

```typescript
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Notification, Prisma, TypeNotification, UserRole } from '@prisma/client';
import { PushNotificationService } from '../push-notifications/push-notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPushPayload,
  buildPushPayloadFromNotification,
} from './notifications-push.util';
import { NotificationMeta } from './types/notification-meta.type';

const RH_ROLES: UserRole[] = [UserRole.admin, UserRole.rh, UserRole.manager];

interface CreateNotificationInput {
  employeId?: number;
  userId?: number;
  titre: string;
  message: string;
  type: TypeNotification;
  meta?: NotificationMeta;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async findForUser(userId: number): Promise<Notification[]> {
    const where = await this.buildRecipientWhere(userId);

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countUnreadForUser(userId: number): Promise<number> {
    const where = await this.buildRecipientWhere(userId);

    return this.prisma.notification.count({
      where: { ...where, lu: false },
    });
  }

  async markAsRead(id: number, userId: number): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification #${id} introuvable`);
    }

    const canAccess = await this.canUserAccessNotification(userId, notification);
    if (!canAccess) {
      throw new ForbiddenException('Accès refusé à cette notification');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { lu: true, luAt: new Date() },
    });
  }

  async markAllAsRead(userId: number): Promise<{ updated: number }> {
    const where = await this.buildRecipientWhere(userId);

    const result = await this.prisma.notification.updateMany({
      where: { ...where, lu: false },
      data: { lu: true, luAt: new Date() },
    });

    return { updated: result.count };
  }

  async notifyEmploye(
    employeId: number,
    titre: string,
    message: string,
    type: TypeNotification,
    meta?: NotificationMeta,
  ): Promise<Notification> {
    return this.createNotification({
      employeId,
      titre,
      message,
      type,
      meta,
    });
  }

  async notifyUser(
    userId: number,
    titre: string,
    message: string,
    type: TypeNotification,
    meta?: NotificationMeta,
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      titre,
      message,
      type,
      meta,
    });
  }

  /** Notifie tous les comptes admin, RH et manager. */
  async notifyRhTeam(
    titre: string,
    message: string,
    type: TypeNotification,
    meta?: NotificationMeta,
  ): Promise<number> {
    const staff = await this.prisma.user.findMany({
      where: { role: { in: RH_ROLES } },
      select: { id: true },
    });

    if (staff.length === 0) {
      return 0;
    }

    const result = await this.prisma.notification.createMany({
      data: staff.map((user) => ({
        userId: user.id,
        titre,
        message,
        type,
        meta: meta as Prisma.InputJsonValue | undefined,
      })),
    });

    const pushPayload = buildPushPayload(
      titre,
      message,
      type,
      meta,
      'user',
    );

    for (const user of staff) {
      this.dispatchPushToUser(user.id, pushPayload);
    }

    return result.count;
  }

  async safeNotifyEmploye(
    employeId: number,
    titre: string,
    message: string,
    type: TypeNotification,
    meta?: NotificationMeta,
  ): Promise<void> {
    try {
      await this.notifyEmploye(employeId, titre, message, type, meta);
    } catch (error) {
      this.logger.warn(
        `Notification employé #${employeId} non envoyée`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async safeNotifyRhTeam(
    titre: string,
    message: string,
    type: TypeNotification,
    meta?: NotificationMeta,
  ): Promise<void> {
    try {
      await this.notifyRhTeam(titre, message, type, meta);
    } catch (error) {
      this.logger.warn(
        'Notification équipe RH non envoyée',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async createNotification(
    input: CreateNotificationInput,
  ): Promise<Notification> {
    if (!input.employeId && !input.userId) {
      throw new Error('employeId ou userId requis pour une notification');
    }

    const notification = await this.prisma.notification.create({
      data: {
        employeId: input.employeId,
        userId: input.userId,
        titre: input.titre,
        message: input.message,
        type: input.type,
        meta: input.meta as Prisma.InputJsonValue | undefined,
      },
    });

    this.dispatchPushForNotification(notification, input);

    return notification;
  }

  private dispatchPushForNotification(
    notification: Notification,
    input: CreateNotificationInput,
  ): void {
    if (input.userId) {
      this.dispatchPushToUser(
        input.userId,
        buildPushPayloadFromNotification(notification, 'user'),
      );
      return;
    }

    if (input.employeId) {
      void this.resolveUserIdFromEmployeId(input.employeId)
        .then((userId) => {
          if (!userId) {
            return;
          }
          this.dispatchPushToUser(
            userId,
            buildPushPayloadFromNotification(notification, 'employe'),
          );
        })
        .catch((error) => {
          this.logger.warn(
            `Push employé #${input.employeId} non dispatché`,
            error instanceof Error ? error.message : String(error),
          );
        });
    }
  }

  private dispatchPushToUser(
    userId: number,
    payload: Parameters<PushNotificationService['sendPush']>[1],
  ): void {
    void this.pushNotificationService.sendPush(userId, payload).catch((error) => {
      this.logger.warn(
        `Push Web user #${userId} non envoyé`,
        error instanceof Error ? error.message : String(error),
      );
    });
  }

  private async resolveUserIdFromEmployeId(
    employeId: number,
  ): Promise<number | null> {
    const employe = await this.prisma.employe.findUnique({
      where: { id: employeId },
      select: { email: true },
    });

    if (!employe?.email) {
      return null;
    }

    const user = await this.prisma.user.findFirst({
      where: { email: employe.email },
      select: { id: true },
    });

    return user?.id ?? null;
  }

  private async buildRecipientWhere(
    userId: number,
  ): Promise<Prisma.NotificationWhereInput> {
    const employe = await this.findEmployeByUserIdOptional(userId);
    const or: Prisma.NotificationWhereInput[] = [{ userId }];

    if (employe) {
      or.push({ employeId: employe.id });
    }

    return { OR: or };
  }

  private async canUserAccessNotification(
    userId: number,
    notification: Notification,
  ): Promise<boolean> {
    if (notification.userId === userId) {
      return true;
    }

    if (notification.employeId) {
      const employe = await this.findEmployeByUserIdOptional(userId);
      return employe?.id === notification.employeId;
    }

    return false;
  }

  private async findEmployeByUserIdOptional(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      return null;
    }

    return this.prisma.employe.findFirst({
      where: { email: user.email },
    });
  }
}
```

---

## 19. Backend DTO — `subscribe-push.dto.ts`

**Chemin :** `c:\Users\MICHEL_BOUTSINDI\Desktop\bvGrooupebackend\src\modules\push-notifications\dto\subscribe-push.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class PushSubscriptionKeysDto {
  @ApiProperty({ description: 'Clé p256dh du navigateur (PushManager.subscribe)' })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty({ description: 'Clé auth du navigateur' })
  @IsString()
  @IsNotEmpty()
  auth!: string;
}

export class SubscribePushDto {
  @ApiProperty({
    example: 'https://fcm.googleapis.com/fcm/send/...',
    description: 'URL endpoint renvoyée par PushManager.subscribe()',
  })
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}

export class UnsubscribePushDto {
  @ApiProperty({
    example: 'https://fcm.googleapis.com/fcm/send/...',
    description: 'Endpoint à retirer pour l\'utilisateur connecté',
  })
  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}
```

---

## Variables d'environnement

### Frontend (Vercel)

| Variable | Usage |
|----------|--------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clé publique pour `pushManager.subscribe()` |
| `API_PROXY_TARGET` | Proxy vers Nest |
| `NEXT_PUBLIC_API_URL` | URL API |

### Backend (Render)

| Variable | Usage |
|----------|--------|
| `VAPID_PUBLIC_KEY` | Même clé publique que Vercel |
| `VAPID_PRIVATE_KEY` | Envoi `webPush.sendNotification()` |
| `VAPID_MAILTO` | `mailto:...` pour VAPID |
| `FRONTEND_URL` | URL absolue des icônes push |

### Génération des clés

```bash
npx web-push generate-vapid-keys
```

---

## Fichiers connexes (liste in-app, hors push système)

| Fichier | Rôle |
|---------|------|
| `components/notifications/NotificationsBell.tsx` | Cloche + liste SWR |
| `components/notifications/NotificationsPageClient.tsx` | Page `/notifications` |
| `lib/notification-filters.ts` | Filtres liste |
| `components/employee/EmployeeNotificationsClient.tsx` | Notifs employé |

Ces fichiers gèrent les **notifications in-app** (base de données), pas l’envoi Web Push direct.

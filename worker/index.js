/* Push notifications — bundlé par next-pwa et importé dans /sw.js en production. */

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
  const icon = payload.icon || data.icon || DEFAULT_ICON;
  const badge = payload.badge || data.badge || DEFAULT_BADGE;
  const tag = payload.tag || data.tag || "bv-groupe-rh";
  const url = data.url || payload.url || "/notifications";

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

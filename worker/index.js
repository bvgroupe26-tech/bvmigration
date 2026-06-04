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

function parsePushPayload(event) {
  let payload = {};
  if (!event.data) return payload;
  try {
    payload = event.data.json();
    return payload;
  } catch {
    /* iOS / certains navigateurs */
  }
  try {
    const text = event.data.text();
    if (text) payload = JSON.parse(text);
  } catch {
    payload = {};
  }
  return payload;
}

/** Options compatibles iOS PWA (éviter vibrate/renotify qui peuvent faire échouer showNotification). */
function buildNotificationOptions(payload) {
  const data = payload.data || {};
  const title = payload.title || "BV Groupe RH";
  const body = payload.body || "Nouvelle notification";
  const tag = payload.tag || data.tag || "bv-groupe-rh";
  const url = data.url || payload.url || "/employee/notifications";

  const options = {
    body,
    tag,
    data: { url, ...data },
  };

  try {
    options.icon = assetUrl(DEFAULT_ICON);
    options.badge = assetUrl(DEFAULT_BADGE);
  } catch {
    /* icônes optionnelles */
  }

  return { title, options };
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const payload = parsePushPayload(event);
      const { title, options } = buildNotificationOptions(payload);

      try {
        await self.registration.showNotification(title, options);
        return;
      } catch (err) {
        console.warn("[bv-sw] showNotification (complet) échoué:", err);
      }

      try {
        await self.registration.showNotification(title, {
          body: options.body,
          tag: options.tag,
          data: options.data,
        });
      } catch (err) {
        console.error("[bv-sw] showNotification (minimal) échoué:", err);
        throw err;
      }
    })()
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

      // Cherche un onglet qui correspond déjà à l'URL cible
      for (const client of allClients) {
        const clientUrl = new URL(client.url);
        const target = new URL(targetHref, self.location.origin);
        if (clientUrl.pathname === target.pathname && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(target.href);
          }
          return;
        }
      }

      // Sinon : focus sur n'importe quel onglet ouvert et navigue
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetHref);
          }
          return;
        }
      }

      // Sinon : ouvre un nouvel onglet
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

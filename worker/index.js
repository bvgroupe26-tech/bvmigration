// ============================================
// PUSH NOTIFICATIONS — injecté dans sw.js par next-pwa
// ============================================

const DEFAULT_ICON = "/icons/icon-192.png";
const VAPID_KEY_URL = "/api/nest/push/vapid-public-key";
const SUBSCRIBE_URL = "/api/nest/push/subscribe";
const PUSH_RESYNC_MESSAGE = "BV_PUSH_RESYNC";
const PUSH_NOTIFICATION_CLICK_MESSAGE = "BV_NOTIFICATION_CLICK";

function resolveNotificationPath(rawUrl) {
  const fallback = "/employee/notifications";
  if (!rawUrl || rawUrl === "/") return fallback;
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin !== self.location.origin) return fallback;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path.startsWith("/") ? path : fallback;
  } catch {
    return typeof rawUrl === "string" && rawUrl.startsWith("/") ? rawUrl : fallback;
  }
}

async function openNotificationTarget(rawUrl) {
  const path = resolveNotificationPath(rawUrl);
  const urlToOpen = new URL(path, self.location.origin).href;

  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clientList) {
    if (!client.url.startsWith(self.location.origin)) continue;
    if ("focus" in client) {
      await client.focus();
      client.postMessage({ type: PUSH_NOTIFICATION_CLICK_MESSAGE, url: path });
      if ("navigate" in client) {
        try {
          await client.navigate(urlToOpen);
          return;
        } catch {
          /* iOS PWA : navigate souvent indisponible */
        }
      }
      return;
    }
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(urlToOpen);
  }
}

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

function notifyClientsPushResync() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: PUSH_RESYNC_MESSAGE });
    }
  });
}

// Réception du push
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "BV Groupe RH",
      body: event.data.text(),
    };
  }

  const payloadData = data.data || {};
  const title = data.title || "BV Groupe RH";
  const url = payloadData.url || data.url || "/employee/notifications";

  const options = {
    body: data.body || "",
    icon: data.icon || payloadData.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_ICON,
    tag: data.tag || payloadData.tag || "bv-groupe-rh",
    data: {
      url,
      timestamp: Date.now(),
      ...payloadData,
    },
    actions: [{ action: "open-notifications", title: "Voir les alertes" }],
  };

  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(title, options);
      } catch {
        await self.registration.showNotification(title, {
          body: options.body,
          tag: options.tag,
          data: options.data,
          icon: options.icon,
        });
      }
    })()
  );
});

// Clic sur la notification (corps, icône ou action)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/employee/notifications";

  event.waitUntil(openNotificationTarget(rawUrl));
});

// Renouvellement automatique de subscription
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

      await notifyClientsPushResync();
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

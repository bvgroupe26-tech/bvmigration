/** Message posté par le service worker au clic sur une notification push. */
export const PUSH_NOTIFICATION_CLICK_MESSAGE = "BV_NOTIFICATION_CLICK";

export function resolvePushNotificationPath(rawUrl: string | undefined, origin: string): string {
  const fallback = "/employee/notifications";
  if (!rawUrl || rawUrl === "/") return fallback;

  try {
    const parsed = new URL(rawUrl, origin);
    if (parsed.origin !== origin) return fallback;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path.startsWith("/") ? path : fallback;
  } catch {
    return rawUrl.startsWith("/") ? rawUrl : fallback;
  }
}

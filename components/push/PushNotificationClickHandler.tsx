"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PUSH_NOTIFICATION_CLICK_MESSAGE } from "@/lib/push-navigation";

/** Navigation in-app quand l'utilisateur touche une notification push (PWA / iOS). */
export default function PushNotificationClickHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== PUSH_NOTIFICATION_CLICK_MESSAGE) return;
      const path =
        typeof event.data.url === "string" && event.data.url.startsWith("/")
          ? event.data.url
          : "/employee/notifications";
      router.push(path);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}

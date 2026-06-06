"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { wasPushBannerDismissed } from "@/lib/push-notifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import PushNotificationBanner from "@/components/push/PushNotificationBanner";
import { cn } from "@/lib/utils";

function isElectron(): boolean {
  return typeof window !== "undefined" && (window as Window & { electronAPI?: unknown }).electronAPI != null;
}

function useHasBottomNav(pathname: string): boolean {
  return (
    pathname.startsWith("/employee") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/employes") ||
    pathname.startsWith("/presence") ||
    pathname.startsWith("/paie") ||
    pathname.startsWith("/statistiques") ||
    pathname.startsWith("/budget") ||
    pathname.startsWith("/recrutement") ||
    pathname.startsWith("/competences") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/profile")
  );
}

/** Bannière push — activation uniquement au clic (pas d’auto-abonnement en arrière-plan). */
export default function PushNotificationsRoot() {
  const pathname = usePathname() || "";
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isSupported, isSubscribed, permission, needsInstallFirst, subscribe } =
    usePushNotifications();
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const hasBottomNav = useHasBottomNav(pathname);

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
    <AnimatePresence>
      <motion.div
        key="push-banner"
        role="presentation"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className={cn(
          "no-print fixed inset-x-4 z-[9990] mx-auto max-w-md sm:inset-x-auto sm:right-6 sm:left-auto",
          hasBottomNav
            ? "bottom-[calc(var(--shell-bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)]"
            : "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
        )}
      >
        <PushNotificationBanner
          onSubscribe={async () => {
            const ok = await subscribe({ silent: false, requestPermission: true });
            if (ok) setBannerDismissed(true);
            return ok;
          }}
          onDismiss={() => setBannerDismissed(true)}
          needsInstallFirst={needsInstallFirst}
        />
      </motion.div>
    </AnimatePresence>
  );
}

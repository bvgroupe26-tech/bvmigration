"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAccessToken, trySilentRefresh } from "@/lib/authClient";
import { shouldRefreshAccessToken } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/", "/login"]);
/** Pages publiques à préfixe (vérification QR d'un bulletin). */
const PUBLIC_PREFIXES = ["/verify/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Intervalle de vérification pendant que l'app est au premier plan (JWT courts ~2–15 min). */
const CHECK_INTERVAL_MS = 60_000;

/**
 * Maintient la session active : refresh au retour dans l'app et avant expiration du JWT.
 */
export default function SessionKeeper() {
  const pathname = usePathname() || "/";
  const { isAuthenticated, refreshSession } = useAuth();
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || isPublicPath(pathname)) return;

    const runRefresh = async () => {
      if (refreshingRef.current) return;
      const token = getAccessToken();
      if (token && !shouldRefreshAccessToken(token)) return;

      refreshingRef.current = true;
      try {
        const next = await trySilentRefresh();
        if (next) {
          await refreshSession();
        }
      } catch {
        /* AuthContext / apiClient gèrent la déconnexion si refresh impossible */
      } finally {
        refreshingRef.current = false;
      }
    };

    const onResume = () => {
      if (document.visibilityState !== "visible") return;
      void runRefresh();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void runRefresh();
    }, CHECK_INTERVAL_MS);

    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
    };
  }, [isAuthenticated, pathname, refreshSession]);

  return null;
}

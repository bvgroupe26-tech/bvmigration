"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOfflineDataSummary } from "@/lib/offline-data-summary";
import {
  getDisplayName,
  readCachedProfile,
  readLastRoute,
} from "@/lib/session-storage";
import { getHomeRouteByRole } from "@/lib/session";

function resolveReturnRoute(profile: ReturnType<typeof readCachedProfile>): string {
  return readLastRoute() ?? (profile ? getHomeRouteByRole(profile.role) : "/dashboard");
}

const PING_URL = "/api/nest/health";
const PING_INTERVAL_MS = 8000;

export default function OfflinePage() {
  const [cachedProfile, setCachedProfile] = useState<ReturnType<typeof readCachedProfile>>(null);
  const [dataSummary, setDataSummary] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const profile = readCachedProfile();
    setCachedProfile(profile);
    void getOfflineDataSummary().then(setDataSummary);
  }, []);

  const displayName = useMemo(
    () => (cachedProfile ? getDisplayName(cachedProfile) : null),
    [cachedProfile]
  );

  const returnRoute = useMemo(
    () => resolveReturnRoute(cachedProfile),
    [cachedProfile]
  );

  const redirectBack = useCallback(() => {
    const target = resolveReturnRoute(readCachedProfile());
    window.location.href = target;
  }, []);

  // Ping le backend toutes les 8s pour détecter le réveil (Render free tier)
  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        const res = await fetch(PING_URL, { cache: "no-store", signal: AbortSignal.timeout(6000) });
        if (!cancelled && res.ok) {
          redirectBack();
        }
      } catch {
        /* backend encore endormi, on réessaie */
      }
    };

    void ping();
    intervalRef.current = setInterval(() => { void ping(); }, PING_INTERVAL_MS);

    const onOnline = () => { void ping(); };
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("online", onOnline);
    };
  }, [redirectBack]);

  const handleReload = useCallback(() => {
    setChecking(true);
    fetch(PING_URL, { cache: "no-store", signal: AbortSignal.timeout(10000) })
      .then((res) => { if (res.ok) redirectBack(); else setChecking(false); })
      .catch(() => setChecking(false));
  }, [redirectBack]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="font-display text-2xl font-bold text-slate-900">Hors ligne</h1>

        {cachedProfile && displayName ? (
          <>
            <p className="mt-3 text-sm text-slate-700">
              Bonjour <span className="font-semibold text-[#1F3F73]">{displayName}</span>, vous êtes
              hors ligne.
            </p>
            {dataSummary ? (
              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Dernières données en cache : {dataSummary}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">
              {checking ? "Connexion au serveur en cours…" : "Reconnexion automatique en cours…"}
            </p>
            <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={redirectBack}
                className="rounded-xl bg-[#1B3A6B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2B5EA7]"
              >
                Retourner au tableau de bord
              </button>
              <button
                type="button"
                onClick={handleReload}
                disabled={checking}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {checking ? "Vérification…" : "Recharger"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Connexion indisponible ou cache non prêt. Vérifiez le réseau, puis connectez-vous pour
              accéder à l&apos;application.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => { window.location.href = "/login"; }}
                className="rounded-xl bg-[#1B3A6B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2B5EA7]"
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={handleReload}
                disabled={checking}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {checking ? "Vérification…" : "Recharger"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

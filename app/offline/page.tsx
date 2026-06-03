"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function OfflinePage() {
  const router = useRouter();
  const [cachedProfile, setCachedProfile] = useState<ReturnType<typeof readCachedProfile>>(null);
  const [dataSummary, setDataSummary] = useState<string | null>(null);

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

  useEffect(() => {
    const onOnline = () => {
      const target = resolveReturnRoute(readCachedProfile());
      router.push(target);
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [router]);

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
            <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => router.push(returnRoute)}
                className="rounded-xl bg-[#1B3A6B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2B5EA7]"
              >
                Retourner au tableau de bord
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Recharger
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
                onClick={() => router.push("/login")}
                className="rounded-xl bg-[#1B3A6B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2B5EA7]"
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Recharger
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getHomeRouteByRole } from "@/lib/session";

/** Durée minimale d'affichage du splash (ms) */
const MIN_DISPLAY_MS = 2400;

export default function WelcomeSplash() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [canLeave, setCanLeave] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current ??= Date.now();
    if (isLoading) return;
    const wait = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt.current));
    const timer = window.setTimeout(() => setCanLeave(true), wait);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!canLeave) return;
    if (isAuthenticated && user) {
      router.replace(getHomeRouteByRole(user.role));
      return;
    }
    router.replace("/login");
  }, [canLeave, isAuthenticated, user, router]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1F3F73] via-[#2F5F9D] to-[#0A0F1E] px-6 text-center text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -left-24 top-1/4 h-64 w-64 rounded-full bg-[#F2C94C]/20 blur-3xl" />
        <div className="absolute -right-16 bottom-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="bv-welcome-logo-spin rounded-3xl bg-white/10 p-3 shadow-2xl ring-1 ring-white/20 backdrop-blur-sm">
          <Image
            src="/logo.png"
            alt="BV Groupe"
            width={112}
            height={112}
            className="rounded-2xl"
            priority
          />
        </div>

        <h1 className="mt-10 font-display text-[26px] font-bold leading-tight tracking-tight sm:text-3xl">
          Bienvenue à BV Groupe
        </h1>
        <p className="mt-2 text-sm font-medium text-white/75 sm:text-base">
          Votre espace de gestion des ressources humaines
        </p>

        <div className="mt-10 flex items-center gap-2 text-xs text-white/50">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#F2C94C]" />
          Chargement…
        </div>
      </div>
    </div>
  );
}

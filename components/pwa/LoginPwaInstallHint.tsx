"use client";

import Image from "next/image";
import { Download, Share, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export default function LoginPwaInstallHint() {
  const {
    isStandalone,
    platform,
    platformLabel,
    inAppBrowser,
    canNativeInstall,
    install,
    installing,
    openPrompt,
  } = usePwaInstall();

  if (isStandalone) return null;

  const handleAction = () => {
    if (canNativeInstall) void install();
    else openPrompt();
  };

  return (
    <div className="mb-6 w-full rounded-2xl border border-[#2F5F9D]/25 bg-gradient-to-br from-[#1F3F73]/8 to-[#2F5F9D]/10 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow ring-1 ring-slate-200/80">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2F5F9D]">
            Application mobile
          </p>
          <h3 className="font-display text-base font-bold text-[#1F3F73]">
            Installer BV Groupe RH
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {inAppBrowser
              ? "Ouvrez cette page dans Safari ou Chrome pour installer l'app."
              : platform === "ios"
                ? "Ajoutez l'app à l'écran d'accueil pour les notifications et un accès rapide."
                : "Installez l'app sur votre appareil pour un accès direct et les alertes hors ligne."}
          </p>
          <p className="mt-1 text-[10px] font-medium text-slate-500">{platformLabel}</p>
        </div>
      </div>

      {platform === "ios" && !canNativeInstall && !inAppBrowser ? (
        <ol className="mt-3 space-y-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-[11px] text-slate-700">
          <li className="flex items-center gap-2">
            <Share className="h-3.5 w-3.5 shrink-0 text-[#2F5F9D]" />
            <span>
              <strong>Partager</strong> → <strong>Sur l&apos;écran d&apos;accueil</strong>
            </span>
          </li>
        </ol>
      ) : null}

      <button
        type="button"
        onClick={handleAction}
        disabled={installing || inAppBrowser}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F5F9D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1F3F73] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {canNativeInstall ? (
          <Download className="h-4 w-4" />
        ) : (
          <Smartphone className="h-4 w-4" />
        )}
        {installing
          ? "Installation…"
          : canNativeInstall
            ? "Installer maintenant"
            : "Voir les instructions"}
      </button>
    </div>
  );
}

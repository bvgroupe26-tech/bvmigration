"use client";

import Image from "next/image";
import { Download, MoreVertical, Share, Smartphone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { cn } from "@/lib/utils";

export default function PwaInstallPrompt() {
  const {
    visible,
    installing,
    platform,
    platformLabel,
    isIos,
    isMobile,
    inAppBrowser,
    canNativeInstall,
    install,
    dismiss,
  } = usePwaInstall();
  const pathname = usePathname() || "";
  const isLoginPage = pathname === "/login";
  const hasBottomNav =
    pathname.startsWith("/employee") ||
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/employes") ||
      pathname.startsWith("/presence") ||
      pathname.startsWith("/paie") ||
      pathname.startsWith("/statistiques") ||
      pathname.startsWith("/budget") ||
      pathname.startsWith("/recrutement") ||
      pathname.startsWith("/competences"));

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-[2px] no-print"
            onClick={dismiss}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-labelledby="pwa-install-title"
            aria-describedby="pwa-install-desc"
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "fixed inset-x-4 z-[9999] mx-auto max-w-md no-print sm:inset-x-auto sm:right-8 sm:left-auto",
              hasBottomNav
                ? "bottom-[calc(var(--shell-bottom-nav-height)+env(safe-area-inset-bottom,0px)+1rem)] lg:bottom-8"
                : isLoginPage
                  ? "bottom-4 max-h-[min(70dvh,520px)] overflow-y-auto sm:bottom-6"
                  : "bottom-4 sm:bottom-8"
            )}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15">
              <div className="relative bg-gradient-to-br from-[#1F3F73] to-[#2F5F9D] px-5 pb-4 pt-5 text-white">
                <button
                  type="button"
                  onClick={dismiss}
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg ring-2 ring-white/30">
                    <Image
                      src="/icons/icon-192.png"
                      alt="BV Groupe RH"
                      width={56}
                      height={56}
                      className="h-14 w-14 object-contain"
                      priority
                    />
                  </div>
                  <div className="min-w-0 pr-8">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                      BV Groupe RH
                    </p>
                    <h2 id="pwa-install-title" className="font-display text-lg font-bold leading-tight">
                      Installer l&apos;application
                    </h2>
                    <p className="mt-1 text-xs font-medium text-white/90">{platformLabel}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4">
                <p id="pwa-install-desc" className="text-sm leading-relaxed text-slate-600">
                  Installez <strong className="text-slate-900">BV Groupe RH</strong> sur votre appareil pour un
                  accès direct, une icône sur l&apos;écran d&apos;accueil
                  {isIos ? " et les notifications en arrière-plan" : " et une expérience plein écran"}.
                </p>

                {inAppBrowser ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                    <p className="font-medium">Ouvrez dans Safari ou Chrome</p>
                    <p className="mt-1">
                      L&apos;installation n&apos;est pas disponible depuis cette application (Facebook, Instagram…).
                      Utilisez le menu <strong>Ouvrir dans le navigateur</strong>.
                    </p>
                  </div>
                ) : platform === "ios" && !canNativeInstall ? (
                  <ol className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <Share className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5F9D]" />
                      <span>
                        Appuyez sur <strong>Partager</strong> en bas de Safari
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5F9D]" />
                      <span>
                        Choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Image
                        src="/icons/apple-touch-icon.png"
                        alt=""
                        width={16}
                        height={16}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded object-contain"
                        aria-hidden
                      />
                      <span>
                        Confirmez — le logo <strong>BV Groupe</strong> apparaîtra sur votre écran
                      </span>
                    </li>
                  </ol>
                ) : platform === "android" && !canNativeInstall ? (
                  <ol className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5F9D]" />
                      <span>
                        Appuyez sur le menu <strong>⋮</strong> en haut à droite de Chrome
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5F9D]" />
                      <span>
                        Choisissez <strong>Installer l&apos;application</strong> ou{" "}
                        <strong>Ajouter à l&apos;écran d&apos;accueil</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5F9D]" />
                      <span>
                        Validez — l&apos;icône <strong>BV Groupe RH</strong> sera sur votre écran d&apos;accueil
                      </span>
                    </li>
                  </ol>
                ) : canNativeInstall ? (
                  <button
                    type="button"
                    onClick={() => void install()}
                    disabled={installing}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F5F9D] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1F3F73] disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {installing ? "Installation…" : "Installer maintenant"}
                  </button>
                ) : platform === "desktop" ? (
                  <ol className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5F9D]" />
                      <span>
                        Cliquez sur l&apos;icône <strong>Installer</strong> dans la barre d&apos;adresse (Chrome / Edge)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5F9D]" />
                      <span>
                        Ou menu <strong>⋮</strong> → <strong>Installer l&apos;application BV Groupe RH</strong>
                      </span>
                    </li>
                  </ol>
                ) : null}

                <button
                  type="button"
                  onClick={dismiss}
                  className="w-full py-1 text-center text-xs font-medium text-slate-400 transition hover:text-slate-600"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

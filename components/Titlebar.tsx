"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Building2, Minus, Square, X } from "lucide-react";

declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data: unknown) => void;
      receive: (channel: string, callback: (...args: unknown[]) => void) => () => void;
      invoke: (channel: string, data: unknown) => Promise<unknown>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

const TITLEBAR_H = 36;

function isElectron(): boolean {
  return typeof window !== "undefined" && window.electronAPI != null;
}

export default function Titlebar() {
  return (
    <header
      className="fixed left-0 right-0 top-0 z-[9999] flex h-9 w-full select-none items-center justify-between border-b border-slate-200 bg-white px-3 text-[13px] text-slate-800"
      style={{ WebkitAppRegion: "drag" } as CSSProperties}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0 text-[#2F5F9D]" aria-hidden />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-display font-bold tracking-tight text-slate-900">BV GROUPE</span>
          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            GESTION RH
          </span>
        </div>
      </div>

      <div className="flex h-full items-stretch" style={{ WebkitAppRegion: "no-drag" } as CSSProperties}>
        <button
          type="button"
          aria-label="Réduire"
          className="flex w-11 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
          onClick={() => window.electronAPI?.minimize()}
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label="Agrandir ou restaurer"
          className="flex w-11 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
          onClick={() => window.electronAPI?.maximize()}
        >
          <Square className="h-3 w-3" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          aria-label="Fermer"
          className="flex w-11 items-center justify-center text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
          onClick={() => window.electronAPI?.close()}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}

/** Enveloppe racine : barre de titre + décalage du contenu uniquement sous Electron. */
export function TitlebarLayoutShell({ children }: { children: ReactNode }) {
  const [electron, setElectron] = useState(false);

  useEffect(() => {
    setElectron(isElectron());
  }, []);

  return (
    <>
      {electron ? <Titlebar /> : null}
      <div style={{ paddingTop: electron ? TITLEBAR_H : 0 }} className="min-h-screen">
        {children}
      </div>
    </>
  );
}

import Link from "next/link";
import { Building2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-[#070B17] py-10 px-6 lg:px-8">
      {/* Séparateur lumineux */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2F5F9D]/40 to-transparent" />

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#2F5F9D] to-[#1F3F73]">
            <Building2 className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-bold tracking-tight text-white">
              BV GROUPE
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2F5F9D]">
              Gestion RH
            </span>
          </div>
        </Link>

        <p className="text-xs text-text-tertiary">
          © {new Date().getFullYear()} BV GROUPE — Gestion RH. Tous droits réservés.
        </p>

        <div className="flex items-center gap-4 text-xs text-text-tertiary">
          <span>v1.0.0</span>
          <span className="h-1 w-1 rounded-full bg-text-tertiary/40" />
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 status-dot-pulse" />
            En ligne
          </span>
        </div>
      </div>
    </footer>
  );
}

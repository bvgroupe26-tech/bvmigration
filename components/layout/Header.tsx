"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { useMemo } from "react";

const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  dashboard: "Dashboard",
  statistiques: "Statistiques & performance",
  employes: "Employés",
  nouveau: "Nouveau",
  presence: "Présence",
  absences: "Absences",
  paie: "Paie",
  recrutement: "Recrutement",
  "nouvelle-offre": "Nouvelle offre",
  candidature: "Candidature",
  competences: "Compétences",
  evaluations: "Évaluations",
  nouvelle: "Nouvelle",
  budget: "Budget",
  categories: "Catégories",
  enveloppes: "Enveloppes",
  depenses: "Dépenses",
  login: "Connexion",
  register: "Inscription",
};

function labelizeSegment(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  if (/^\d+$/.test(segment)) return `#${segment}`;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default function Header() {
  const pathname = usePathname() || "/";

  const segments = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname]
  );

  const title = segments.length === 0 ? "Dashboard RH" : labelizeSegment(segments[segments.length - 1]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="h-0.5 bg-gradient-to-r from-[#1F3F73] via-[#2F5F9D] to-[#F2C94C]" />
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <nav className="flex min-h-4 items-center gap-1.5 text-xs leading-tight text-slate-500">
            <Link href="/dashboard" className="transition hover:text-[#2F5F9D]">
              Accueil
            </Link>
            {segments.map((seg, idx) => {
              const href = "/" + segments.slice(0, idx + 1).join("/");
              const isLast = idx === segments.length - 1;
              return (
                <span key={href} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3 text-slate-300" />
                  {isLast ? (
                    <span className="font-medium text-slate-700">{labelizeSegment(seg)}</span>
                  ) : (
                    <Link href={href} className="transition hover:text-[#2F5F9D]">
                      {labelizeSegment(seg)}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
          <h1 className="truncate font-display text-[22px] font-bold leading-tight tracking-tight text-[#1F3F73] sm:text-[24px]">
            {title}
          </h1>
        </div>

        <button
          type="button"
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#2F5F9D]/30 hover:bg-[#E8F0FA] hover:text-[#1F3F73]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

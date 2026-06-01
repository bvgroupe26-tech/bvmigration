"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import NotificationsBell from "@/components/notifications/NotificationsBell";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import { cn, getAvatarGradient, getInitials } from "@/lib/utils";

const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  dashboard: "Dashboard",
  notifications: "Notifications",
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
  profile: "Mon profil",
};

function labelizeSegment(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  if (/^\d+$/.test(segment)) return `#${segment}`;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

type HeaderProps = {
  desktop?: boolean;
};

export default function Header({ desktop = false }: HeaderProps) {
  const pathname = usePathname() || "/";
  const { user } = useAuth();
  const { photoUrl } = useProfilePhoto();
  const initials = user ? getInitials(user.nom, user.prenom) : "RH";
  const gradient = user ? getAvatarGradient(`${user.prenom}${user.nom}`) : "from-[#2F5F9D] to-[#1F3F73]";

  const segments = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname]
  );

  const title = segments.length === 0 ? "Dashboard RH" : labelizeSegment(segments[segments.length - 1]);

  return (
    <header
      className={cn(
        "z-20 shrink-0 border-b border-slate-200 bg-white pt-safe",
        desktop ? "static" : "sticky top-0"
      )}
    >
      <div className="h-0.5 bg-gradient-to-r from-[#1F3F73] via-[#2F5F9D] to-[#F2C94C]" />
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6",
          desktop && "px-8"
        )}
      >
        <div className="min-w-0 flex-1">
          <nav
            className={cn(
              "min-h-4 items-center gap-1.5 text-xs leading-tight text-slate-500",
              desktop ? "flex" : "hidden sm:flex"
            )}
          >
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
          <h1
            className={cn(
              "truncate font-display font-bold leading-tight tracking-tight text-[#1F3F73]",
              desktop ? "text-[24px]" : "text-lg sm:text-[22px]"
            )}
          >
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationsBell context="admin" />
          {user && (
            <Link
              href="/profile"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-display text-sm font-bold text-white shadow-sm ring-2 ring-white transition hover:ring-[#2F5F9D]/30",
                !photoUrl && gradient,
                pathname.startsWith("/profile") && "ring-[#2F5F9D]"
              )}
              aria-label="Mon profil"
              title="Mon profil"
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

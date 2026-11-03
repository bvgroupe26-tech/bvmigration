"use client";

import { motion } from "framer-motion";
import {
  UserPlus,
  CalendarOff,
  FileText,
  GraduationCap,
  ChartLine,
  Activity,
  Wallet,
  Briefcase,
  Award,
  type LucideIcon,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Skeleton from "@/components/ui/Skeleton";
import Avatar from "@/components/ui/Avatar";
import { useDashboardActivite } from "@/hooks/api";
import type { ActiviteLog } from "@/lib/types";

const ICON_BY_TYPE: Record<string, { icon: LucideIcon; cls: string }> = {
  employe_ajout: { icon: UserPlus, cls: "bg-emerald-100 text-emerald-800" },
  employe_maj: { icon: UserPlus, cls: "bg-[#E8F0FA] text-[#1F3F73]" },
  employe_suppression: { icon: UserPlus, cls: "bg-red-100 text-red-800" },
  paie_generee: { icon: Wallet, cls: "bg-amber-100 text-amber-900" },
  paie_payee: { icon: Wallet, cls: "bg-emerald-100 text-emerald-800" },
  paie_statut: { icon: Wallet, cls: "bg-[#E8F0FA] text-[#1F3F73]" },
  paie_manuelle: { icon: Wallet, cls: "bg-[#E8F0FA] text-[#1F3F73]" },
  offre_creee: { icon: Briefcase, cls: "bg-[#E8F0FA] text-[#2F5F9D]" },
  offre_fermee: { icon: Briefcase, cls: "bg-slate-100 text-slate-700" },
  offre_pourvue: { icon: Briefcase, cls: "bg-emerald-50 text-emerald-800" },
  candidature_recue: { icon: FileText, cls: "bg-[#E8F0FA] text-[#2F5F9D]" },
  absence_demande: { icon: CalendarOff, cls: "bg-amber-50 text-amber-900" },
  absence_approuve: { icon: CalendarOff, cls: "bg-emerald-50 text-emerald-800" },
  absence_refuse: { icon: CalendarOff, cls: "bg-red-50 text-red-800" },
  presence_enregistree: { icon: Activity, cls: "bg-[#E8F0FA] text-[#2F5F9D]" },
  competence_ajout: { icon: GraduationCap, cls: "bg-[#E8F0FA] text-[#1F3F73]" },
  formation_ajout: { icon: Award, cls: "bg-[#E8F0FA] text-[#2F5F9D]" },
  evaluation_ajout: { icon: ChartLine, cls: "bg-[#E8F0FA] text-[#1F3F73]" },
};

function relativeTime(iso?: string | null): string {
  if (!iso) return "date inconnue";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "date invalide";
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return date.toLocaleDateString("fr-FR");
}

export default function ActiviteFeed() {
  const { activites, isLoading } = useDashboardActivite();

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900">Activité récente</h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {isLoading ? "Chargement..." : `${activites.length} évènements`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : activites.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <Activity className="mx-auto h-7 w-7 text-text-tertiary" />
          <p className="mt-2 text-sm text-text-secondary">Aucune activité pour l&apos;instant</p>
          <p className="text-xs text-text-tertiary">
            Les actions sur l&apos;app apparaîtront ici en temps réel.
          </p>
        </div>
      ) : (
        <div className="relative mt-5 max-h-[480px] overflow-y-auto pr-1">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
          <ul className="space-y-3.5">
            {activites.map((act: ActiviteLog, idx) => {
              const def = ICON_BY_TYPE[act.type] ?? { icon: Activity, cls: "bg-slate-100 text-slate-700" };
              const Icon = def.icon;
              return (
                <motion.li
                  key={act.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.04 }}
                  className="relative flex items-start gap-3"
                >
                  <div className="relative shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-white ${def.cls}`}>
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="text-sm leading-snug text-slate-600">
                      {act.employe_nom && act.employe_prenom && (
                        <Avatar
                          nom={act.employe_nom}
                          prenom={act.employe_prenom}
                          size="xs"
                          className="mr-1.5 inline-block align-middle"
                        />
                      )}
                      <span className="text-slate-900">{act.description}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">{relativeTime(act.created_at)}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}

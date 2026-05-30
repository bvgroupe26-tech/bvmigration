"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Inbox } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Skeleton from "@/components/ui/Skeleton";
import StatBadge from "@/components/ui/StatBadge";
import { useDashboardRecrutements } from "@/hooks/api";

export default function RecrutementsListe() {
  const { recrutements, isLoading } = useDashboardRecrutements();
  const items = Array.isArray(recrutements) ? recrutements : [];

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900">
            Recrutements en cours
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {isLoading ? "Chargement..." : `${items.length} offres ouvertes`}
          </p>
        </div>
        <Link href="/recrutement" className="text-xs font-semibold text-[#2F5F9D] transition hover:text-[#1F3F73]">
          Gérer →
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <Inbox className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">Aucune offre ouverte</p>
          <Link href="/recrutement" className="mt-2 inline-block text-xs font-semibold text-[#2F5F9D] hover:text-[#1F3F73]">
            Publier une offre →
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((r, idx) => {
            const cible = r.cible_candidats || 1;
            const ratio = Math.min(100, Math.round((r.candidats_count / cible) * 100));
            const barColor =
              ratio >= 100
                ? "from-emerald-600 to-emerald-500"
                : ratio >= 70
                  ? "from-[#2F5F9D] to-[#1F3F73]"
                  : ratio >= 40
                    ? "from-[#2F5F9D]/80 to-[#2F5F9D]/50"
                    : "from-[#F2C94C] to-amber-500";

            return (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/recrutement/${r.id}`} className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F0FA] text-[#2F5F9D]">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{r.titre}</p>
                      <p className="text-xs text-slate-500">{r.departement}</p>
                    </div>
                  </Link>
                  <StatBadge variant="ouverte" size="sm">
                    ouverte
                  </StatBadge>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      <span className="font-mono font-semibold text-slate-900">{r.candidats_count}</span>
                      <span className="text-slate-500"> / {cible} candidats</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-900">{ratio}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio}%` }}
                      transition={{ duration: 1, delay: 0.15 + idx * 0.05, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r ${barColor}`}
                    />
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}

"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Users,
  Wallet,
  TrendingUp,
  ChevronDown,
  CheckCircle2,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import AnimatedWord from "./AnimatedWord";
import AnimatedCounter from "./AnimatedCounter";

export type HeroEmployePreview = {
  nom: string;
  prenom: string;
  poste: string | null;
  statut: string;
};

type PresenceChartPoint = {
  mois: string;
  presents: number;
  absents: number;
};

type HeroSectionProps = {
  publicStats?: {
    total_employes: number;
    masse_salariale: number;
    presents_aujourd_hui: number;
    satisfaction: number;
    recrutements_ouverts?: number;
  };
  employePreview?: HeroEmployePreview[];
  /** Série publique (6 mois) — hauteurs des barres dérivées des présences réelles */
  presenceChart?: PresenceChartPoint[];
};

const LOGIN_DASH = "/login?next=/dashboard";

function miniBarPercents(rows: { presents: number }[]): number[] {
  if (rows.length === 0) return [12, 12, 12, 12, 12, 12];
  const max = Math.max(...rows.map((r) => r.presents), 1);
  const sum = rows.reduce((s, r) => s + r.presents, 0);
  if (sum === 0) return rows.map(() => 12);
  return rows.map((r) => {
    const pct = (r.presents / max) * 78 + 10;
    return Math.min(92, Math.max(10, Math.round(pct)));
  });
}

export default function HeroSection({
  publicStats,
  employePreview = [],
  presenceChart = [],
}: HeroSectionProps) {
  const reduce = useReducedMotion();
  const stats = publicStats ?? {
    total_employes: 0,
    masse_salariale: 0,
    presents_aujourd_hui: 0,
    satisfaction: 0,
    recrutements_ouverts: 0,
  };

  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center px-6 pt-32 pb-20 lg:px-8 lg:pt-36">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
        {/* Texte */}
        <div className="lg:col-span-7">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#2F5F9D]/25 bg-[#E8F0FA]/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-[#F2C94C]"
          >
            <Building2 className="h-3.5 w-3.5" />
            Plateforme RH BV Groupe
          </motion.div>

          {/* Titre */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 font-display text-[40px] font-bold leading-[1.05] tracking-tight text-white sm:text-[56px] lg:text-[72px]"
          >
            Gérez vos ressources <br className="hidden sm:block" />
            humaines avec <br className="hidden sm:block" />
            <AnimatedWord />
          </motion.h1>

          {/* Sous-titre */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 max-w-xl text-[18px] leading-relaxed text-text-secondary sm:text-[20px]"
          >
            La plateforme tout-en-un pour piloter vos équipes, automatiser votre paie
            et optimiser vos recrutements.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              href={LOGIN_DASH}
              className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#2F5F9D] to-[#1F3F73] px-6 text-[15px] font-semibold text-white shadow-md transition hover:shadow-lg hover:scale-[1.02]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Accéder au tableau de bord</span>
              <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-[15px] font-medium text-white transition hover:bg-white/[0.08] hover:border-white/20"
            >
              Voir les fonctionnalités
              <ChevronDown className="h-4 w-4" />
            </a>
          </motion.div>

          {/* Stats compactes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-10 flex flex-wrap items-center gap-6 sm:gap-8 border-t border-white/5 pt-6"
          >
            <MiniStat icon={Users} color="text-[#2F5F9D]/80" label="Employés gérés">
              <AnimatedCounter to={Math.max(stats.total_employes, 0)} className="font-mono font-bold text-white text-[20px] sm:text-[22px]" />
            </MiniStat>
            <MiniStat icon={Wallet} color="text-[#2F5F9D]" label="FCFA traités/mois">
              <AnimatedCounter to={Math.max(stats.masse_salariale, 0)} format="currency" className="font-mono font-bold text-white text-[20px] sm:text-[22px]" />
            </MiniStat>
            <MiniStat icon={TrendingUp} color="text-emerald-300" label="Taux de satisfaction">
              <AnimatedCounter
                to={Math.min(100, Math.max(stats.satisfaction ?? 0, 0))}
                format="percent"
                className="font-mono font-bold text-white text-[20px] sm:text-[22px]"
              />
            </MiniStat>
          </motion.div>
        </div>

        {/* Mockup à droite */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:col-span-5 lg:block"
          style={{ perspective: "1000px" }}
        >
          <DashboardMockup
            stats={stats}
            employePreview={employePreview}
            presenceChart={presenceChart}
            reduce={!!reduce}
          />
        </motion.div>
      </div>
    </section>
  );
}

function MiniStat({
  icon: Icon,
  color,
  label,
  children,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={2.4} />
      </div>
      <div>
        <div>{children}</div>
        <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{label}</p>
      </div>
    </div>
  );
}

function DashboardMockup({
  stats,
  employePreview,
  presenceChart,
  reduce,
}: {
  stats: {
    total_employes: number;
    masse_salariale: number;
    presents_aujourd_hui: number;
    recrutements_ouverts?: number;
  };
  employePreview: HeroEmployePreview[];
  presenceChart: PresenceChartPoint[];
  reduce: boolean;
}) {
  const barHeights = miniBarPercents(presenceChart);

  return (
    <motion.div
      whileHover={
        reduce
          ? undefined
          : {
              rotateY: 5,
              rotateX: -3,
              transition: { duration: 0.4 },
            }
      }
      className="relative"
    >
      {/* Particules */}
      {!reduce &&
        Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="landing-particle absolute h-1.5 w-1.5 rounded-full bg-[#F2C94C] shadow-[0_0_12px_rgba(34,211,238,0.9)]"
            style={{
              top: `${10 + i * 12}%`,
              left: i % 2 === 0 ? `${-4 - (i % 3) * 2}%` : `${100 + (i % 3)}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${3 + (i % 3)}s`,
            }}
          />
        ))}

      <div className={reduce ? "" : "landing-float-y"}>
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#0E1729]/90 to-[#1A2235]/90 p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          {/* Browser chrome */}
          <div className="mb-4 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            <div className="ml-3 flex h-6 flex-1 items-center rounded-md border border-white/5 bg-white/[0.02] px-2 text-[10px] font-mono text-text-tertiary">
              bvgroupe-rh.app/dashboard
            </div>
          </div>

          {/* Mini KPIs */}
          <div className="grid grid-cols-2 gap-2.5">
            <MockKPI
              icon={Users}
              label="Employés"
              value={(stats.total_employes ?? 0).toString()}
              accent="bg-[#2F5F9D]/15 text-[#2F5F9D]/80"
            />
            <MockKPI
              icon={CheckCircle2}
              label="Présents"
              value={(stats.presents_aujourd_hui ?? 0).toString()}
              accent="bg-emerald-500/15 text-emerald-300"
            />
            <MockKPI
              icon={Wallet}
              label="Masse salariale"
              value={`${((stats.masse_salariale ?? 0) / 1_000_000).toFixed(1)}M`}
              accent="bg-[#E8F0FA] text-[#2F5F9D]"
            />
            <MockKPI
              icon={Briefcase}
              label="Recrutements"
              value={String(stats.recrutements_ouverts ?? 0)}
              accent="bg-[#E8F0FA] text-[#1F3F73]"
            />
          </div>

          {/* Mini chart */}
          <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Évolution présences
            </p>
            <div className="mt-2 flex h-20 items-end gap-1.5">
              {barHeights.map((h, i) => (
                <motion.div
                  key={presenceChart[i]?.mois ?? i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.7, delay: 0.6 + i * 0.05 }}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-[#2F5F9D] to-[#1F3F73]"
                  style={{ opacity: 0.45 + (i / Math.max(barHeights.length, 1)) * 0.55 }}
                  title={presenceChart[i] ? `${presenceChart[i].mois}: ${presenceChart[i].presents} présents` : undefined}
                />
              ))}
            </div>
          </div>

          {/* Mini table */}
          <div className="mt-3 space-y-1.5">
            {(employePreview.length > 0 ? employePreview : []).slice(0, 3).map((u) => {
              const name = `${u.prenom} ${u.nom}`;
              const isConge = u.statut === "suspendu" || u.statut === "inactif";
              return (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2F5F9D] to-[#1F3F73] text-[9px] font-bold text-white ring-1 ring-white/10">
                      {(u.prenom[0] ?? "?") + (u.nom[0] ?? "")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-white">{name}</p>
                      <p className="truncate text-[9px] text-text-tertiary">{u.poste ?? "—"}</p>
                    </div>
                  </div>
                  <span
                    className={
                      isConge
                        ? "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-300"
                        : "inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300"
                    }
                  >
                    <span
                      className={
                        isConge ? "h-1 w-1 rounded-full bg-amber-400" : "h-1 w-1 rounded-full bg-emerald-400"
                      }
                    />
                    {isConge ? "Pause" : "actif"}
                  </span>
                </div>
              );
            })}
            {employePreview.length === 0 && (
              <p className="rounded-lg border border-dashed border-white/10 px-2 py-3 text-center text-[10px] text-text-tertiary">
                Aucun employé — vos données apparaîtront ici
              </p>
            )}
          </div>

          {/* Reflet */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-12 rounded-b-2xl bg-gradient-to-b from-white/10 to-transparent blur-md opacity-30" />
        </div>
      </div>
    </motion.div>
  );
}

function MockKPI({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
          <p className="mt-1 font-mono text-lg font-bold text-white">{value}</p>
        </div>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Wallet,
  Clock,
  Briefcase,
  GraduationCap,
  LayoutGrid,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import Skeleton from "@/components/ui/Skeleton";
import KPICard from "@/components/ui/KPICard";
import { useStatistiquesSynthese } from "@/hooks/api";
import { formatFCFA, cn } from "@/lib/utils";

const TABS = [
  { id: "vue", label: "Vue d'ensemble", icon: LayoutGrid },
  { id: "rh", label: "Effectifs & RH", icon: Users },
  { id: "paie", label: "Paie & masse salariale", icon: Wallet },
  { id: "presence", label: "Présence & absences", icon: Clock },
  { id: "recrutement", label: "Recrutement", icon: Briefcase },
  { id: "performance", label: "Performance", icon: GraduationCap },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CHART_TOOLTIP = {
  contentStyle: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.1)",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  },
};

const PIE_COLORS = ["#1d4ed8", "#6366f1", "#0d9488", "#ca8a04", "#64748b"];

export default function StatistiquesPage() {
  const { synthese, isLoading, mutate } = useStatistiquesSynthese();
  const [tab, setTab] = useState<TabId>("vue");

  const paie = synthese?.paie ?? {
    evolution_mensuelle: [] as Array<Record<string, number | string>>,
    cumul_net_annee: 0,
    annee_courante: new Date().getFullYear(),
    mois_courant: new Date().getMonth() + 1,
  };
  const presence = synthese?.presence ?? {
    serie_mensuelle: [] as Array<Record<string, number | string>>,
    aujourd_hui: { present: 0, absent: 0, retard: 0 },
    absences_en_attente: 0,
  };
  const recrutement = synthese?.recrutement ?? {
    candidatures_par_statut: { recu: 0, en_cours: 0, retenu: 0, rejete: 0, total: 0 },
    offres: { ouverte: 0, fermee: 0, pourvue: 0 },
    taux_retenu_pct: 0,
  };
  const performance = synthese?.performance ?? {
    moyennes: { ponctualite: 0, qualite_travail: 0, travail_equipe: 0, initiative: 0, note_globale: 0 },
    evaluations_12_mois: 0,
    repartition_notes: [] as Array<Record<string, number | string>>,
    evolution_mensuelle: [] as Array<Record<string, number | string>>,
  };
  const rh = synthese?.rh ?? {
    total_par_statut: { actif: 0, inactif: 0, suspendu: 0 },
    masse_brute_mensuelle_fcfa: 0,
    contrats_actifs: {},
    departements: [] as Array<Record<string, number | string>>,
  };
  const h = synthese?.headline ?? {
    employes_actifs: 0,
    presents_aujourd_hui: 0,
    masse_net_mois_courant: 0,
    note_moyenne_evaluations: 0,
    candidatures_en_cours: 0,
  };

  const sparkMasse = useMemo(
    () =>
      (Array.isArray(paie.evolution_mensuelle) ? paie.evolution_mensuelle : []).map(
        (m) => Number((m as { masse_net?: number }).masse_net ?? 0)
      ),
    [paie]
  );
  const sparkPresencesMois = useMemo(
    () =>
      (Array.isArray(presence.serie_mensuelle) ? presence.serie_mensuelle : []).map(
        (m) => Number((m as { presents?: number }).presents ?? 0)
      ),
    [presence]
  );

  const radarPerf = useMemo(() => {
    if (!synthese) return [];
    const m = performance.moyennes;
    return [
      { dim: "Ponctualité", val: m.ponctualite ?? 0 },
      { dim: "Qualité", val: m.qualite_travail ?? 0 },
      { dim: "Équipe", val: m.travail_equipe ?? 0 },
      { dim: "Initiative", val: m.initiative ?? 0 },
      { dim: "Note globale", val: m.note_globale ?? 0 },
    ];
  }, [performance, synthese]);

  const pieCand = useMemo(() => {
    if (!synthese) return [];
    const c = recrutement.candidatures_par_statut;
    return [
      { name: "Reçues", value: c.recu },
      { name: "En cours", value: c.en_cours },
      { name: "Retenues", value: c.retenu },
      { name: "Rejetées", value: c.rejete },
    ].filter((x) => x.value > 0);
  }, [recrutement, synthese]);

  if (isLoading || !synthese) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pilotage</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Statistiques & performance
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Indicateurs consolidés sur 12 mois (paie, présences, évaluations), effectifs en temps réel et vision
            recrutement. Données issues de votre base — aucun chiffre simulé.
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            Dernière mise à jour :{" "}
            <span className="font-mono text-slate-600">
              {new Date(synthese.genere_le).toLocaleString("fr-FR")}
            </span>
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => mutate()}>
          Actualiser
        </Button>
      </div>

      <GlassCard className="p-2 sm:p-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bv-tab-active"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="space-y-6"
        >
          {tab === "vue" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KPICard
                  title="Employés actifs"
                  value={h.employes_actifs}
                  icon={Users}
                  color="blue"
                  sparklineData={sparkPresencesMois.slice(-8)}
                  index={0}
                />
                <KPICard
                  title="Présences aujourd'hui"
                  value={h.presents_aujourd_hui}
                  icon={Clock}
                  color="green"
                  index={1}
                />
                <KPICard
                  title="Masse nette (mois en cours)"
                  value={h.masse_net_mois_courant}
                  icon={Wallet}
                  color="amber"
                  format="currency"
                  sparklineData={sparkMasse.slice(-8)}
                  index={2}
                />
                <KPICard
                  title="Note moyenne (12 mois)"
                  value={h.note_moyenne_evaluations ?? 0}
                  icon={GraduationCap}
                  color="cyan"
                  suffix="/10"
                  index={3}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-5">
                <GlassCard className="p-5 lg:col-span-3">
                  <SectionHeader title="Masse salariale nette" subtitle="12 derniers mois (FCFA)" />
                  <div className="mt-4 h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Array.isArray(paie.evolution_mensuelle) ? paie.evolution_mensuelle : []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="masseFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <Tooltip
                          {...CHART_TOOLTIP}
                          formatter={(value) => [formatFCFA(Number(value)), "Net"]}
                        />
                        <Area type="monotone" dataKey="masse_net" stroke="#1d4ed8" strokeWidth={2} fill="url(#masseFill)" name="Masse nette" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard className="p-5 lg:col-span-2">
                  <SectionHeader title="Taux de présence" subtitle="Présents / (présents + absents + retards), par mois" />
                  <div className="mt-4 h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={
                          (Array.isArray(presence.serie_mensuelle) ? presence.serie_mensuelle : []) as Array<{
                            cle: string;
                            label: string;
                            presents: number;
                            absents: number;
                            retards: number;
                            autres: number;
                            taux_presence_pct: number | null;
                          }>
                        }
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={2} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} domain={[0, 100]} unit=" %" />
                        <Tooltip
                          {...CHART_TOOLTIP}
                          formatter={(value) => [
                            value != null && value !== "" ? `${Number(value)} %` : "—",
                            "Taux",
                          ]}
                        />
                        <Bar dataKey="taux_presence_pct" fill="#0d9488" radius={[4, 4, 0, 0]} name="Taux %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-sm font-semibold text-slate-900">Recrutement</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{h.candidatures_en_cours}</p>
                  <p className="text-xs text-text-secondary">Candidatures à traiter (reçues + en cours)</p>
                </GlassCard>
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-semibold text-slate-900">Taux de rétention candidats</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">
                    {recrutement.taux_retenu_pct != null ? `${recrutement.taux_retenu_pct} %` : "—"}
                  </p>
                  <p className="text-xs text-text-secondary">Retenues / total candidatures</p>
                </GlassCard>
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold text-slate-900">Évaluations (12 mois)</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{performance.evaluations_12_mois}</p>
                  <p className="text-xs text-text-secondary">Entretiens enregistrés</p>
                </GlassCard>
              </div>
            </>
          )}

          {tab === "rh" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Actifs</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{rh.total_par_statut.actif}</p>
                </GlassCard>
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inactifs</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{rh.total_par_statut.inactif}</p>
                </GlassCard>
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Suspendus</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{rh.total_par_statut.suspendu}</p>
                </GlassCard>
              </div>
              <GlassCard className="p-5">
                <SectionHeader title="Masse brute mensuelle (salaires de base)" subtitle="Somme des salaires de base — employés actifs uniquement" />
                <p className="mt-3 font-mono text-2xl font-bold text-slate-900">{formatFCFA(rh.masse_brute_mensuelle_fcfa)}</p>
              </GlassCard>
              <div className="grid gap-6 lg:grid-cols-2">
                <GlassCard className="p-5">
                  <SectionHeader title="Contrats (actifs)" subtitle="Répartition par type" />
                  <div className="mt-4 h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(rh.contrats_actifs ?? {}).map(([name, value]) => ({ name, value }))}
                        layout="vertical"
                        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                        <Tooltip {...CHART_TOOLTIP} />
                        <Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]} name="Effectif" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
                <GlassCard className="p-5">
                  <SectionHeader title="Effectifs par département" subtitle="Top 12 — actifs" />
                  <div className="mt-4 h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Array.isArray(rh.departements) ? rh.departements : []} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                        <XAxis dataKey="nom" tick={{ fontSize: 10, fill: "#64748b" }} angle={-28} textAnchor="end" height={56} interval={0} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip {...CHART_TOOLTIP} />
                        <Bar dataKey="effectif" fill="#6366f1" radius={[6, 6, 0, 0]} name="Effectif" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>
            </>
          )}

          {tab === "paie" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cumul net année {paie.annee_courante}</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-slate-900">{formatFCFA(paie.cumul_net_annee)}</p>
                </GlassCard>
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mois de référence</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                    {paie.mois_courant}/{paie.annee_courante}
                  </p>
                </GlassCard>
              </div>
              <GlassCard className="p-5">
                <SectionHeader title="Bulletins et masse nette" subtitle="Colonnes : volume de bulletins ; courbe : masse nette (FCFA)" />
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={Array.isArray(paie.evolution_mensuelle) ? paie.evolution_mensuelle : []} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={1} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip {...CHART_TOOLTIP} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="left" dataKey="bulletins" fill="#94a3b8" name="Bulletins" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="payes" fill="#10b981" name="Payés" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="masse_net" stroke="#1d4ed8" strokeWidth={2} dot={false} name="Masse nette" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </>
          )}

          {tab === "presence" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aujourd&apos;hui — présents</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">{presence.aujourd_hui.present}</p>
                </GlassCard>
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Absents</p>
                  <p className="mt-2 text-3xl font-bold text-red-600">{presence.aujourd_hui.absent}</p>
                </GlassCard>
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Retards</p>
                  <p className="mt-2 text-3xl font-bold text-amber-600">{presence.aujourd_hui.retard}</p>
                </GlassCard>
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Absences à valider</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{presence.absences_en_attente}</p>
                </GlassCard>
              </div>
              <GlassCard className="p-5">
                <SectionHeader title="Volume des pointages" subtitle="Présents, absents, retards — 12 mois" />
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        (Array.isArray(presence.serie_mensuelle) ? presence.serie_mensuelle : []) as Array<{
                          cle: string;
                          label: string;
                          presents: number;
                          absents: number;
                          retards: number;
                          autres: number;
                          taux_presence_pct: number | null;
                        }>
                      }
                      margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={1} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip {...CHART_TOOLTIP} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="presents" stackId="a" fill="#10b981" name="Présents" />
                      <Bar dataKey="absents" stackId="a" fill="#ef4444" name="Absents" />
                      <Bar dataKey="retards" stackId="a" fill="#f59e0b" name="Retards" />
                      <Bar dataKey="autres" stackId="a" fill="#94a3b8" name="Congé / mission" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </>
          )}

          {tab === "recrutement" && (
            <>
              <div className="grid gap-6 lg:grid-cols-3">
                <GlassCard className="p-5 lg:col-span-1">
                  <SectionHeader title="Candidatures" subtitle="Répartition par statut" />
                  <div className="mt-2 h-[260px]">
                    {pieCand.length === 0 ? (
                      <p className="py-12 text-center text-sm text-text-secondary">Aucune candidature enregistrée</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieCand}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={88}
                            label={({ name, percent }) =>
                              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                          >
                            {pieCand.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip {...CHART_TOOLTIP} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </GlassCard>
                <GlassCard className="p-5 lg:col-span-2">
                  <SectionHeader title="Offres d'emploi" subtitle="Par statut" />
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Ouvertes</p>
                      <p className="mt-1 text-2xl font-bold text-[#2F5F9D]">{recrutement.offres.ouverte}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Fermées</p>
                      <p className="mt-1 text-2xl font-bold text-slate-700">{recrutement.offres.fermee}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Pourvues</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-700">{recrutement.offres.pourvue}</p>
                    </div>
                  </div>
                  <p className="mt-6 text-sm text-text-secondary">
                    Total candidatures :{" "}
                    <span className="font-mono font-semibold text-slate-900">
                      {recrutement.candidatures_par_statut.total}
                    </span>
                  </p>
                </GlassCard>
              </div>
            </>
          )}

          {tab === "performance" && (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <GlassCard className="p-5">
                  <SectionHeader title="Profil moyen (12 mois)" subtitle="Échelle /10 — entretiens d'évaluation" />
                  <div className="mt-2 h-[300px]">
                    {performance.evaluations_12_mois === 0 ? (
                      <p className="py-16 text-center text-sm text-text-secondary">Aucune évaluation sur la période</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="78%" data={radarPerf}>
                          <PolarGrid stroke="rgba(15,23,42,0.1)" />
                          <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: "#475569" }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Radar name="Moyenne" dataKey="val" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.45} strokeWidth={2} />
                          <Tooltip {...CHART_TOOLTIP} formatter={(value) => [`${Number(value)} / 10`, ""]} />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </GlassCard>
                <GlassCard className="p-5">
                  <SectionHeader title="Répartition des notes globales" subtitle="Sur 12 mois glissants" />
                  <div className="mt-4 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Array.isArray(performance.repartition_notes) ? performance.repartition_notes : []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                        <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <Tooltip {...CHART_TOOLTIP} />
                        <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Nombre" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>
              <GlassCard className="p-5">
                <SectionHeader title="Activité d'évaluation" subtitle="Volume mensuel et note moyenne (/10)" />
                <div className="mt-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={
                        (Array.isArray(performance.evolution_mensuelle) ? performance.evolution_mensuelle : []) as Array<{
                          cle: string;
                          label: string;
                          moyenne: number | null;
                          count: number;
                        }>
                      }
                      margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={1} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip {...CHART_TOOLTIP} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="left" dataKey="count" fill="#cbd5e1" name="Volume" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="moyenne" stroke="#4f46e5" strokeWidth={2} dot name="Note moy. /10" connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

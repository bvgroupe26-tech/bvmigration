"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays } from "lucide-react";
import StatBadge from "@/components/ui/StatBadge";
import GlassCard from "@/components/ui/GlassCard";
import Skeleton from "@/components/ui/Skeleton";
import Avatar from "@/components/ui/Avatar";
import { useEmploye, usePresences } from "@/hooks/api";
import {
  computePresenceStats,
  formatPresenceDate,
  getMonthBounds,
  PRESENCE_STATUT_LABELS,
} from "@/lib/presence-utils";
import type { Presence } from "@/lib/types";
import { localDateISO } from "@/lib/date-local";

const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

type ViewMode = "day" | "month";

type AdminEmployeePresencesClientProps = {
  employeId: number;
  backHref?: string;
  backLabel?: string;
};

export default function AdminEmployeePresencesClient({
  employeId,
  backHref = "/employes",
  backLabel = "Retour aux employés",
}: AdminEmployeePresencesClientProps) {
  const now = new Date();
  const today = localDateISO(now);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [date, setDate] = useState(today);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { employe, isLoading: loadingEmploye } = useEmploye(employeId);
  const monthBounds = useMemo(() => getMonthBounds(year, month), [year, month]);

  const presenceFilters =
    viewMode === "day"
      ? { employe_id: employeId, date, limit: 10 }
      : {
          employe_id: employeId,
          date_from: monthBounds.date_from,
          date_to: monthBounds.date_to,
          limit: 100,
        };

  const { presences, isLoading: loadingPresences } = usePresences(presenceFilters);

  const sorted = useMemo(
    () => [...presences].sort((a, b) => b.date.localeCompare(a.date)),
    [presences]
  );
  const stats = useMemo(() => computePresenceStats(presences), [presences]);
  const dayEntry = viewMode === "day" ? presences[0] : null;
  const tauxMois =
    stats.total > 0
      ? Math.round(((stats.present + stats.retard) / stats.total) * 100)
      : 0;

  const isLoading = loadingEmploye || loadingPresences;

  function openDayFromHistory(dayIso: string) {
    setDate(dayIso);
    setViewMode("day");
  }

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-[#1F3F73]"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {loadingEmploye ? (
        <Skeleton className="h-24 w-full" />
      ) : employe ? (
        <GlassCard className="flex flex-wrap items-center gap-4 p-5">
          <Avatar nom={employe.nom} prenom={employe.prenom} src={employe.avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {employe.prenom} {employe.nom}
            </h1>
            <p className="text-sm text-slate-600">
              Fiche de présence · {employe.poste ?? "—"} · {employe.departement ?? "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href={`/employes/${employeId}`}
                className="text-xs font-semibold text-[#2F5F9D] hover:text-[#1F3F73]"
              >
                Fiche RH complète →
              </Link>
              <Link
                href="/presence"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Toutes les présences →
              </Link>
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-8 text-center text-sm text-slate-600">Employé introuvable.</GlassCard>
      )}

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {viewMode === "day" ? "Pointage du jour" : "Historique mensuel"}
            </p>
            <p className="font-display text-lg font-bold text-slate-900">
              {viewMode === "day"
                ? formatPresenceDate(date)
                : `${MOIS[month - 1]} ${year}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "day"
                    ? "bg-white text-[#1F3F73] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Par jour
              </button>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "month"
                    ? "bg-white text-[#1F3F73] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Historique mois
              </button>
            </div>

            {viewMode === "day" ? (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              />
            ) : (
              <>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  {MOIS.map((label, i) => (
                    <option key={label} value={i + 1}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {viewMode === "month" ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat icon={CheckCircle2} label="Présents" value={stats.present} tone="green" />
            <MiniStat icon={Clock} label="Retards" value={stats.retard} tone="amber" />
            <MiniStat icon={XCircle} label="Absents" value={stats.absent} tone="red" />
            <MiniStat icon={AlertCircle} label="Taux mois" value={`${tauxMois}%`} tone="blue" />
          </div>
        ) : null}
      </GlassCard>

      {viewMode === "day" ? (
        <GlassCard className="p-5">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : dayEntry ? (
            <DayPresenceCard presence={dayEntry} />
          ) : (
            <div className="py-8 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">Aucun pointage ce jour-là</p>
              <p className="mt-1 text-xs text-slate-500">
                Choisissez une autre date ou consultez l&apos;historique mensuel.
              </p>
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {isLoading ? "Chargement…" : `${sorted.length} jour(s) pointé(s)`}
            </p>
            <p className="text-xs text-slate-500">Cliquez sur une ligne pour voir le détail du jour.</p>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Aucun pointage pour ce mois.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openDayFromHistory(p.date)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50"
                  >
                    <PresenceRowContent presence={p} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      )}
    </div>
  );
}

function DayPresenceCard({ presence: p }: { presence: Presence }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</p>
          <p className="font-display text-xl font-bold text-slate-900">{formatPresenceDate(p.date)}</p>
        </div>
        <StatBadge variant={p.statut}>
          {PRESENCE_STATUT_LABELS[p.statut] ?? p.statut}
        </StatBadge>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DayField label="Heure d'arrivée" value={p.heure_entree ?? "—"} />
        <DayField label="Heure de sortie" value={p.heure_sortie ?? "—"} />
        <DayField
          label="Heures supplémentaires"
          value={p.heures_supplementaires > 0 ? `+${p.heures_supplementaires} h` : "—"}
        />
        <DayField label="Justification" value={p.justification ?? "—"} />
      </dl>
    </div>
  );
}

function DayField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: number | string;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    green: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
    blue: "text-[#1F3F73] bg-[#E8F0FA]",
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}

function PresenceRowContent({ presence: p }: { presence: Presence }) {
  return (
    <>
      <div>
        <p className="font-medium text-slate-900">{formatPresenceDate(p.date)}</p>
        <p className="mt-0.5 font-mono text-xs text-slate-500">
          {p.heure_entree ?? "—"} → {p.heure_sortie ?? "—"}
          {p.heures_supplementaires > 0 ? ` · +${p.heures_supplementaires}h` : ""}
        </p>
      </div>
      <StatBadge variant={p.statut}>
        {PRESENCE_STATUT_LABELS[p.statut] ?? p.statut}
      </StatBadge>
    </>
  );
}

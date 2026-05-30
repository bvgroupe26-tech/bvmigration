"use client";

import { useMemo, useState } from "react";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import StatBadge from "@/components/ui/StatBadge";
import { EmployeeEmpty, EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { useMyPresences } from "@/hooks/employee";
import {
  computePresenceStats,
  formatPresenceDate,
  getMonthBounds,
  PRESENCE_STATUT_LABELS,
} from "@/lib/presence-utils";
import type { Presence } from "@/lib/types";

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

export default function EmployeePresencesClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const bounds = useMemo(() => getMonthBounds(year, month), [year, month]);
  const { presences, isLoading, error, employeId } = useMyPresences({
    date_from: bounds.date_from,
    date_to: bounds.date_to,
    limit: 62,
  });

  const sorted = useMemo(
    () => [...presences].sort((a, b) => b.date.localeCompare(a.date)),
    [presences]
  );

  const stats = useMemo(() => computePresenceStats(presences), [presences]);
  const today = now.toISOString().slice(0, 10);
  const todayEntry = presences.find((p) => p.date === today);

  if (isLoading) return <EmployeeLoading />;
  if (!employeId) {
    return (
      <EmployeeEmpty
        icon={Clock}
        title="Fiche employé introuvable"
        description="Votre compte n'est pas lié à une fiche RH. Contactez le service RH."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <EmployeeError message="Impossible de charger vos pointages." />}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Période</p>
            <p className="font-display text-lg font-bold text-slate-900">
              {MOIS[month - 1]} {year}
            </p>
          </div>
          <div className="flex gap-2">
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
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {todayEntry && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Aujourd&apos;hui</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <StatBadge variant={todayEntry.statut}>
              {PRESENCE_STATUT_LABELS[todayEntry.statut] ?? todayEntry.statut}
            </StatBadge>
            <p className="text-xs text-emerald-900">
              {todayEntry.heure_entree ? `Arrivée ${todayEntry.heure_entree}` : "Pointage enregistré"}
              {todayEntry.heure_sortie ? ` · Sortie ${todayEntry.heure_sortie}` : ""}
            </p>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={CheckCircle2} label="Présents" value={stats.present} tone="green" />
        <StatCard icon={AlertCircle} label="Retards" value={stats.retard} tone="amber" />
        <StatCard icon={XCircle} label="Absents" value={stats.absent} tone="red" />
        <StatCard icon={Clock} label="Congés / mission" value={stats.conge + stats.mission} tone="blue" />
      </section>

      {sorted.length === 0 ? (
        <EmployeeEmpty
          icon={Clock}
          title="Aucun pointage"
          description="Aucun enregistrement de présence pour cette période."
        />
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Historique ({sorted.length})
          </h2>
          {sorted.map((p) => (
            <PresenceRow key={p.id} presence={p} />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    green: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
    blue: "text-[#2F5F9D] bg-[#E8F0FA]",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-display text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function PresenceRow({ presence: p }: { presence: Presence }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{formatPresenceDate(p.date)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Arrivée {p.heure_entree ?? "—"} · Sortie {p.heure_sortie ?? "—"}
            {p.heures_supplementaires > 0 ? ` · +${p.heures_supplementaires}h sup.` : ""}
          </p>
        </div>
        <StatBadge variant={p.statut}>
          {PRESENCE_STATUT_LABELS[p.statut] ?? p.statut}
        </StatBadge>
      </div>
    </article>
  );
}

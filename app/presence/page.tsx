"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, CheckCircle2, Clock, XCircle, Plus, CalendarOff, Printer } from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import StatBadge from "@/components/ui/StatBadge";
import Avatar from "@/components/ui/Avatar";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import PresenceForm from "@/components/forms/PresenceForm";
import PresencePrintSheet from "@/components/presence/PresencePrintSheet";
import { useEmployes, usePresences } from "@/hooks/api";
import {
  computeDailyPresenceRate,
  computePresenceStats,
  formatPresenceDate,
  getMonthBounds,
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

export default function PresencePage() {
  const now = new Date();
  const today = localDateISO(now);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statutFilter, setStatutFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [checkoutPresence, setCheckoutPresence] = useState<Presence | null>(null);

  const monthBounds = useMemo(() => getMonthBounds(year, month), [year, month]);
  const { employes } = useEmployes({ statut: "actif", limit: 500 });

  // Le filtre de statut est appliqué côté client : les statistiques portent toujours sur tous les pointages.
  const presenceFilters =
    viewMode === "day"
      ? { date, limit: 1000 }
      : { date_from: monthBounds.date_from, date_to: monthBounds.date_to, limit: 5000 };

  const { presences: allPresences, isLoading, mutate } = usePresences(presenceFilters);
  const presences = useMemo(
    () =>
      statutFilter === "all"
        ? allPresences
        : allPresences.filter((p) => p.statut === statutFilter),
    [allPresences, statutFilter]
  );

  // Effectif attendu à la date consultée : employés déjà embauchés et encore sous contrat, hors week-end.
  const activeCount = useMemo(() => {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) return 0;
    return employes.filter((e) => {
      const embauche = e.date_embauche?.slice(0, 10);
      const fin = e.date_fin_contrat?.slice(0, 10);
      return (!embauche || embauche <= date) && (!fin || fin >= date);
    }).length;
  }, [employes, date]);

  const dayRate = useMemo(
    () => computeDailyPresenceRate(allPresences, activeCount),
    [allPresences, activeCount]
  );
  const monthStats = useMemo(() => computePresenceStats(allPresences), [allPresences]);
  const monthTaux =
    monthStats.total > 0
      ? Math.round(((monthStats.present + monthStats.retard) / monthStats.total) * 100)
      : 0;

  const printSummary =
    viewMode === "day"
      ? {
          effectif: activeCount,
          present: dayRate.present,
          retard: dayRate.retard,
          absent: dayRate.absent,
          conge: dayRate.conge,
          mission: dayRate.mission,
          total: allPresences.length,
          tauxPct: dayRate.tauxPct,
        }
      : {
          effectif: undefined,
          present: monthStats.present,
          retard: monthStats.retard,
          absent: monthStats.absent,
          conge: monthStats.conge,
          mission: monthStats.mission,
          total: monthStats.total,
          tauxPct: monthTaux,
        };

  const subtitle =
    viewMode === "day"
      ? new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : `${MOIS[month - 1]} ${year}`;

  const columns: Column<Presence>[] = [
    {
      key: "employe",
      header: "Employé",
      render: (p) => (
        <Link
          href={`/employes/${p.employe_id}/presence`}
          className="flex items-center gap-3 group"
        >
          <Avatar nom={p.employe_nom ?? "?"} prenom={p.employe_prenom ?? ""} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 group-hover:text-[#1F3F73] transition">
              {p.employe_prenom} {p.employe_nom}
            </p>
            <p className="truncate text-xs text-text-tertiary">{p.employe_poste ?? "—"}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (p) => (
        <span className="text-sm text-text-secondary">{formatPresenceDate(p.date)}</span>
      ),
    },
    {
      key: "entree",
      header: "Arrivée",
      render: (p) => (
        <span className="font-mono text-xs text-text-secondary">{p.heure_entree ?? "—"}</span>
      ),
    },
    {
      key: "sortie",
      header: "Sortie",
      render: (p) => (
        <span className="font-mono text-xs text-text-secondary">{p.heure_sortie ?? "—"}</span>
      ),
    },
    {
      key: "hs",
      header: "H. sup",
      align: "right",
      render: (p) => (
        <span className="font-mono text-xs text-[#2F5F9D]">
          {p.heures_supplementaires > 0 ? `+${p.heures_supplementaires}h` : "—"}
        </span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      align: "right",
      render: (p) => (
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {p.heure_entree && !p.heure_sortie ? (
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setCheckoutPresence(p);
                }}
                className="no-print text-xs font-semibold text-amber-700 hover:text-amber-900"
              >
                + Sortie
              </button>
            ) : null}
            <Link
              href={`/employes/${p.employe_id}/presence`}
              className="no-print hidden text-xs font-medium text-[#2F5F9D] hover:text-[#1F3F73] sm:inline"
              onClick={(e) => e.stopPropagation()}
            >
              Historique
            </Link>
            <StatBadge variant={p.statut}>{p.statut}</StatBadge>
          </div>
          {p.heure_entree && !p.heure_sortie ? (
            <span className="text-[10px] text-amber-700">En attente de sortie</span>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-7">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-3 print:hidden"
      >
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">
            Présences
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {viewMode === "day" ? "Pointage journalier" : "Historique mensuel"} · {subtitle}
          </p>
          {viewMode === "day" && activeCount > 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              Effectif actif : {activeCount} employé(s)
              {dayRate.nonPointes > 0 ? ` · ${dayRate.nonPointes} non pointé(s)` : ""}
            </p>
          ) : null}
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
            disabled={presences.length === 0}
          >
            Imprimer
          </Button>
          <Link href="/presence/absences">
            <Button variant="ghost" icon={<CalendarOff className="h-4 w-4" />}>
              Absences
            </Button>
          </Link>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Pointer
          </Button>
        </div>
      </motion.div>

      <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {viewMode === "day" ? (
          <>
            <KPICard title="Présents" value={dayRate.present} icon={CheckCircle2} color="green" index={0} />
            <KPICard title="Retards" value={dayRate.retard} icon={Clock} color="amber" index={1} />
            <KPICard title="Absents / non pointés" value={dayRate.absent} icon={XCircle} color="red" index={2} />
            <KPICard
              title="Taux de présence"
              value={dayRate.tauxPct}
              icon={Users}
              color="blue"
              suffix="%"
              index={3}
            />
          </>
        ) : (
          <>
            <KPICard title="Présents" value={monthStats.present} icon={CheckCircle2} color="green" index={0} />
            <KPICard title="Retards" value={monthStats.retard} icon={Clock} color="amber" index={1} />
            <KPICard title="Absents" value={monthStats.absent} icon={XCircle} color="red" index={2} />
            <KPICard title="Taux sur pointages" value={monthTaux} icon={Users} color="blue" suffix="%" index={3} />
          </>
        )}
      </div>

      <GlassCard className="p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              {viewMode === "day" ? "Pointages du jour" : "Pointages du mois"}
            </h2>
            <p className="text-xs text-text-secondary">{presences.length} enregistrement(s)</p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
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
                Jour
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
                Mois
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

            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="all">Tous statuts</option>
              <option value="present">Présents</option>
              <option value="retard">Retards</option>
              <option value="absent">Absents</option>
              <option value="conge">Congés</option>
              <option value="mission">Missions</option>
            </select>
          </div>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              data={presences}
              columns={columns}
              rowKey={(p) => p.id}
              pagination
              pageSize={viewMode === "month" ? 15 : 10}
              emptyMessage={
                viewMode === "day"
                  ? "Aucun pointage pour cette date. Cliquez sur « Enregistrer » pour en ajouter."
                  : "Aucun pointage pour ce mois."
              }
            />
          )}
        </div>
      </GlassCard>

      <div className="hidden print:block">
        <PresencePrintSheet
          presences={presences}
          periodLabel={subtitle}
          summary={printSummary}
        />
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Pointer une présence"
        description="Arrivée et sortie peuvent être enregistrées séparément"
      >
        <PresenceForm
          defaultDate={viewMode === "day" ? date : today}
          onSuccess={() => {
            setShowAdd(false);
            mutate();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal
        open={Boolean(checkoutPresence)}
        onClose={() => setCheckoutPresence(null)}
        title="Enregistrer la sortie"
        description={
          checkoutPresence
            ? `${checkoutPresence.employe_prenom} ${checkoutPresence.employe_nom} · arrivée ${checkoutPresence.heure_entree ?? "—"}`
            : undefined
        }
      >
        {checkoutPresence ? (
          <PresenceForm
            initialMode="sortie"
            existingPresence={checkoutPresence}
            defaultDate={checkoutPresence.date}
            defaultEmployeId={checkoutPresence.employe_id}
            onSuccess={() => {
              setCheckoutPresence(null);
              mutate();
            }}
            onCancel={() => setCheckoutPresence(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

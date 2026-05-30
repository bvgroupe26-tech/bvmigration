"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, CheckCircle2, Clock, XCircle, Plus, CalendarOff } from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import StatBadge from "@/components/ui/StatBadge";
import Avatar from "@/components/ui/Avatar";
import SectionHeader from "@/components/ui/SectionHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import PresenceForm from "@/components/forms/PresenceForm";
import { usePresences, usePresencesToday } from "@/hooks/api";
import { formatPresenceDate } from "@/lib/presence-utils";
import type { Presence } from "@/lib/types";

export default function PresencePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [statutFilter, setStatutFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const { presences, isLoading, mutate } = usePresences({
    date,
    statut: statutFilter === "all" ? undefined : statutFilter,
  });
  const { data: todayData, mutate: mutateToday } = usePresencesToday();

  const tauxPresence = useMemo(() => {
    const c = todayData?.counts;
    if (!c || !c.total) return 0;
    return Math.round(((c.present + c.retard) / c.total) * 100);
  }, [todayData]);

  const columns: Column<Presence>[] = [
    {
      key: "employe",
      header: "Employé",
      render: (p) => (
        <Link href={`/employes/${p.employe_id}`} className="flex items-center gap-3 group">
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
      render: (p) => <span className="font-mono text-xs text-text-secondary">{p.heure_entree ?? "—"}</span>,
    },
    {
      key: "sortie",
      header: "Sortie",
      render: (p) => <span className="font-mono text-xs text-text-secondary">{p.heure_sortie ?? "—"}</span>,
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
        <div className="flex justify-end">
          <StatBadge variant={p.statut}>{p.statut}</StatBadge>
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
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Présences</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Pointage journalier · {new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/presence/absences">
            <Button variant="ghost" icon={<CalendarOff className="h-4 w-4" />}>
              Absences
            </Button>
          </Link>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Enregistrer
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Présents" value={todayData?.counts?.present ?? 0} icon={CheckCircle2} color="green" index={0} />
        <KPICard title="Retards" value={todayData?.counts?.retard ?? 0} icon={Clock} color="amber" index={1} />
        <KPICard title="Absents" value={todayData?.counts?.absent ?? 0} icon={XCircle} color="red" index={2} />
        <KPICard title="Taux de présence" value={tauxPresence} icon={Users} color="blue" suffix="%" index={3} />
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">Pointages du jour</h2>
            <p className="text-xs text-text-secondary">{presences.length} enregistrement(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            />
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
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <DataTable
              data={presences}
              columns={columns}
              rowKey={(p) => p.id}
              pagination
              pageSize={10}
              emptyMessage="Aucun pointage pour cette date. Cliquez sur « Enregistrer » pour en ajouter."
            />
          )}
        </div>
      </GlassCard>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Enregistrer une présence"
        description="Pointage manuel d'un employé"
      >
        <PresenceForm
          defaultDate={date}
          onSuccess={() => {
            setShowAdd(false);
            mutate();
            mutateToday();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  );
}

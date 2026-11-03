"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarOff,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Check,
  X,
} from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import StatBadge from "@/components/ui/StatBadge";
import Avatar from "@/components/ui/Avatar";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import AbsenceForm from "@/components/forms/AbsenceForm";
import { useAbsences } from "@/hooks/api";
import { useAuth } from "@/context/AuthContext";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { refreshNotificationsCache } from "@/hooks/useNotifications";
import { absenceDureeJours, formatPeriodeAbsence } from "@/lib/absence-utils";
import type { Absence, AbsenceType } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  maladie: "Maladie",
  conge_paye: "Congé payé",
  conge_sans_solde: "Sans solde",
  maternite: "Maternité",
  paternite: "Paternité",
  autre: "Autre",
};

const SELF_VALIDATION_HINT = "Vous ne pouvez pas valider votre propre demande";

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  approuve: "Approuvée",
  refuse: "Refusée",
};

export default function AbsencesPage() {
  const [statutFilter, setStatutFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<AbsenceType | "all">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const { user } = useAuth();
  const myEmployeId = user?.employeId ?? null;

  const { absences, isLoading, mutate } = useAbsences({
    statut: statutFilter === "all" ? undefined : statutFilter,
    type_absence: typeFilter === "all" ? undefined : typeFilter,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return absences;
    return absences.filter((a) => {
      const name = `${a.employe_prenom ?? ""} ${a.employe_nom ?? ""}`.toLowerCase();
      return name.includes(q) || (a.employe_poste ?? "").toLowerCase().includes(q);
    });
  }, [absences, search]);

  const stats = useMemo(() => {
    return {
      total: absences.length,
      en_attente: absences.filter((a) => a.statut === "en_attente").length,
      approuve: absences.filter((a) => a.statut === "approuve").length,
      refuse: absences.filter((a) => a.statut === "refuse").length,
    };
  }, [absences]);

  async function patch(a: Absence, statut: "approuve" | "refuse") {
    try {
      await apiClient.put(`/absences/${a.id}`, { statut });
      toast.success(statut === "approuve" ? "Absence approuvée" : "Absence refusée");
      mutate();
      void refreshNotificationsCache();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  }

  const columns: Column<Absence>[] = [
    {
      key: "employe",
      header: "Employé",
      render: (a) => {
        const nom = a.employe_nom?.trim() || "—";
        const prenom = a.employe_prenom?.trim() || "";
        const label = [prenom, nom].filter(Boolean).join(" ").trim() || "Employé inconnu";
        return (
          <Link href={`/employes/${a.employe_id}`} className="flex items-center gap-3 group">
            <Avatar nom={nom !== "—" ? nom : "?"} prenom={prenom} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 group-hover:text-[#1F3F73] transition">
                {label}
              </p>
              <p className="truncate text-xs text-text-tertiary">{a.employe_poste ?? "—"}</p>
            </div>
          </Link>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      render: (a) => (
        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-text-secondary">
          {TYPE_LABELS[a.type_absence] ?? a.type_absence}
        </span>
      ),
    },
    {
      key: "duree",
      header: "Durée",
      render: (a) => {
        const days = absenceDureeJours(a);
        return (
          <span className="text-xs font-semibold text-slate-800">
            {days > 0 ? `${days} j` : "—"}
          </span>
        );
      },
    },
    {
      key: "periode",
      header: "Période",
      render: (a) => (
        <span className="text-xs text-text-secondary">
          {formatPeriodeAbsence(a.date_debut, a.date_fin)}
        </span>
      ),
    },
    {
      key: "justif",
      header: "Justification",
      render: (a) => (
        <span className="line-clamp-1 text-xs text-text-tertiary">{a.justification ?? "—"}</span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (a) => (
        <StatBadge variant={a.statut as "en_attente" | "approuve" | "refuse"}>
          {STATUT_LABELS[a.statut] ?? a.statut.replace("_", " ")}
        </StatBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => {
        if (a.statut !== "en_attente") {
          return <span className="text-[11px] text-text-tertiary">—</span>;
        }
        const own = myEmployeId != null && a.employe_id === myEmployeId;
        const ownTitle = own ? SELF_VALIDATION_HINT : undefined;
        return (
          <div className="flex justify-end gap-1.5" title={ownTitle}>
            <button
              type="button"
              onClick={() => patch(a, "approuve")}
              disabled={own}
              aria-label={own ? `Approuver — ${SELF_VALIDATION_HINT}` : undefined}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 text-[11px] text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-500/10"
            >
              <Check className="h-3 w-3" /> Approuver
            </button>
            <button
              type="button"
              onClick={() => patch(a, "refuse")}
              disabled={own}
              aria-label={own ? `Refuser — ${SELF_VALIDATION_HINT}` : undefined}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 text-[11px] text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-500/10"
            >
              <X className="h-3 w-3" /> Refuser
            </button>
          </div>
        );
      },
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
          <Link href="/presence" className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-slate-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux présences
          </Link>
          <h1 className="mt-2 font-display text-[28px] font-bold tracking-tight text-slate-900">Absences</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Les demandes soumises par les employés (PWA) apparaissent ici. Validez ou refusez avant qu&apos;elles n&apos;impactent les présences.
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
          Nouvelle demande
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total" value={stats.total} icon={CalendarOff} color="blue" index={0} />
        <KPICard title="En attente" value={stats.en_attente} icon={Clock} color="amber" index={1} />
        <KPICard title="Approuvées" value={stats.approuve} icon={CheckCircle2} color="green" index={2} />
        <KPICard title="Refusées" value={stats.refuse} icon={XCircle} color="red" index={3} />
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">Demandes</h2>
            <p className="text-xs text-text-secondary">{filtered.length} demande(s) affichée(s)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un employé…"
              className="h-10 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as AbsenceType | "all")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="all">Tous les types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="approuve">Approuvées</option>
              <option value="refuse">Refusées</option>
            </select>
          </div>
        </div>
        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              rowKey={(a) => a.id}
              pagination
              pageSize={10}
              emptyMessage="Aucune demande d'absence pour le moment."
            />
          )}
        </div>
      </GlassCard>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Nouvelle demande d'absence"
        description="Saisissez une demande de congé"
      >
        <AbsenceForm
          onSuccess={() => {
            setShowAdd(false);
            mutate();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  );
}

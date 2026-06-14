"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, CheckCircle2, Wallet, Briefcase, Plus, Download } from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import StatBadge from "@/components/ui/StatBadge";
import Avatar from "@/components/ui/Avatar";
import SectionHeader from "@/components/ui/SectionHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import EmployeForm from "@/components/forms/EmployeForm";
import PresenceChart from "@/components/dashboard/PresenceChart";
import DepartementsDonut from "@/components/dashboard/DepartementsDonut";
import ActiviteFeed from "@/components/dashboard/ActiviteFeed";
import RecrutementsListe from "@/components/dashboard/RecrutementsListe";
import EquipeDirection from "@/components/dashboard/EquipeDirection";
import { useEmployeePanel } from "@/components/EmployeeDetailPanel";
import { useDashboardStats, useEmployes } from "@/hooks/api";
import type { Employe } from "@/lib/types";

function buildDashboardEmployeColumns(): Column<Employe>[] {
  return [
    {
      key: "employe",
      header: "Employé",
      accessor: (e) => `${e.prenom} ${e.nom}`,
      render: (e) => (
        <div className="flex items-center gap-3 group">
          <Avatar
            nom={e.nom}
            prenom={e.prenom}
            size="sm"
            showStatus
            status={e.statut === "actif" ? "online" : "offline"}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900 transition group-hover:text-[#2F5F9D]">
              {e.prenom} {e.nom}
            </p>
            <p className="truncate text-xs text-slate-500">{e.poste ?? "—"}</p>
          </div>
          <Link
            href={`/employes/${e.id}`}
            onClick={(ev) => ev.stopPropagation()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#2F5F9D]/30 hover:bg-[#E8F0FA] hover:text-[#2F5F9D]"
            title="Fiche détaillée"
          >
            <span className="sr-only">Fiche</span>
            <span aria-hidden className="text-xs font-bold">
              ↗
            </span>
          </Link>
        </div>
      ),
    },
    {
      key: "departement",
      header: "Département",
      render: (e) => <span className="text-slate-600">{e.departement ?? "—"}</span>,
    },
    {
      key: "contrat",
      header: "Contrat",
      render: (e) => (
        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-700">
          {e.type_contrat ?? "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date d'entrée",
      render: (e) => (
        <span className="font-mono text-xs text-slate-600">
          {e.date_embauche ? new Date(e.date_embauche).toLocaleDateString("fr-FR") : "—"}
        </span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      align: "right",
      render: (e) => (
        <div className="flex justify-end">
          <StatBadge variant={e.statut === "actif" ? "actif" : e.statut === "suspendu" ? "suspendu" : "inactif"}>
            {e.statut}
          </StatBadge>
        </div>
      ),
    },
  ];
}

export default function DashboardPage() {
  const { openPanel } = useEmployeePanel();
  const { stats, isLoading: loadingStats, mutate: mutateStats } = useDashboardStats();
  const { employes, isLoading: loadingEmp, mutate: mutateEmp } = useEmployes({
    limit: 6,
    sort: "recent",
  });
  const [showAddModal, setShowAddModal] = useState(false);

  const employeColumns = useMemo(() => buildDashboardEmployeColumns(), []);

  const sparklines = useMemo(
    () => ({
      employes: stats?.sparklines?.employes ?? [0, 0, 0, 0, 0, 0, 0, 0],
      presents: stats?.sparklines?.presents ?? [0, 0, 0, 0, 0, 0, 0, 0],
      masse: stats?.sparklines?.masse_salariale ?? [0, 0, 0, 0, 0, 0, 0, 0],
      recr: stats?.sparklines?.recrutements ?? [0, 0, 0, 0, 0, 0, 0, 0],
    }),
    [stats]
  );

  return (
    <div className="space-y-7">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
      >
        <Button variant="ghost" icon={<Download className="h-4 w-4" />}>
          Exporter
        </Button>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
          Nouvel employé
        </Button>
      </motion.div>

      {/* KPI cards */}
      {loadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Employés"
            value={stats?.total_employes ?? 0}
            icon={Users}
            color="blue"
            trend={{
              value: stats?.tendances?.employes ?? 0,
              isPositive: (stats?.tendances?.employes ?? 0) >= 0,
            }}
            sparklineData={sparklines.employes}
            index={0}
          />
          <KPICard
            title="Présents aujourd'hui"
            value={stats?.presents_aujourd_hui ?? 0}
            icon={CheckCircle2}
            color="green"
            trend={{
              value: stats?.tendances?.presents ?? 0,
              isPositive: (stats?.tendances?.presents ?? 0) >= 0,
            }}
            sparklineData={sparklines.presents}
            index={1}
          />
          <KPICard
            title="Masse salariale"
            value={stats?.masse_salariale ?? 0}
            icon={Wallet}
            color="cyan"
            trend={{
              value: stats?.tendances?.masse_salariale ?? 0,
              isPositive: (stats?.tendances?.masse_salariale ?? 0) >= 0,
            }}
            sparklineData={sparklines.masse}
            format="currency"
            index={2}
          />
          <KPICard
            title="Recrutements"
            value={stats?.recrutements_ouverts ?? 0}
            icon={Briefcase}
            color="amber"
            sparklineData={sparklines.recr}
            index={3}
          />
        </div>
      )}

      {/* 2-col main section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          <PresenceChart />
          <DepartementsDonut />
        </div>
        <div className="lg:col-span-2 space-y-5">
          <ActiviteFeed />
          <RecrutementsListe />
        </div>
      </div>

      {/* Équipe de direction */}
      <EquipeDirection />

      {/* Derniers employés */}
      <GlassCard className="p-6">
        <SectionHeader
          title="Derniers employés ajoutés"
          subtitle="Les 6 dernières recrues"
          actions={
            <Link href="/employes">
              <Button variant="ghost" size="sm">
                Voir tous →
              </Button>
            </Link>
          }
        />
        <div className="mt-5">
          {loadingEmp ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              data={employes}
              columns={employeColumns}
              rowKey={(e) => e.id}
              onRowClick={(e) => openPanel(e)}
              emptyMessage="Aucun employé pour le moment. Cliquez sur « Nouvel employé » pour commencer."
            />
          )}
        </div>
      </GlassCard>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nouvel employé"
        description="Ajoutez un nouveau membre à votre équipe"
        size="lg"
      >
        <EmployeForm
          onSuccess={() => {
            setShowAddModal(false);
            mutateEmp();
            mutateStats();
          }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}

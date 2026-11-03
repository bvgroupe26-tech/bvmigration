"use client";

import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import DataTable, { type Column } from "@/components/ui/DataTable";
import GlassCard from "@/components/ui/GlassCard";
import KPICard from "@/components/ui/KPICard";
import StatBadge from "@/components/ui/StatBadge";
import { Wallet, Users, Landmark, Receipt } from "lucide-react";
import {
  BULLETIN_STATUT_LABELS,
  BULLETIN_TYPE_LABELS,
  bulletinStatutBadge,
  formatFcfa,
  type PayrollPeriod,
  type PeriodBulletinRow,
} from "@/lib/types-paie";

export default function PeriodeBulletinsTab({ periode }: { periode: PayrollPeriod }) {
  const c = periode.compteurs;

  const columns: Column<PeriodBulletinRow>[] = [
    {
      key: "employe",
      header: "Employé",
      sortable: true,
      accessor: (b) => `${b.employeNom} ${b.employePrenom}`,
      render: (b) => (
        <div className="flex items-center gap-3">
          <Avatar nom={b.employeNom || "?"} prenom={b.employePrenom} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {b.employePrenom} {b.employeNom}
            </p>
            <p className="truncate text-xs text-text-tertiary">{b.employePoste ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "numero",
      header: "N° bulletin",
      render: (b) => (
        <div>
          <span className="font-mono text-xs text-text-secondary">{b.numero ?? "—"}</span>
          {b.type !== "normal" && <p className="text-[10px] font-medium text-amber-700">{BULLETIN_TYPE_LABELS[b.type]}</p>}
        </div>
      ),
    },
    {
      key: "brut",
      header: "Brut",
      align: "right",
      sortable: true,
      accessor: (b) => b.brut ?? 0,
      render: (b) => <span className="font-mono text-xs text-text-secondary">{formatFcfa(b.brut)}</span>,
    },
    {
      key: "net",
      header: "Net à payer",
      align: "right",
      sortable: true,
      accessor: (b) => b.netAPayer ?? 0,
      render: (b) => <span className="font-mono text-sm font-bold text-slate-900">{formatFcfa(b.netAPayer)}</span>,
    },
    {
      key: "statut",
      header: "Statut",
      render: (b) => <StatBadge variant={bulletinStatutBadge(b.statut)}>{BULLETIN_STATUT_LABELS[b.statut]}</StatBadge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) => (
        <Link
          href={`/paie/${b.id}`}
          className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-text-secondary transition hover:bg-slate-100 hover:text-slate-900"
        >
          Voir
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {c && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Bulletins" value={c.total} icon={Users} color="blue" index={0} />
          <KPICard title="Masse brute" value={c.masseBrute} icon={Receipt} color="cyan" format="currency" index={1} />
          <KPICard title="Net à payer" value={c.masseNette} icon={Wallet} color="green" format="currency" index={2} />
          <KPICard title="Charges patronales" value={c.chargesPatronales} icon={Landmark} color="amber" format="currency" index={3} />
        </div>
      )}
      <GlassCard className="p-5">
        <DataTable
          data={periode.bulletins}
          columns={columns}
          rowKey={(b) => b.id}
          searchable
          searchKeys={[(b) => `${b.employePrenom} ${b.employeNom}`, (b) => b.numero]}
          searchPlaceholder="Rechercher un employé ou un numéro…"
          pagination
          pageSize={15}
          emptyMessage="Aucun bulletin. Lancez le calcul de la période pour générer les bulletins."
        />
      </GlassCard>
    </div>
  );
}

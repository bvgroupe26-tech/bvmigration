"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BudgetSubNav from "@/components/budget/BudgetSubNav";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import StatBadge from "@/components/ui/StatBadge";
import BudgetEnveloppeForm from "@/components/forms/BudgetEnveloppeForm";
import { useBudgetEnveloppes } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { formatFCFA } from "@/lib/utils";
import type { BudgetEnveloppe } from "@/lib/types";

export default function BudgetEnveloppesPage() {
  const year = new Date().getFullYear();
  const [annee, setAnnee] = useState(year);
  const { enveloppes, isLoading, mutate } = useBudgetEnveloppes({ annee });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<BudgetEnveloppe | null>(null);
  const [deleting, setDeleting] = useState<BudgetEnveloppe | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  const statutVariant = (s: BudgetEnveloppe["statut"]) => {
    if (s === "actif") return "actif" as const;
    if (s === "clos") return "clos" as const;
    return "brouillon" as const;
  };

  const columns: Column<BudgetEnveloppe>[] = [
    { key: "libelle", header: "Enveloppe", render: (e) => <span className="font-medium text-slate-900">{e.libelle}</span> },
    { key: "dep", header: "Département", render: (e) => e.departement ?? "—" },
    { key: "annee", header: "Année", render: (e) => <span className="font-mono">{e.annee}</span> },
    {
      key: "prevu",
      header: "Prévu",
      align: "right",
      render: (e) => <span className="font-mono">{formatFCFA(e.montant_prevu)}</span>,
    },
    {
      key: "real",
      header: "Réalisé",
      align: "right",
      render: (e) => <span className="font-mono text-emerald-800">{formatFCFA(e.montant_realise ?? 0)}</span>,
    },
    {
      key: "ecart",
      header: "Écart",
      align: "right",
      render: (e) => (
        <span className="font-mono font-semibold text-slate-900">{formatFCFA(e.ecart ?? e.montant_prevu - (e.montant_realise ?? 0))}</span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (e) => <StatBadge variant={statutVariant(e.statut)}>{e.statut}</StatBadge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" className="h-9 w-9 p-0" onClick={() => setEditing(e)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" className="h-9 w-9 p-0 text-red-600" onClick={() => setDeleting(e)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  async function confirmDelete() {
    if (!deleting) return;
    setBusyDel(true);
    try {
      await apiClient.del(`/budget/enveloppes/${deleting.id}`);
      toast.success("Enveloppe supprimée (dépenses associées supprimées)");
      mutate();
      setDeleting(null);
    } catch (e) {
      toast.error(getUserErrorMessage(e));
    } finally {
      setBusyDel(false);
    }
  }

  return (
    <div className="space-y-6">
      <BudgetSubNav />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader title="Enveloppes budgétaires" subtitle="Lignes de budget par exercice et département" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Exercice</label>
          <input
            type="number"
            min={2000}
            max={2100}
            value={annee}
            onChange={(e) => setAnnee(Number(e.target.value))}
            className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono"
          />
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Nouvelle enveloppe
          </Button>
        </div>
      </div>
      <GlassCard className="p-0">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <DataTable
            columns={columns}
            data={enveloppes}
            rowKey={(e) => e.id}
            emptyMessage="Aucune enveloppe pour cet exercice."
          />
        )}
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle enveloppe">
        <BudgetEnveloppeForm
          defaultAnnee={annee}
          onCancel={() => setShowAdd(false)}
          onSuccess={() => {
            mutate();
            setShowAdd(false);
          }}
        />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier l'enveloppe">
        {editing && (
          <BudgetEnveloppeForm
            enveloppe={editing}
            onCancel={() => setEditing(null)}
            onSuccess={() => {
              mutate();
              setEditing(null);
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Supprimer l'enveloppe ?"
        description={deleting ? `« ${deleting.libelle} » et toutes les dépenses liées seront supprimées.` : ""}
        confirmLabel="Supprimer"
        variant="danger"
        loading={busyDel}
      />
    </div>
  );
}

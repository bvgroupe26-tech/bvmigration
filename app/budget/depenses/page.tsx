"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, Check, X } from "lucide-react";
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
import BudgetDepenseForm from "@/components/forms/BudgetDepenseForm";
import { useBudgetDepenses, useBudgetEnveloppes, useBudgetCategories } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { formatFCFA } from "@/lib/utils";
import type { BudgetDepense } from "@/lib/types";

export default function BudgetDepensesPage() {
  const [statut, setStatut] = useState<string>("all");
  const { depenses, isLoading, mutate } = useBudgetDepenses({
    statut: statut === "all" ? undefined : statut,
  });
  const { enveloppes } = useBudgetEnveloppes();
  const { categories } = useBudgetCategories();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<BudgetDepense | null>(null);
  const [deleting, setDeleting] = useState<BudgetDepense | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  async function setStatutRow(d: BudgetDepense, s: BudgetDepense["statut"]) {
    try {
      await apiClient.put(`/budget/depenses/${d.id}`, { statut: s });
      toast.success("Statut mis à jour");
      mutate();
    } catch (e) {
      toast.error(getUserErrorMessage(e));
    }
  }

  const badgeVariant = (s: BudgetDepense["statut"]) => {
    if (s === "paye") return "paye" as const;
    if (s === "approuve") return "approuve" as const;
    if (s === "refuse") return "refuse" as const;
    return "en_attente" as const;
  };

  const columns: Column<BudgetDepense>[] = [
    {
      key: "date",
      header: "Date",
      render: (d) => <span className="font-mono text-sm">{d.date_depense}</span>,
    },
    { key: "libelle", header: "Libellé", render: (d) => <span className="font-medium text-slate-900">{d.libelle}</span> },
    {
      key: "env",
      header: "Enveloppe",
      render: (d) => <span className="text-sm text-slate-600">{d.enveloppe_libelle ?? "—"}</span>,
    },
    {
      key: "cat",
      header: "Catégorie",
      render: (d) => <span className="text-sm text-slate-600">{d.categorie_libelle ?? "—"}</span>,
    },
    {
      key: "montant",
      header: "Montant",
      align: "right",
      render: (d) => <span className="font-mono font-semibold">{formatFCFA(d.montant)}</span>,
    },
    {
      key: "statut",
      header: "Statut",
      render: (d) => <StatBadge variant={badgeVariant(d.statut)}>{d.statut.replace("_", " ")}</StatBadge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (d) => (
        <div className="flex flex-wrap justify-end gap-1">
          {d.statut === "en_attente" && (
            <>
              <Button type="button" variant="ghost" className="h-8 px-2 text-emerald-700" onClick={() => setStatutRow(d, "approuve")} title="Approuver">
                <Check className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" className="h-8 px-2 text-red-600" onClick={() => setStatutRow(d, "refuse")} title="Refuser">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          {d.statut === "approuve" && (
            <Button type="button" variant="ghost" className="h-8 px-2 text-[#2F5F9D]" onClick={() => setStatutRow(d, "paye")} title="Marquer payé">
              Payé
            </Button>
          )}
          <Button type="button" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(d)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => setDeleting(d)}>
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
      await apiClient.del(`/budget/depenses/${deleting.id}`);
      toast.success("Dépense supprimée");
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
      <SectionHeader
        title="Dépenses"
        subtitle="Saisie et validation du reporting budgétaire"
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              if (!enveloppes.length) {
                toast.error("Créez d'abord une enveloppe budgétaire");
                return;
              }
              setShowAdd(true);
            }}
          >
            Nouvelle dépense
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600">Filtrer :</span>
        {(["all", "en_attente", "approuve", "paye", "refuse"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatut(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statut === s ? "bv-tab-active" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {s === "all" ? "Tous" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <GlassCard className="p-0">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <DataTable columns={columns} data={depenses} rowKey={(d) => d.id} emptyMessage="Aucune dépense enregistrée." />
        )}
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle dépense" size="lg">
        <BudgetDepenseForm
          enveloppes={enveloppes}
          categories={categories}
          onCancel={() => setShowAdd(false)}
          onSuccess={() => {
            mutate();
            setShowAdd(false);
          }}
        />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier la dépense" size="lg">
        {editing && (
          <BudgetDepenseForm
            depense={editing}
            enveloppes={enveloppes}
            categories={categories}
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
        title="Supprimer cette dépense ?"
        description={deleting ? `« ${deleting.libelle} » (${formatFCFA(deleting.montant)}) sera supprimée.` : ""}
        confirmLabel="Supprimer"
        variant="danger"
        loading={busyDel}
      />
    </div>
  );
}

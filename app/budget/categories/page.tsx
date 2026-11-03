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
import BudgetCategoryForm from "@/components/forms/BudgetCategoryForm";
import { useFinanceCategories } from "@/hooks/budget";
import { apiClient } from "@/lib/fetcher";
import { getUserErrorMessage } from "@/lib/api-errors";
import type { CategorieFinance } from "@/lib/types-finance";

export default function BudgetCategoriesPage() {
  const { categories, isLoading, mutate } = useFinanceCategories();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CategorieFinance | null>(null);
  const [deleting, setDeleting] = useState<CategorieFinance | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  const columns: Column<CategorieFinance>[] = [
    {
      key: "code",
      header: "Code",
      render: (c) => <span className="font-mono font-semibold text-slate-900">{c.code}</span>,
    },
    { key: "libelle", header: "Libellé", render: (c) => c.libelle },
    {
      key: "compte",
      header: "Compte SYSCOHADA",
      render: (c) =>
        c.compte_syscohada ? (
          <span className="font-mono text-sm text-slate-800">{c.compte_syscohada}</span>
        ) : (
          <span className="text-xs font-medium text-amber-700">Non renseigné</span>
        ),
    },
    {
      key: "desc",
      header: "Description",
      render: (c) => <span className="line-clamp-2 text-sm text-slate-600">{c.description ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" className="h-9 w-9 p-0" onClick={() => setEditing(c)} aria-label="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" className="h-9 w-9 p-0 text-red-600" onClick={() => setDeleting(c)} aria-label="Supprimer">
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
      await apiClient.del(`/budget/categories/${deleting.id}`);
      toast.success("Catégorie supprimée");
      void mutate();
      setDeleting(null);
    } catch (e) {
      toast.error(getUserErrorMessage(e));
    } finally {
      setBusyDel(false);
    }
  }

  const sansCompte = categories.filter((c) => !c.compte_syscohada).length;

  return (
    <div className="space-y-6">
      <BudgetSubNav />
      <SectionHeader
        title="Catégories de dépenses"
        subtitle="Classification des dépenses et rattachement au plan comptable SYSCOHADA"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Nouvelle catégorie
          </Button>
        }
      />
      {sansCompte > 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {sansCompte} catégorie{sansCompte > 1 ? "s n'ont" : " n'a"} pas de compte SYSCOHADA : l&apos;export comptable
          sera incomplet.
        </p>
      ) : null}
      <GlassCard className="p-0">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <DataTable
            columns={columns}
            data={categories}
            rowKey={(c) => c.id}
            emptyMessage="Aucune catégorie. Créez-en une pour classer vos dépenses."
          />
        )}
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle catégorie">
        {showAdd ? (
          <BudgetCategoryForm
            onCancel={() => setShowAdd(false)}
            onSuccess={() => {
              void mutate();
              setShowAdd(false);
            }}
          />
        ) : null}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier la catégorie">
        {editing ? (
          <BudgetCategoryForm
            categorie={editing}
            onCancel={() => setEditing(null)}
            onSuccess={() => {
              void mutate();
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Supprimer la catégorie ?"
        description={deleting ? `« ${deleting.code} — ${deleting.libelle} » sera supprimée si aucune dépense ne l'utilise.` : ""}
        confirmLabel="Supprimer"
        variant="danger"
        loading={busyDel}
      />
    </div>
  );
}

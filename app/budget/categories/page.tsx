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
import { useBudgetCategories } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import type { BudgetCategorie } from "@/lib/types";

export default function BudgetCategoriesPage() {
  const { categories, isLoading, mutate } = useBudgetCategories();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<BudgetCategorie | null>(null);
  const [deleting, setDeleting] = useState<BudgetCategorie | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  const columns: Column<BudgetCategorie>[] = [
    { key: "code", header: "Code", render: (c) => <span className="font-mono font-semibold text-slate-900">{c.code}</span> },
    { key: "libelle", header: "Libellé", render: (c) => c.libelle },
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
        title="Catégories de dépenses"
        subtitle="Classifiez les dépenses (formation, IT, recrutement, etc.)"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Nouvelle catégorie
          </Button>
        }
      />
      <GlassCard className="p-0">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <DataTable
            columns={columns}
            data={categories}
            rowKey={(c) => c.id}
            emptyMessage="Aucune catégorie. Créez-en une pour lier vos dépenses."
          />
        )}
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle catégorie">
        <BudgetCategoryForm
          onCancel={() => setShowAdd(false)}
          onSuccess={() => {
            mutate();
            setShowAdd(false);
          }}
        />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier la catégorie">
        {editing && (
          <BudgetCategoryForm
            categorie={editing}
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
        title="Supprimer la catégorie ?"
        description={deleting ? `« ${deleting.code} — ${deleting.libelle} » sera supprimée si aucune dépense ne l’utilise.` : ""}
        confirmLabel="Supprimer"
        variant="danger"
        loading={busyDel}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BudgetSubNav from "@/components/budget/BudgetSubNav";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import SearchField from "@/components/ui/SearchField";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import BudgetFournisseurForm from "@/components/forms/BudgetFournisseurForm";
import { useAuth } from "@/context/AuthContext";
import { useFournisseurs } from "@/hooks/budget";
import { deleteFournisseur } from "@/lib/budget-api";
import { getUserErrorMessage } from "@/lib/api-errors";
import { normalizeAppRole } from "@/lib/session";
import type { Fournisseur } from "@/lib/types-finance";

export default function BudgetFournisseursPage() {
  const { user } = useAuth();
  const role = normalizeAppRole(user?.role);
  const canWrite = role === "rh" || role === "admin";
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { fournisseurs, isLoading, error, mutate } = useFournisseurs(q);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [deleting, setDeleting] = useState<Fournisseur | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const columns: Column<Fournisseur>[] = [
    {
      key: "nom",
      header: "Fournisseur",
      render: (f) => (
        <div>
          <p className="font-medium text-slate-900">{f.nom}</p>
          {f.adresse ? <p className="line-clamp-1 text-[11px] text-slate-500">{f.adresse}</p> : null}
        </div>
      ),
    },
    { key: "niu", header: "NIU", render: (f) => <span className="font-mono text-xs">{f.niu ?? "—"}</span> },
    { key: "rccm", header: "RCCM", render: (f) => <span className="font-mono text-xs">{f.rccm ?? "—"}</span> },
    {
      key: "contact",
      header: "Contact",
      render: (f) => (
        <div className="text-xs text-slate-600">
          <p>{f.telephone ?? "—"}</p>
          {f.email ? <p className="text-slate-400">{f.email}</p> : null}
        </div>
      ),
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (f: Fournisseur) => (
              <div className="flex justify-end gap-1">
                <Button type="button" variant="ghost" className="h-9 w-9 p-0" onClick={() => setEditing(f)} aria-label="Modifier">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 p-0 text-red-600"
                  onClick={() => setDeleting(f)}
                  aria-label="Archiver"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  async function confirmDelete() {
    if (!deleting) return;
    setBusyDel(true);
    try {
      await deleteFournisseur(deleting.id);
      toast.success("Fournisseur archivé");
      void mutate();
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
        title="Fournisseurs"
        subtitle="Référentiel des fournisseurs (NIU, RCCM, contacts)"
        actions={
          canWrite ? (
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
              Nouveau fournisseur
            </Button>
          ) : undefined
        }
      />
      <SearchField
        placeholder="Rechercher par nom ou NIU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        wrapperClassName="max-w-md"
      />
      <GlassCard className="p-0">
        {isLoading && fournisseurs.length === 0 ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-600">{getUserErrorMessage(error)}</p>
            <Button variant="primary" className="mt-4" onClick={() => void mutate()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={fournisseurs.filter((f) => f.actif)}
            rowKey={(f) => f.id}
            pagination
            pageSize={20}
            emptyMessage="Aucun fournisseur."
          />
        )}
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouveau fournisseur" size="lg">
        {showAdd ? (
          <BudgetFournisseurForm
            onCancel={() => setShowAdd(false)}
            onSuccess={() => {
              void mutate();
              setShowAdd(false);
            }}
          />
        ) : null}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier le fournisseur" size="lg">
        {editing ? (
          <BudgetFournisseurForm
            fournisseur={editing}
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
        title="Archiver ce fournisseur ?"
        description={deleting ? `« ${deleting.nom} » ne sera plus proposé. Les dépenses existantes restent rattachées.` : ""}
        confirmLabel="Archiver"
        variant="warning"
        loading={busyDel}
      />
    </div>
  );
}

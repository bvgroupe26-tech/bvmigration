"use client";

import { useMemo, useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BudgetSubNav from "@/components/budget/BudgetSubNav";
import BudgetYearSelect from "@/components/budget/BudgetYearSelect";
import ConsumptionBar from "@/components/budget/ConsumptionBar";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import StatBadge from "@/components/ui/StatBadge";
import BudgetEnveloppeForm from "@/components/forms/BudgetEnveloppeForm";
import { useFinanceEnveloppes, useFinanceSynthese } from "@/hooks/budget";
import { apiClient } from "@/lib/fetcher";
import { getUserErrorMessage } from "@/lib/api-errors";
import { formatFCFA } from "@/lib/utils";
import type { AlerteBudget, EnveloppeFinance } from "@/lib/types-finance";

type Row = EnveloppeFinance & { engage: number; realise: number; disponible: number; alerte: AlerteBudget };

const STATUT_LABELS = { actif: "Actif", clos: "Clos", brouillon: "Brouillon" } as const;

export default function BudgetEnveloppesPage() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const { enveloppes, isLoading, mutate } = useFinanceEnveloppes({ annee });
  const { synthese, mutate: mutateSynthese } = useFinanceSynthese(annee);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<EnveloppeFinance | null>(null);
  const [deleting, setDeleting] = useState<EnveloppeFinance | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map((synthese?.par_enveloppe ?? []).map((s) => [s.id, s]));
    return enveloppes.map((e) => {
      const s = byId.get(e.id);
      const engage = s?.engage ?? 0;
      const realise = s?.realise ?? 0;
      return {
        ...e,
        engage,
        realise,
        disponible: s?.disponible ?? e.montant_prevu - engage - realise,
        alerte: s?.alerte ?? "ok",
      };
    });
  }, [enveloppes, synthese]);

  function refresh() {
    void mutate();
    void mutateSynthese();
  }

  const columns: Column<Row>[] = [
    {
      key: "libelle",
      header: "Enveloppe",
      render: (e) => (
        <div>
          <p className="font-medium text-slate-900">{e.libelle}</p>
          <p className="text-[11px] text-slate-500">{e.departement ?? "Sans département"}</p>
        </div>
      ),
    },
    {
      key: "prevu",
      header: "Prévu",
      align: "right",
      render: (e) => <span className="font-mono">{formatFCFA(e.montant_prevu)}</span>,
    },
    {
      key: "engage",
      header: "Engagé",
      align: "right",
      render: (e) => <span className="font-mono text-sky-800">{formatFCFA(e.engage)}</span>,
    },
    {
      key: "realise",
      header: "Réalisé",
      align: "right",
      render: (e) => <span className="font-mono text-emerald-800">{formatFCFA(e.realise)}</span>,
    },
    {
      key: "dispo",
      header: "Disponible",
      align: "right",
      render: (e) => (
        <span className={`font-mono font-semibold ${e.disponible < 0 ? "text-red-700" : "text-slate-900"}`}>
          {formatFCFA(e.disponible)}
        </span>
      ),
    },
    {
      key: "conso",
      header: "Consommation",
      render: (e) => (
        <ConsumptionBar
          prevu={e.montant_prevu}
          engage={e.engage}
          realise={e.realise}
          alerte={e.alerte}
          seuilPct={e.seuil_alerte_pct}
        />
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (e) => (
        <div className="flex items-center gap-1.5">
          <StatBadge variant={e.statut === "actif" ? "actif" : e.statut === "clos" ? "clos" : "brouillon"}>
            {STATUT_LABELS[e.statut]}
          </StatBadge>
          {e.bloquer_depassement ? (
            <span title="Dépassement bloqué">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" className="h-9 w-9 p-0" onClick={() => setEditing(e)} aria-label="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-9 p-0 text-red-600"
            onClick={() => setDeleting(e)}
            aria-label="Supprimer"
          >
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
      toast.success("Enveloppe supprimée");
      refresh();
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
        <SectionHeader title="Enveloppes budgétaires" subtitle="Lignes de budget par exercice et centre de coût" />
        <div className="flex flex-wrap items-center gap-2">
          <BudgetYearSelect value={annee} onChange={setAnnee} />
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Nouvelle enveloppe
          </Button>
        </div>
      </div>
      <GlassCard className="p-0">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <DataTable columns={columns} data={rows} rowKey={(e) => e.id} emptyMessage="Aucune enveloppe pour cet exercice." />
        )}
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle enveloppe" size="lg">
        {showAdd ? (
          <BudgetEnveloppeForm
            defaultAnnee={annee}
            onCancel={() => setShowAdd(false)}
            onSuccess={() => {
              refresh();
              setShowAdd(false);
            }}
          />
        ) : null}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier l'enveloppe" size="lg">
        {editing ? (
          <BudgetEnveloppeForm
            enveloppe={editing}
            onCancel={() => setEditing(null)}
            onSuccess={() => {
              refresh();
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Supprimer l'enveloppe ?"
        description={
          deleting
            ? `« ${deleting.libelle} » sera supprimée. Une enveloppe qui porte des dépenses ne peut pas être supprimée : clôturez-la plutôt.`
            : ""
        }
        confirmLabel="Supprimer"
        variant="danger"
        loading={busyDel}
      />
    </div>
  );
}

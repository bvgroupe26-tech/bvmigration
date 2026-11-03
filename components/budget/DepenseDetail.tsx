"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Pencil } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import DepenseStatutBadge from "@/components/budget/DepenseStatutBadge";
import DepenseActions from "@/components/budget/DepenseActions";
import DepenseTimeline from "@/components/budget/DepenseTimeline";
import PiecesJointes from "@/components/budget/PiecesJointes";
import BudgetDepenseForm from "@/components/forms/BudgetDepenseForm";
import { useAuth } from "@/context/AuthContext";
import {
  useFinanceCategories,
  useFinanceDepense,
  useFinanceEnveloppes,
  useParametresFinance,
} from "@/hooks/budget";
import {
  MODE_PAIEMENT_LABELS,
  depensePermissions,
  needsJustificatif,
} from "@/lib/budget-depense-utils";
import { getUserErrorMessage } from "@/lib/api-errors";
import { formatFCFA } from "@/lib/utils";

type Props = {
  id: number | string;
  backHref: string;
  /** Vue RH/finance : référentiel fournisseurs et informations comptables. */
  staffView?: boolean;
};

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children || "—"}</dd>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

export default function DepenseDetail({ id, backHref, staffView = true }: Props) {
  const { user } = useAuth();
  const { depense, isLoading, error, mutate } = useFinanceDepense(id);
  const { parametres } = useParametresFinance();
  const [editing, setEditing] = useState(false);
  const { enveloppes } = useFinanceEnveloppes({ statut: "actif" }, editing);
  const { categories } = useFinanceCategories(editing);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !depense) {
    return (
      <GlassCard className="p-6 text-center">
        <p className="text-sm text-slate-600">{error ? getUserErrorMessage(error) : "Dépense introuvable."}</p>
        <Link href={backHref} className="mt-4 inline-block text-sm font-medium text-[#2F5F9D] hover:underline">
          Retour à la liste
        </Link>
      </GlassCard>
    );
  }

  const perms = depensePermissions(depense, user ? { id: user.id, role: user.role } : null, parametres);
  const justificatifRequis = needsJustificatif(depense.montant_ttc, parametres);
  const justificatifManquant = justificatifRequis && depense.pieces.length === 0;

  return (
    <div className="space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Retour aux dépenses
      </Link>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{depense.numero}</p>
            <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {depense.libelle}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DepenseStatutBadge statut={depense.statut} />
              {perms.needsN2 && (depense.statut === "soumise" || depense.statut === "validee_n1") ? (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200">
                  Double validation requise
                </span>
              ) : null}
            </div>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Montant TTC</p>
            <p className="font-mono text-2xl font-bold text-slate-900 sm:text-3xl">{formatFCFA(depense.montant_ttc)}</p>
            <p className="text-xs text-slate-500">
              HT {formatFCFA(depense.montant_ht)} · TVA {depense.taux_tva} % ({formatFCFA(depense.montant_tva)})
            </p>
          </div>
        </div>

        {depense.statut === "refusee" && depense.motif_refus ? (
          <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Motif du refus :</strong> {depense.motif_refus}
            </span>
          </div>
        ) : null}
        {justificatifManquant && perms.canSubmit ? (
          <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Une pièce justificative est obligatoire pour ce montant avant la soumission.
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {perms.canEdit ? (
            <Button type="button" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
              Modifier
            </Button>
          ) : null}
          <DepenseActions
            depense={depense}
            perms={perms}
            justificatifManquant={justificatifManquant}
            onDone={() => void mutate()}
          />
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Date de la dépense">{formatDate(depense.date_depense)}</Info>
            <Info label="Demandeur">{depense.demandeur_nom}</Info>
            <Info label="Enveloppe">
              {depense.enveloppe_libelle}
              {depense.enveloppe_annee ? ` (${depense.enveloppe_annee})` : ""}
            </Info>
            <Info label="Catégorie">{depense.categorie_libelle}</Info>
            {staffView ? <Info label="Compte SYSCOHADA">{depense.compte_syscohada}</Info> : null}
            <Info label="Fournisseur">{depense.fournisseur_nom}</Info>
            <Info label="Réf. facture / pièce">{depense.reference_piece}</Info>
            {depense.statut === "payee" ? (
              <>
                <Info label="Mode de paiement">
                  {depense.mode_paiement ? MODE_PAIEMENT_LABELS[depense.mode_paiement] : ""}
                </Info>
                <Info label="Référence de paiement">{depense.reference_paiement}</Info>
                <Info label="Payée le">{formatDate(depense.date_paiement)}</Info>
              </>
            ) : null}
          </dl>
          {depense.commentaire ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{depense.commentaire}</p>
          ) : null}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <PiecesJointes
              depenseId={depense.id}
              pieces={depense.pieces}
              editable={perms.canManagePieces}
              required={justificatifRequis}
              onChanged={() => void mutate()}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <DepenseTimeline historique={depense.historique} />
        </GlassCard>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Modifier la dépense" size="lg">
        {editing ? (
          <BudgetDepenseForm
            depense={depense}
            enveloppes={enveloppes}
            categories={categories}
            parametres={parametres}
            allowFournisseur={staffView}
            onCancel={() => setEditing(false)}
            onSuccess={() => {
              setEditing(false);
              void mutate();
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}

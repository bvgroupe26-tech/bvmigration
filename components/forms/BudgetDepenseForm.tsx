"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import MoneyInput from "@/components/ui/MoneyInput";
import Button from "@/components/ui/Button";
import FournisseurPicker from "@/components/budget/FournisseurPicker";
import { createDepense, updateDepense, type DepensePayload } from "@/lib/budget-api";
import { computeTva, needsJustificatif } from "@/lib/budget-depense-utils";
import { getUserErrorMessage } from "@/lib/api-errors";
import { localDateISO } from "@/lib/date-local";
import { formatFCFA } from "@/lib/utils";
import type {
  CategorieFinance,
  DepenseFinance,
  EnveloppeFinance,
  ParametresFinance,
} from "@/lib/types-finance";

type Props = {
  depense?: DepenseFinance | null;
  enveloppes: EnveloppeFinance[];
  categories: CategorieFinance[];
  parametres?: ParametresFinance | null;
  /** Le référentiel fournisseurs est réservé au staff. */
  allowFournisseur?: boolean;
  defaultEnveloppeId?: number;
  onSuccess?: (depenseId: number | null) => void;
  onCancel?: () => void;
};

type FormState = {
  libelle: string;
  enveloppeId: number | "";
  categorieId: number | "";
  fournisseurId: number | null;
  fournisseurNom: string | null;
  montantHt: number;
  tauxTva: number;
  dateDepense: string;
  referencePiece: string;
  commentaire: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

function createdId(raw: unknown): number | null {
  if (raw && typeof raw === "object" && "id" in raw) {
    const n = Number((raw as { id: unknown }).id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export default function BudgetDepenseForm({
  depense,
  enveloppes,
  categories,
  parametres,
  allowFournisseur = true,
  defaultEnveloppeId,
  onSuccess,
  onCancel,
}: Props) {
  const isEdit = !!depense;
  const tvaDefaut = parametres?.taux_tva_defaut ?? 18;
  const [form, setForm] = useState<FormState>(() => ({
    libelle: depense?.libelle ?? "",
    enveloppeId: depense?.enveloppe_id || defaultEnveloppeId || "",
    categorieId: depense?.categorie_id ?? "",
    fournisseurId: depense?.fournisseur_id ?? null,
    fournisseurNom: depense?.fournisseur_nom ?? null,
    montantHt: depense?.montant_ht ?? 0,
    tauxTva: depense ? depense.taux_tva : tvaDefaut,
    dateDepense: depense?.date_depense || localDateISO(),
    referencePiece: depense?.reference_piece ?? "",
    commentaire: depense?.commentaire ?? "",
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const annee = Number(form.dateDepense.slice(0, 4)) || new Date().getFullYear();
  const enveloppesDispo = useMemo(
    () =>
      enveloppes.filter(
        (e) => (e.statut === "actif" && e.annee === annee) || e.id === depense?.enveloppe_id
      ),
    [enveloppes, annee, depense?.enveloppe_id]
  );
  const montants = computeTva(form.montantHt, form.tauxTva);
  const justificatif = needsJustificatif(montants.ttc, parametres);
  const enveloppeHorsExercice =
    form.enveloppeId !== "" && !enveloppesDispo.some((e) => e.id === form.enveloppeId);

  function validate(): Errors {
    const e: Errors = {};
    if (form.libelle.trim().length < 2) e.libelle = "Libellé requis";
    if (form.enveloppeId === "") e.enveloppeId = "Choisissez l'enveloppe à imputer";
    else if (enveloppeHorsExercice) e.enveloppeId = `Cette enveloppe n'est pas active sur l'exercice ${annee}`;
    if (!(form.montantHt > 0)) e.montantHt = "Montant HT > 0 requis";
    if (form.tauxTva < 0 || form.tauxTva > 100) e.tauxTva = "Taux entre 0 et 100";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateDepense)) e.dateDepense = "Date requise";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    const payload: DepensePayload = {
      enveloppeId: Number(form.enveloppeId),
      categorieId: form.categorieId === "" ? null : Number(form.categorieId),
      fournisseurId: allowFournisseur ? form.fournisseurId : (depense?.fournisseur_id ?? null),
      libelle: form.libelle.trim(),
      montantHt: montants.ht,
      tauxTva: form.tauxTva,
      dateDepense: form.dateDepense,
      referencePiece: form.referencePiece.trim() || undefined,
      commentaire: form.commentaire.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateDepense(depense.id, payload);
        toast.success("Dépense mise à jour");
        onSuccess?.(depense.id);
      } else {
        const raw = await createDepense(payload);
        toast.success("Brouillon enregistré. Ajoutez les justificatifs puis soumettez-le.");
        onSuccess?.(createdId(raw));
      }
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {!isEdit ? (
        <p className="rounded-xl border border-[#d9e4f5] bg-[#f4f8ff] px-3 py-2 text-xs text-[#1F3F73]">
          La dépense est créée en <strong>brouillon</strong>. Vous pourrez joindre la facture ou le reçu, puis la
          soumettre pour validation.
        </p>
      ) : null}

      <Field label="Libellé de la dépense" required error={errors.libelle}>
        <Input
          value={form.libelle}
          onChange={(e) => set("libelle", e.target.value)}
          placeholder="Ex. Achat fournitures bureau"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date de la dépense" required error={errors.dateDepense}>
          <Input type="date" value={form.dateDepense} onChange={(e) => set("dateDepense", e.target.value)} />
        </Field>
        <Field
          label="Enveloppe budgétaire"
          required
          error={errors.enveloppeId}
          hint={enveloppesDispo.length === 0 ? `Aucune enveloppe active pour ${annee}` : undefined}
        >
          <NativeSelect
            value={form.enveloppeId}
            onChange={(e) => set("enveloppeId", e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">— Choisir —</option>
            {enveloppesDispo.map((e) => (
              <option key={e.id} value={e.id}>
                {e.libelle}
                {e.departement ? ` · ${e.departement}` : ""} ({e.annee})
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Catégorie" hint="Détermine le compte SYSCOHADA">
          <NativeSelect
            value={form.categorieId}
            onChange={(e) => set("categorieId", e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">— Aucune —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.libelle}
                {c.compte_syscohada ? ` (${c.compte_syscohada})` : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {allowFournisseur ? (
          <Field label="Fournisseur">
            <FournisseurPicker
              value={form.fournisseurId}
              label={form.fournisseurNom}
              onChange={(id, nom) => {
                set("fournisseurId", id);
                set("fournisseurNom", nom);
              }}
            />
          </Field>
        ) : (
          <Field label="Réf. facture / reçu">
            <Input value={form.referencePiece} onChange={(e) => set("referencePiece", e.target.value)} />
          </Field>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Montant HT (FCFA)" required error={errors.montantHt}>
            <MoneyInput value={form.montantHt} onChange={(v) => set("montantHt", v)} />
          </Field>
          <Field label="TVA (%)" error={errors.tauxTva} hint={`Défaut : ${tvaDefaut} %`}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="any"
              value={Number.isFinite(form.tauxTva) ? form.tauxTva : ""}
              onChange={(e) => set("tauxTva", e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </Field>
          <div className="flex flex-col justify-end gap-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>TVA</span>
              <span className="font-mono">{formatFCFA(montants.tva)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
              <span>Total TTC</span>
              <span className="font-mono">{formatFCFA(montants.ttc)}</span>
            </div>
          </div>
        </div>
        {justificatif ? (
          <p className="mt-3 text-xs font-medium text-amber-800">
            Au-delà de {formatFCFA(parametres?.seuil_justificatif ?? 0)}, une pièce justificative sera exigée à la
            soumission.
          </p>
        ) : null}
      </div>

      {allowFournisseur ? (
        <Field label="Réf. facture / pièce">
          <Input value={form.referencePiece} onChange={(e) => set("referencePiece", e.target.value)} />
        </Field>
      ) : null}

      <Field label="Commentaire">
        <Textarea rows={3} value={form.commentaire} onChange={(e) => set("commentaire", e.target.value)} />
      </Field>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={submitting}>
          {isEdit ? "Enregistrer" : "Créer le brouillon"}
        </Button>
      </div>
    </form>
  );
}

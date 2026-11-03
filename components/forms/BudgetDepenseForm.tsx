"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { budgetDepenseSchema, type BudgetDepenseInput } from "@/lib/schemas";
import { apiClient, getUserErrorMessage } from "@/lib/fetcher";
import {
  DEFAULT_BUDGET_ENVELOPPE_LABEL,
  depenseToApiPayload,
  isDefaultBudgetEnveloppe,
  resolveEnveloppeIdForDepense,
} from "@/lib/budget-depense-utils";
import { localDateISO } from "@/lib/date-local";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import type { BudgetDepense, BudgetEnveloppe, BudgetCategorie } from "@/lib/types";

type Props = {
  depense?: BudgetDepense | null;
  enveloppes: BudgetEnveloppe[];
  categories: BudgetCategorie[];
  defaultEnveloppeId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
};

function initialEnveloppeId(
  depense: BudgetDepense | null | undefined,
  defaultEnveloppeId?: number
): number | undefined {
  if (depense) {
    if (isDefaultBudgetEnveloppe(depense.enveloppe_libelle)) return undefined;
    return depense.enveloppe_id > 0 ? depense.enveloppe_id : undefined;
  }
  return defaultEnveloppeId && defaultEnveloppeId > 0 ? defaultEnveloppeId : undefined;
}

export default function BudgetDepenseForm({
  depense,
  enveloppes,
  categories,
  defaultEnveloppeId,
  onSuccess,
  onCancel,
}: Props) {
  const isEdit = !!depense;
  const dedicatedEnveloppes = enveloppes.filter((e) => !isDefaultBudgetEnveloppe(e.libelle));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetDepenseInput>({
    resolver: zodResolver(budgetDepenseSchema) as unknown as Resolver<BudgetDepenseInput>,
    defaultValues: {
      enveloppe_id: initialEnveloppeId(depense, defaultEnveloppeId),
      libelle: depense?.libelle ?? "",
      montant: depense?.montant ?? 0,
      date_depense: depense?.date_depense || localDateISO(),
      fournisseur: depense?.fournisseur ?? "",
      reference_piece: depense?.reference_piece ?? "",
      statut: depense?.statut ?? "en_attente",
      commentaire: depense?.commentaire ?? "",
      categorie_id: depense?.categorie_id ?? undefined,
    },
  });

  useEffect(() => {
    if (!depense) return;
    reset({
      enveloppe_id: initialEnveloppeId(depense),
      libelle: depense.libelle,
      montant: depense.montant,
      date_depense: depense.date_depense,
      fournisseur: depense.fournisseur ?? "",
      reference_piece: depense.reference_piece ?? "",
      statut: depense.statut,
      commentaire: depense.commentaire ?? "",
      categorie_id: depense.categorie_id ?? undefined,
    });
  }, [depense, reset]);

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          const annee = Number(data.date_depense.slice(0, 4)) || new Date().getFullYear();
          const enveloppeId = await resolveEnveloppeIdForDepense(data.enveloppe_id, annee);
          const payload = depenseToApiPayload(data as Record<string, unknown>, enveloppeId);

          if (isEdit) {
            // En édition, une catégorie vidée doit être détachée explicitement côté API.
            await apiClient.put(`/budget/depenses/${depense.id}`, {
              categorieId: null,
              ...payload,
            });
          } else {
            await apiClient.post("/budget/depenses", payload);
          }

          toast.success(isEdit ? "Dépense mise à jour" : "Dépense enregistrée");
          onSuccess?.();
        } catch (e) {
          toast.error(getUserErrorMessage(e));
        }
      })}
      className="space-y-4"
    >
      <p className="rounded-xl border border-[#d9e4f5] bg-[#f4f8ff] px-3 py-2 text-xs text-[#1F3F73]">
        Saisissez directement une dépense sur le budget global. L&apos;enveloppe est optionnelle si vous
        souhaitez ventiler sur un poste précis.
      </p>

      <Field label="Catégorie" hint="Recommandé pour classer la dépense">
        <NativeSelect {...register("categorie_id")}>
          <option value="">— Aucune —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.libelle}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Libellé de la dépense" required error={errors.libelle?.message}>
        <Input {...register("libelle")} placeholder="Ex. Achat fournitures bureau" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Montant (FCFA)" required error={errors.montant?.message}>
          <Input type="number" min={1} step={1000} {...register("montant")} />
        </Field>
        <Field label="Date" required error={errors.date_depense?.message}>
          <Input type="date" {...register("date_depense")} />
        </Field>
        <Field label="Fournisseur" error={errors.fournisseur?.message}>
          <Input {...register("fournisseur")} />
        </Field>
        <Field label="Réf. facture / pièce" error={errors.reference_piece?.message}>
          <Input {...register("reference_piece")} />
        </Field>
        <Field label="Statut">
          <NativeSelect {...register("statut")}>
            <option value="en_attente">En attente</option>
            <option value="approuve">Approuvé</option>
            <option value="refuse">Refusé</option>
            <option value="paye">Payé</option>
          </NativeSelect>
        </Field>
      </div>

      <Field
        label="Enveloppe (optionnel)"
        hint="Laissez « Budget global » si vous ne ventilez pas par enveloppe"
        error={errors.enveloppe_id?.message}
      >
        <NativeSelect {...register("enveloppe_id")}>
          <option value="">{DEFAULT_BUDGET_ENVELOPPE_LABEL} — sans enveloppe dédiée</option>
          {dedicatedEnveloppes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.libelle} ({e.annee})
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Commentaire" error={errors.commentaire?.message}>
        <Textarea rows={3} {...register("commentaire")} />
      </Field>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEdit ? "Enregistrer" : "Enregistrer la dépense"}
        </Button>
      </div>
    </form>
  );
}

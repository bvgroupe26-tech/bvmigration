"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { budgetDepenseSchema, type BudgetDepenseInput } from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
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

export default function BudgetDepenseForm({
  depense,
  enveloppes,
  categories,
  defaultEnveloppeId,
  onSuccess,
  onCancel,
}: Props) {
  const isEdit = !!depense;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetDepenseInput>({
    resolver: zodResolver(budgetDepenseSchema) as unknown as Resolver<BudgetDepenseInput>,
    defaultValues: {
      enveloppe_id: depense?.enveloppe_id ?? (defaultEnveloppeId && defaultEnveloppeId > 0 ? defaultEnveloppeId : undefined),
      libelle: depense?.libelle ?? "",
      montant: depense?.montant ?? 0,
      date_depense: depense?.date_depense ?? new Date().toISOString().slice(0, 10),
      fournisseur: depense?.fournisseur ?? "",
      reference_piece: depense?.reference_piece ?? "",
      statut: depense?.statut ?? "en_attente",
      commentaire: depense?.commentaire ?? "",
      categorie_id: depense?.categorie_id ?? undefined,
    },
  });

  useEffect(() => {
    if (isEdit || !enveloppes.length) return;
    const id = defaultEnveloppeId && defaultEnveloppeId > 0 ? defaultEnveloppeId : enveloppes[0].id;
    reset((prev) => ({ ...prev, enveloppe_id: id }));
  }, [isEdit, enveloppes, defaultEnveloppeId, reset]);

  if (!isEdit && enveloppes.length === 0) {
    return <p className="text-sm text-amber-800">Créez d&apos;abord une enveloppe budgétaire.</p>;
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          if (isEdit) await apiClient.put(`/budget/depenses/${depense.id}`, data);
          else await apiClient.post("/budget/depenses", data);
          toast.success(isEdit ? "Dépense mise à jour" : "Dépense enregistrée");
          onSuccess?.();
        } catch (e) {
          toast.error(getUserErrorMessage(e));
        }
      })}
      className="space-y-4"
    >
      <Field label="Enveloppe" required error={errors.enveloppe_id?.message}>
        <NativeSelect {...register("enveloppe_id", { valueAsNumber: true })}>
          {enveloppes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.libelle} ({e.annee})
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Catégorie">
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
        <Input {...register("libelle")} />
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
      <Field label="Commentaire" error={errors.commentaire?.message}>
        <Textarea rows={3} {...register("commentaire")} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEdit ? "Enregistrer" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

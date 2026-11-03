"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { budgetEnveloppeSchema, type BudgetEnveloppeInput } from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { stripEmpty } from "@/lib/rh-normalizers";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import type { BudgetEnveloppe } from "@/lib/types";

type Props = {
  enveloppe?: BudgetEnveloppe | null;
  defaultAnnee?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function BudgetEnveloppeForm({ enveloppe, defaultAnnee, onSuccess, onCancel }: Props) {
  const isEdit = !!enveloppe;
  const now = new Date();
  const year = defaultAnnee ?? now.getFullYear();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BudgetEnveloppeInput>({
    resolver: zodResolver(budgetEnveloppeSchema) as unknown as Resolver<BudgetEnveloppeInput>,
    defaultValues: {
      libelle: enveloppe?.libelle ?? "",
      departement: enveloppe?.departement ?? "",
      annee: enveloppe?.annee ?? year,
      montant_prevu: enveloppe?.montant_prevu ?? 0,
      statut: enveloppe?.statut ?? "actif",
      notes: enveloppe?.notes ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          if (isEdit) await apiClient.put(`/budget/enveloppes/${enveloppe.id}`, data);
          else await apiClient.post("/budget/enveloppes", stripEmpty(data));
          toast.success(isEdit ? "Enveloppe mise à jour" : "Enveloppe créée");
          onSuccess?.();
        } catch (e) {
          toast.error(getUserErrorMessage(e));
        }
      })}
      className="space-y-4"
    >
      <Field label="Libellé" required error={errors.libelle?.message}>
        <Input placeholder="Budget formation 2026" {...register("libelle")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Département" error={errors.departement?.message}>
          <Input placeholder="RH, Finance…" {...register("departement")} />
        </Field>
        <Field label="Exercice (année)" required error={errors.annee?.message}>
          <Input type="number" min={2000} max={2100} {...register("annee")} />
        </Field>
        <Field label="Montant prévu (FCFA)" required error={errors.montant_prevu?.message}>
          <Input type="number" min={0} step={1000} {...register("montant_prevu")} />
        </Field>
        <Field label="Statut">
          <NativeSelect {...register("statut")}>
            <option value="brouillon">Brouillon</option>
            <option value="actif">Actif</option>
            <option value="clos">Clos</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Notes" error={errors.notes?.message}>
        <Textarea rows={3} {...register("notes")} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEdit ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

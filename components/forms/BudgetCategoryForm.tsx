"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { budgetCategorieSchema, type BudgetCategorieInput } from "@/lib/schemas";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { stripEmpty } from "@/lib/rh-normalizers";
import { Field, Input, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import type { BudgetCategorie } from "@/lib/types";

type Props = {
  categorie?: BudgetCategorie | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function BudgetCategoryForm({ categorie, onSuccess, onCancel }: Props) {
  const isEdit = !!categorie;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BudgetCategorieInput>({
    resolver: zodResolver(budgetCategorieSchema) as unknown as Resolver<BudgetCategorieInput>,
    defaultValues: {
      code: categorie?.code ?? "",
      libelle: categorie?.libelle ?? "",
      description: categorie?.description ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          if (isEdit) await apiClient.put(`/budget/categories/${categorie.id}`, data);
          else await apiClient.post("/budget/categories", stripEmpty(data));
          toast.success(isEdit ? "Catégorie mise à jour" : "Catégorie créée");
          onSuccess?.();
        } catch (e) {
          toast.error(getUserErrorMessage(e));
        }
      })}
      className="space-y-4"
    >
      <Field label="Code" required hint="Ex. FORMATION, IT, RH" error={errors.code?.message}>
        <Input placeholder="FORMATION" {...register("code")} />
      </Field>
      <Field label="Libellé" required error={errors.libelle?.message}>
        <Input {...register("libelle")} />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <Textarea rows={3} {...register("description")} />
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

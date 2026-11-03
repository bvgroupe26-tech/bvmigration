"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/fetcher";
import { getUserErrorMessage } from "@/lib/api-errors";
import { Field, Input, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import type { CategorieFinance } from "@/lib/types-finance";

type Props = {
  categorie?: CategorieFinance | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function BudgetCategoryForm({ categorie, onSuccess, onCancel }: Props) {
  const isEdit = !!categorie;
  const [form, setForm] = useState({
    code: categorie?.code ?? "",
    libelle: categorie?.libelle ?? "",
    description: categorie?.description ?? "",
    compteSyscohada: categorie?.compte_syscohada ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,32}$/.test(code)) e.code = "Code alphanumérique (ex. FORMATION)";
    if (form.libelle.trim().length < 2) e.libelle = "Libellé requis";
    const compte = form.compteSyscohada.trim();
    if (compte && !/^\d{2,8}$/.test(compte)) e.compteSyscohada = "Numéro de compte : 2 à 8 chiffres (ex. 6052)";
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    const payload = {
      code,
      libelle: form.libelle.trim(),
      description: form.description.trim() || null,
      compteSyscohada: compte || null,
    };
    setSubmitting(true);
    try {
      if (isEdit) await apiClient.put(`/budget/categories/${categorie.id}`, payload);
      else await apiClient.post("/budget/categories", payload);
      toast.success(isEdit ? "Catégorie mise à jour" : "Catégorie créée");
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const compteHorsClasse6 = /^\d/.test(form.compteSyscohada.trim()) && !form.compteSyscohada.trim().startsWith("6");

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code" required hint="Ex. FORMATION, IT, RH" error={errors.code}>
          <Input placeholder="FORMATION" value={form.code} onChange={(e) => set("code", e.target.value)} />
        </Field>
        <Field
          label="Compte SYSCOHADA"
          error={errors.compteSyscohada}
          hint={compteHorsClasse6 ? "Attention : les charges relèvent normalement de la classe 6" : "Classe 6 — charges (ex. 6052, 6181)"}
        >
          <Input
            inputMode="numeric"
            placeholder="6052"
            value={form.compteSyscohada}
            onChange={(e) => set("compteSyscohada", e.target.value)}
            className="font-mono"
          />
        </Field>
      </div>
      <Field label="Libellé" required error={errors.libelle}>
        <Input value={form.libelle} onChange={(e) => set("libelle", e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={submitting}>
          {isEdit ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

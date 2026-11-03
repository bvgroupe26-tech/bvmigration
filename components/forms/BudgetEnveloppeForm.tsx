"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/fetcher";
import { getUserErrorMessage } from "@/lib/api-errors";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import MoneyInput from "@/components/ui/MoneyInput";
import Button from "@/components/ui/Button";
import type { BudgetEnveloppeStatut, EnveloppeFinance } from "@/lib/types-finance";

type Props = {
  enveloppe?: EnveloppeFinance | null;
  defaultAnnee?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function BudgetEnveloppeForm({ enveloppe, defaultAnnee, onSuccess, onCancel }: Props) {
  const isEdit = !!enveloppe;
  const [form, setForm] = useState({
    libelle: enveloppe?.libelle ?? "",
    departement: enveloppe?.departement ?? "",
    annee: enveloppe?.annee ?? defaultAnnee ?? new Date().getFullYear(),
    montantPrevu: enveloppe?.montant_prevu ?? 0,
    statut: (enveloppe?.statut ?? "actif") as BudgetEnveloppeStatut,
    notes: enveloppe?.notes ?? "",
    seuilAlertePct: enveloppe?.seuil_alerte_pct ?? 80,
    bloquerDepassement: enveloppe?.bloquer_depassement ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (form.libelle.trim().length < 2) e.libelle = "Libellé requis";
    if (!(form.annee >= 2000 && form.annee <= 2100)) e.annee = "Exercice invalide";
    if (form.montantPrevu < 0) e.montantPrevu = "Montant invalide";
    if (!(form.seuilAlertePct >= 1 && form.seuilAlertePct <= 100)) e.seuilAlertePct = "Entre 1 et 100 %";
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    const payload = {
      libelle: form.libelle.trim(),
      departement: form.departement.trim() || null,
      annee: form.annee,
      montantPrevu: form.montantPrevu,
      statut: form.statut,
      notes: form.notes.trim() || null,
      seuilAlertePct: form.seuilAlertePct,
      bloquerDepassement: form.bloquerDepassement,
    };
    setSubmitting(true);
    try {
      if (isEdit) await apiClient.put(`/budget/enveloppes/${enveloppe.id}`, payload);
      else await apiClient.post("/budget/enveloppes", payload);
      toast.success(isEdit ? "Enveloppe mise à jour" : "Enveloppe créée");
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Libellé" required error={errors.libelle}>
        <Input placeholder="Budget formation 2026" value={form.libelle} onChange={(e) => set("libelle", e.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Département / centre de coût">
          <Input placeholder="RH, Finance…" value={form.departement} onChange={(e) => set("departement", e.target.value)} />
        </Field>
        <Field label="Exercice (année)" required error={errors.annee}>
          <Input
            type="number"
            min={2000}
            max={2100}
            value={form.annee}
            onChange={(e) => set("annee", Number(e.target.value))}
            disabled={isEdit}
            title={isEdit ? "L'exercice d'une enveloppe existante ne se modifie pas" : undefined}
          />
        </Field>
        <Field label="Montant prévu (FCFA)" required error={errors.montantPrevu}>
          <MoneyInput value={form.montantPrevu} onChange={(v) => set("montantPrevu", v)} />
        </Field>
        <Field label="Statut">
          <NativeSelect value={form.statut} onChange={(e) => set("statut", e.target.value as BudgetEnveloppeStatut)}>
            <option value="brouillon">Brouillon</option>
            <option value="actif">Actif</option>
            <option value="clos">Clos</option>
          </NativeSelect>
        </Field>
        <Field label="Seuil d'alerte (%)" error={errors.seuilAlertePct} hint="Alerte quand engagé + réalisé atteint ce pourcentage">
          <Input
            type="number"
            min={1}
            max={100}
            value={form.seuilAlertePct}
            onChange={(e) => set("seuilAlertePct", Number(e.target.value))}
          />
        </Field>
        <Field label="Dépassement">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm">
            <input
              type="checkbox"
              checked={form.bloquerDepassement}
              onChange={(e) => set("bloquerDepassement", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Bloquer les dépenses au-delà du prévu
          </label>
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
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

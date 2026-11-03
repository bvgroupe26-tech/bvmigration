"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Field, Input, Textarea } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { createFournisseur, updateFournisseur } from "@/lib/budget-api";
import { getUserErrorMessage } from "@/lib/api-errors";
import type { Fournisseur } from "@/lib/types-finance";

type Props = {
  fournisseur?: Fournisseur | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function BudgetFournisseurForm({ fournisseur, onSuccess, onCancel }: Props) {
  const isEdit = !!fournisseur;
  const [form, setForm] = useState({
    nom: fournisseur?.nom ?? "",
    niu: fournisseur?.niu ?? "",
    rccm: fournisseur?.rccm ?? "",
    telephone: fournisseur?.telephone ?? "",
    email: fournisseur?.email ?? "",
    adresse: fournisseur?.adresse ?? "",
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
    if (form.nom.trim().length < 2) e.nom = "Raison sociale requise";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Email invalide";
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    const clean = (v: string) => v.trim() || null;
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateFournisseur(fournisseur.id, {
          nom: form.nom.trim(),
          niu: clean(form.niu),
          rccm: clean(form.rccm),
          telephone: clean(form.telephone),
          email: clean(form.email),
          adresse: clean(form.adresse),
        });
      } else {
        await createFournisseur({
          nom: form.nom.trim(),
          niu: form.niu.trim(),
          rccm: form.rccm.trim(),
          telephone: form.telephone.trim(),
          email: form.email.trim(),
          adresse: form.adresse.trim(),
        });
      }
      toast.success(isEdit ? "Fournisseur mis à jour" : "Fournisseur créé");
      onSuccess?.();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Raison sociale" required error={errors.nom}>
        <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Ex. SARL Bureau Plus" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="NIU" hint="Numéro d'identification unique">
          <Input value={form.niu} onChange={(e) => set("niu", e.target.value)} className="font-mono" />
        </Field>
        <Field label="RCCM">
          <Input value={form.rccm} onChange={(e) => set("rccm", e.target.value)} className="font-mono" />
        </Field>
        <Field label="Téléphone">
          <Input type="tel" value={form.telephone} onChange={(e) => set("telephone", e.target.value)} />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
      </div>
      <Field label="Adresse">
        <Textarea rows={2} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} />
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

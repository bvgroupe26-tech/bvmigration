"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import BudgetSubNav from "@/components/budget/BudgetSubNav";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import Skeleton from "@/components/ui/Skeleton";
import MoneyInput from "@/components/ui/MoneyInput";
import { Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { useParametresFinance } from "@/hooks/budget";
import { updateParametresFinance } from "@/lib/budget-api";
import { getUserErrorMessage } from "@/lib/api-errors";
import { normalizeAppRole } from "@/lib/session";
import type { ParametresFinance } from "@/lib/types-finance";

export default function ParametresFinancePage() {
  const { user } = useAuth();
  const isAdmin = normalizeAppRole(user?.role) === "admin";
  const { parametres, isLoading, error, mutate } = useParametresFinance();
  const [form, setForm] = useState<ParametresFinance | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (parametres) setForm(parametres);
  }, [parametres]);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form) return;
    if (form.taux_tva_defaut < 0 || form.taux_tva_defaut > 100) {
      toast.error("Le taux de TVA doit être compris entre 0 et 100 %.");
      return;
    }
    setSaving(true);
    try {
      await updateParametresFinance(form);
      toast.success("Paramètres enregistrés");
      void mutate();
    } catch (e) {
      toast.error(getUserErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <BudgetSubNav />
      <SectionHeader
        title="Paramètres finance"
        subtitle="Règles appliquées par le serveur à la saisie, la validation et le paiement des dépenses"
      />

      {isLoading || (!form && !error) ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : error || !form ? (
        <GlassCard className="p-6 text-center">
          <p className="text-sm text-slate-600">{getUserErrorMessage(error)}</p>
          <Button variant="primary" className="mt-4" onClick={() => void mutate()}>
            Réessayer
          </Button>
        </GlassCard>
      ) : (
        <GlassCard className="max-w-3xl p-5">
          {!isAdmin ? (
            <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Consultation seule : seul un administrateur peut modifier ces paramètres.
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-5">
            <fieldset disabled={!isAdmin} className="grid gap-4 sm:grid-cols-2">
              <Field label="Taux de TVA par défaut (%)" hint="Proposé à la saisie, modifiable dépense par dépense">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={form.taux_tva_defaut}
                  onChange={(e) => setForm({ ...form, taux_tva_defaut: Number(e.target.value) })}
                />
              </Field>
              <Field label="Période clôturée jusqu'au" hint="Aucune dépense datée avant ou à cette date ne peut être soumise">
                <Input
                  type="date"
                  value={form.periode_close_jusquau ?? ""}
                  onChange={(e) => setForm({ ...form, periode_close_jusquau: e.target.value || null })}
                />
              </Field>
              <Field label="Seuil de justificatif obligatoire (FCFA TTC)" hint="0 = pas d'obligation">
                <MoneyInput
                  value={form.seuil_justificatif}
                  onChange={(v) => setForm({ ...form, seuil_justificatif: v })}
                  placeholder="0"
                />
              </Field>
              <Field label="Seuil de double validation (FCFA TTC)" hint="Au-delà, validation N2 par un administrateur. 0 = désactivé">
                <MoneyInput
                  value={form.seuil_validation_n2}
                  onChange={(v) => setForm({ ...form, seuil_validation_n2: v })}
                  placeholder="0"
                />
              </Field>
            </fieldset>
            {isAdmin ? (
              <div className="flex justify-end border-t border-slate-200 pt-4">
                <Button type="submit" variant="primary" icon={<Save className="h-4 w-4" />} loading={saving}>
                  Enregistrer
                </Button>
              </div>
            ) : null}
          </form>
        </GlassCard>
      )}
    </div>
  );
}

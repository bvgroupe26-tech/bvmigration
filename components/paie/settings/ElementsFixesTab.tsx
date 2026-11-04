"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { Field, Input, NativeSelect } from "@/components/ui/Field";
import { useEmployes } from "@/hooks/api";
import { useEmployeeRubriques, usePayRules } from "@/hooks/paie";
import { apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { localDateISO } from "@/lib/date-local";
import { formatMontant, formatTaux, type EmployeeRubrique } from "@/lib/types-paie";

type Draft = { id: number | null; payRuleId: number; montant: string; taux: string; dateDebut: string; dateFin: string };

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmtDate(d: string | null): string {
  return d ? d.split("-").reverse().join("/") : "—";
}

export default function ElementsFixesTab({ canWrite }: { canWrite: boolean }) {
  const { employes, isLoading: loadingEmployes } = useEmployes({ statut: "actif", limit: 500 });
  const { rubriques } = usePayRules();
  const [employeId, setEmployeId] = useState<number | null>(null);
  const { elements, isLoading, mutate } = useEmployeeRubriques(employeId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const actives = rubriques.filter((r) => r.actif);
  const today = localDateISO();

  function ruleLabel(e: EmployeeRubrique): string {
    const r = rubriques.find((x) => x.id === e.payRuleId);
    const code = e.payRuleCode || r?.code || "";
    const lib = e.payRuleLibelle || r?.libelle || "";
    return `${code} — ${lib}`;
  }

  async function save() {
    if (!draft || !employeId) return;
    const montant = toNum(draft.montant);
    const taux = toNum(draft.taux);
    if (!draft.payRuleId || (montant == null && taux == null) || !draft.dateDebut) {
      toast.error("Rubrique, montant ou taux, et date de début sont obligatoires.");
      return;
    }
    if (draft.dateFin && draft.dateFin < draft.dateDebut) {
      toast.error("La date de fin doit être postérieure à la date de début.");
      return;
    }
    setSaving(true);
    const body = { payRuleId: draft.payRuleId, montant, taux, dateDebut: draft.dateDebut, dateFin: draft.dateFin || null };
    try {
      if (draft.id) await apiClient.put(`/paie-settings/employes/${employeId}/rubriques/${draft.id}`, body);
      else await apiClient.post(`/paie-settings/employes/${employeId}/rubriques`, body);
      toast.success("Élément enregistré");
      setDraft(null);
      await mutate();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard className="p-5">
      <p className="max-w-2xl text-xs text-text-secondary">
        Éléments récurrents propres à un salarié : sursalaire, indemnité de transport ou de logement, avance remboursée
        chaque mois… Ils sont repris automatiquement sur chaque bulletin entre leurs dates de début et de fin.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Employé" className="min-w-[260px] flex-1">
          <NativeSelect
            value={employeId ?? ""}
            disabled={loadingEmployes}
            onChange={(e) => setEmployeId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Choisir un employé…</option>
            {employes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.prenom} {e.nom}
                {e.matricule ? ` (${e.matricule})` : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {canWrite && employeId && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() =>
              setDraft({ id: null, payRuleId: actives[0]?.id ?? 0, montant: "", taux: "", dateDebut: today, dateFin: "" })
            }
          >
            Ajouter un élément
          </Button>
        )}
      </div>

      {employeId &&
        (isLoading ? (
          <Skeleton className="mt-4 h-32 w-full" />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">Rubrique</th>
                  <th className="px-3 py-2.5 text-right">Montant (F)</th>
                  <th className="px-3 py-2.5 text-right">Taux</th>
                  <th className="px-3 py-2.5">Du</th>
                  <th className="px-3 py-2.5">Au</th>
                  {canWrite && <th className="px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {elements.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="px-3 py-8 text-center text-text-tertiary">
                      Aucun élément fixe pour cet employé.
                    </td>
                  </tr>
                ) : (
                  elements.map((el) => {
                    const ended = el.dateFin != null && el.dateFin < today;
                    return (
                      <tr key={el.id} className={ended ? "border-t border-slate-100 opacity-50" : "border-t border-slate-100"}>
                        <td className="px-3 py-2 text-slate-900">{ruleLabel(el)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatMontant(el.montant)}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatTaux(el.taux)}
                        </td>
                        <td className="px-3 py-2">{fmtDate(el.dateDebut)}</td>
                        <td className="px-3 py-2">{el.dateFin ? fmtDate(el.dateFin) : "—"}</td>
                        {canWrite && (
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setDraft({
                                  id: el.id,
                                  payRuleId: el.payRuleId,
                                  montant: el.montant != null ? String(el.montant) : "",
                                  taux: el.taux != null ? String(el.taux) : "",
                                  dateDebut: el.dateDebut,
                                  dateFin: el.dateFin ?? "",
                                })
                              }
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              aria-label="Modifier l'élément"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ))}

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Modifier l'élément fixe" : "Nouvel élément fixe"} size="md">
        {draft && (
          <div className="space-y-4">
            <Field label="Rubrique" required>
              <NativeSelect value={draft.payRuleId} onChange={(e) => setDraft({ ...draft, payRuleId: Number(e.target.value) })}>
                {actives.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.libelle}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Montant (F)">
                <Input inputMode="numeric" value={draft.montant} className="font-mono" onChange={(e) => setDraft({ ...draft, montant: e.target.value })} />
              </Field>
              <Field label="Taux" hint="En % : 5 = 5 %">
                <Input inputMode="decimal" value={draft.taux} className="font-mono" onChange={(e) => setDraft({ ...draft, taux: e.target.value })} />
              </Field>
              <Field label="Date de début" required>
                <Input type="date" value={draft.dateDebut} onChange={(e) => setDraft({ ...draft, dateDebut: e.target.value })} />
              </Field>
              <Field label="Date de fin" hint="Vide = sans limite">
                <Input type="date" value={draft.dateFin} onChange={(e) => setDraft({ ...draft, dateFin: e.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                Annuler
              </Button>
              <Button variant="primary" onClick={save} loading={saving}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </GlassCard>
  );
}

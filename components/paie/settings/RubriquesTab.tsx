"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Ban } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import StatBadge from "@/components/ui/StatBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/Field";
import { usePayRules } from "@/hooks/paie";
import { apiClient, getUserErrorMessage } from "@/lib/fetcher";
import {
  MODE_CALCUL_LABELS,
  TYPE_RUBRIQUE_LABELS,
  type ModeCalculRubrique,
  type PayRule,
  type TypeRubrique,
} from "@/lib/types-paie";

type Draft = Omit<PayRule, "id"> & { id: number | null };

const EMPTY: Draft = {
  id: null,
  code: "",
  libelle: "",
  type: "gain",
  ordre: 100,
  imposable: true,
  soumisCnss: true,
  mode: "fixe",
  baseCode: null,
  tauxSalarialCode: null,
  tauxPatronalCode: null,
  plafondCode: null,
  baremeCode: null,
  actif: true,
  description: null,
};

const CODE_FIELDS: Array<{ name: "baseCode" | "tauxSalarialCode" | "tauxPatronalCode" | "plafondCode" | "baremeCode"; label: string }> = [
  { name: "baseCode", label: "Code de la base" },
  { name: "tauxSalarialCode", label: "Code du taux salarial" },
  { name: "tauxPatronalCode", label: "Code du taux patronal" },
  { name: "plafondCode", label: "Code du plafond" },
  { name: "baremeCode", label: "Code du barème" },
];

export default function RubriquesTab({ canWrite, onSaved }: { canWrite: boolean; onSaved: () => void }) {
  const { rubriques, isLoading, mutate } = usePayRules();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDisable, setToDisable] = useState<PayRule | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft) return;
    if (!draft.code.trim() || !draft.libelle.trim()) {
      toast.error("Le code et le libellé sont obligatoires.");
      return;
    }
    setSaving(true);
    const { id, ...body } = draft;
    const payload = {
      ...body,
      code: body.code.trim().toUpperCase(),
      ...Object.fromEntries(CODE_FIELDS.map((f) => [f.name, body[f.name]?.trim() || null])),
    };
    try {
      if (id) await apiClient.put(`/paie-settings/rubriques/${id}`, payload);
      else await apiClient.post("/paie-settings/rubriques", payload);
      toast.success("Rubrique enregistrée");
      setDraft(null);
      await mutate();
      onSaved();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function disable() {
    if (!toDisable) return;
    setSaving(true);
    try {
      await apiClient.post(`/paie-settings/rubriques/${toDisable.id}/delete`);
      toast.success("Rubrique désactivée");
      setToDisable(null);
      await mutate();
      onSaved();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs text-text-secondary">
          Le plan de paie : chaque rubrique produit une ligne du bulletin, dans l&apos;ordre indiqué. Les taux, plafonds
          et barèmes sont désignés par leur code et saisis dans les onglets Paramètres et Barèmes.
        </p>
        {canWrite && (
          <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...EMPTY })}>
            Nouvelle rubrique
          </Button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[960px] text-xs">
          <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-2.5">Ordre</th>
              <th className="px-3 py-2.5">Code</th>
              <th className="px-3 py-2.5">Libellé</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Mode</th>
              <th className="px-3 py-2.5 text-center">Imposable</th>
              <th className="px-3 py-2.5 text-center">Soumis CNSS</th>
              <th className="px-3 py-2.5">Taux / plafond / barème</th>
              <th className="px-3 py-2.5">État</th>
              {canWrite && <th className="px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {rubriques.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 10 : 9} className="px-3 py-8 text-center text-text-tertiary">
                  Aucune rubrique. Lancez le script d&apos;initialisation (seed:payroll) ou créez-les ici.
                </td>
              </tr>
            ) : (
              rubriques.map((r) => (
                <tr key={r.id} className={r.actif ? "border-t border-slate-100" : "border-t border-slate-100 opacity-50"}>
                  <td className="px-3 py-2 font-mono text-slate-500">{r.ordre}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-900">{r.code}</td>
                  <td className="px-3 py-2 text-slate-900">{r.libelle}</td>
                  <td className="px-3 py-2">{TYPE_RUBRIQUE_LABELS[r.type]}</td>
                  <td className="px-3 py-2">{MODE_CALCUL_LABELS[r.mode]}</td>
                  <td className="px-3 py-2 text-center">{r.imposable ? "Oui" : "Non"}</td>
                  <td className="px-3 py-2 text-center">{r.soumisCnss ? "Oui" : "Non"}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                    {[
                      r.baseCode && `base ${r.baseCode}`,
                      r.tauxSalarialCode && `sal. ${r.tauxSalarialCode}`,
                      r.tauxPatronalCode && `pat. ${r.tauxPatronalCode}`,
                      r.plafondCode && `plaf. ${r.plafondCode}`,
                      r.baremeCode && `barème ${r.baremeCode}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatBadge variant={r.actif ? "actif" : "inactif"}>{r.actif ? "Active" : "Inactive"}</StatBadge>
                  </td>
                  {canWrite && (
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDraft({ ...r })}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          aria-label={`Modifier ${r.code}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {r.actif && (
                          <button
                            type="button"
                            onClick={() => setToDisable(r)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Désactiver ${r.code}`}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Modifier la rubrique" : "Nouvelle rubrique"} size="lg">
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Code" required>
                <Input value={draft.code} className="font-mono uppercase" onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
              </Field>
              <Field label="Libellé" required className="sm:col-span-2">
                <Input value={draft.libelle} onChange={(e) => setDraft({ ...draft, libelle: e.target.value })} />
              </Field>
              <Field label="Type">
                <NativeSelect value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as TypeRubrique })}>
                  {(Object.keys(TYPE_RUBRIQUE_LABELS) as TypeRubrique[]).map((t) => (
                    <option key={t} value={t}>{TYPE_RUBRIQUE_LABELS[t]}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Mode de calcul">
                <NativeSelect value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value as ModeCalculRubrique })}>
                  {(Object.keys(MODE_CALCUL_LABELS) as ModeCalculRubrique[]).map((m) => (
                    <option key={m} value={m}>{MODE_CALCUL_LABELS[m]}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Ordre">
                <Input type="number" value={draft.ordre} onChange={(e) => setDraft({ ...draft, ordre: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-slate-700">
              <Check label="Imposable" checked={draft.imposable} onChange={(v) => setDraft({ ...draft, imposable: v })} />
              <Check label="Soumis CNSS" checked={draft.soumisCnss} onChange={(v) => setDraft({ ...draft, soumisCnss: v })} />
              <Check label="Active" checked={draft.actif} onChange={(v) => setDraft({ ...draft, actif: v })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CODE_FIELDS.map((f) => (
                <Field key={f.name} label={f.label}>
                  <Input
                    value={draft[f.name] ?? ""}
                    className="font-mono uppercase"
                    onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
            <Field label="Description">
              <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
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

      <ConfirmDialog
        open={toDisable !== null}
        onClose={() => setToDisable(null)}
        onConfirm={disable}
        loading={saving}
        title={`Désactiver la rubrique ${toDisable?.code ?? ""} ?`}
        description="Elle ne sera plus calculée sur les prochains bulletins. Les bulletins déjà validés ne changent pas."
        confirmLabel="Désactiver"
      />
    </GlassCard>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}

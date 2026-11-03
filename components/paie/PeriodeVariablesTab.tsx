"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DownloadCloud, Plus, Save, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Skeleton from "@/components/ui/Skeleton";
import StatBadge from "@/components/ui/StatBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useEmployes } from "@/hooks/api";
import { usePayRules, usePeriodVariables, paieActions } from "@/hooks/paie";
import { getUserErrorMessage } from "@/lib/fetcher";
import { SOURCE_VARIABLE_LABELS, type PayrollVariableRow } from "@/lib/types-paie";

type Props = {
  periodId: number;
  editable: boolean;
  onChanged: () => void;
};

type DraftRow = PayrollVariableRow & { key: string };

let draftSeq = 0;
function withKey(v: PayrollVariableRow): DraftRow {
  draftSeq += 1;
  return { ...v, key: v.id != null ? `v${v.id}` : `n${draftSeq}` };
}

export default function PeriodeVariablesTab({ periodId, editable, onChanged }: Props) {
  const { variables, isLoading, error, mutate } = usePeriodVariables(periodId);
  const { rubriques } = usePayRules();
  const { employes } = useEmployes({ statut: "actif", limit: 500 });
  const [draft, setDraft] = useState<DraftRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);

  const rows: DraftRow[] = draft ?? variables.map(withKey);
  const dirty = draft !== null;
  const rubriquesActives = rubriques.filter((r) => r.actif);

  function update(key: string, patch: Partial<PayrollVariableRow>) {
    setDraft(rows.map((r) => (r.key === key ? { ...r, ...patch, source: r.source === "manuel" ? r.source : "manuel" } : r)));
  }

  function addRow() {
    const first = rubriquesActives.find((r) => r.mode === "variable") ?? rubriquesActives[0];
    setDraft([
      ...rows,
      withKey({
        id: null,
        employeId: employes[0]?.id ?? 0,
        employeNom: "",
        payRuleId: first?.id ?? 0,
        payRuleCode: first?.code ?? "",
        payRuleLibelle: first?.libelle ?? "",
        quantite: null,
        montant: null,
        source: "manuel",
        commentaire: "",
      }),
    ]);
  }

  function removeRow(key: string) {
    setDraft(rows.filter((r) => r.key !== key));
  }

  async function save() {
    const invalid = rows.find((r) => !r.employeId || !r.payRuleId || (r.quantite == null && r.montant == null));
    if (invalid) {
      toast.error("Chaque ligne doit avoir un employé, une rubrique et une quantité ou un montant.");
      return;
    }
    setSaving(true);
    try {
      await paieActions.saveVariables(
        periodId,
        rows.map((r) => ({
          id: r.id ?? undefined,
          employeId: r.employeId,
          payRuleId: r.payRuleId,
          quantite: r.quantite,
          montant: r.montant,
          source: r.source,
          commentaire: r.commentaire || undefined,
        }))
      );
      toast.success("Variables enregistrées");
      setDraft(null);
      await mutate();
      onChanged();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function importer() {
    setImporting(true);
    try {
      await paieActions.importVariables(periodId);
      toast.success("Variables importées depuis les présences et absences");
      setDraft(null);
      setConfirmImport(false);
      await mutate();
      onChanged();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error) {
    return <GlassCard className="p-6 text-sm text-text-secondary">Impossible de charger les variables. {getUserErrorMessage(error)}</GlassCard>;
  }

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs text-text-secondary">
          Heures supplémentaires, absences non payées, primes ponctuelles, avances… Les lignes importées depuis les
          présences peuvent être corrigées ; une ligne modifiée devient une saisie manuelle.
        </p>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" icon={<DownloadCloud className="h-4 w-4" />} onClick={() => setConfirmImport(true)}>
              Importer depuis les présences
            </Button>
            <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addRow}>
              Ajouter
            </Button>
            <Button variant="primary" size="sm" icon={<Save className="h-4 w-4" />} onClick={save} loading={saving} disabled={!dirty}>
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-2.5">Employé</th>
              <th className="px-3 py-2.5">Rubrique</th>
              <th className="px-3 py-2.5 text-right">Quantité</th>
              <th className="px-3 py-2.5 text-right">Montant (F)</th>
              <th className="px-3 py-2.5">Source</th>
              <th className="px-3 py-2.5">Commentaire</th>
              {editable && <th className="px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={editable ? 7 : 6} className="px-3 py-8 text-center text-xs text-text-tertiary">
                  Aucune variable pour cette période.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className="border-t border-slate-100 align-middle">
                  <td className="px-3 py-2">
                    {editable ? (
                      <select
                        value={r.employeId}
                        onChange={(e) => update(r.key, { employeId: Number(e.target.value) })}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                      >
                        {!employes.some((e) => e.id === r.employeId) && <option value={r.employeId}>{r.employeNom || "—"}</option>}
                        {employes.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.prenom} {e.nom}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-900">{r.employeNom || `#${r.employeId}`}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <select
                        value={r.payRuleId}
                        onChange={(e) => update(r.key, { payRuleId: Number(e.target.value) })}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                      >
                        {!rubriquesActives.some((x) => x.id === r.payRuleId) && (
                          <option value={r.payRuleId}>{r.payRuleLibelle || r.payRuleCode || "—"}</option>
                        )}
                        {rubriquesActives.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.code} — {x.libelle}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-900">
                        <span className="font-mono text-slate-500">{r.payRuleCode}</span> {r.payRuleLibelle}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumberCell editable={editable} value={r.quantite} onChange={(v) => update(r.key, { quantite: v })} decimals />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumberCell editable={editable} value={r.montant} onChange={(v) => update(r.key, { montant: v })} />
                  </td>
                  <td className="px-3 py-2">
                    <StatBadge variant={r.source === "manuel" ? "neutral" : "info"}>{SOURCE_VARIABLE_LABELS[r.source]}</StatBadge>
                  </td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <input
                        value={r.commentaire}
                        onChange={(e) => update(r.key, { commentaire: e.target.value })}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                      />
                    ) : (
                      <span className="text-xs text-text-secondary">{r.commentaire}</span>
                    )}
                  </td>
                  {editable && (
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(r.key)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Supprimer la ligne"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmImport}
        onClose={() => setConfirmImport(false)}
        onConfirm={importer}
        loading={importing}
        variant="warning"
        title="Importer depuis les présences ?"
        description="Les heures supplémentaires et les absences non payées de la période seront recalculées. Les variables saisies manuellement sont conservées."
        confirmLabel="Importer"
      />
    </GlassCard>
  );
}

function NumberCell({
  editable,
  value,
  onChange,
  decimals,
}: {
  editable: boolean;
  value: number | null;
  onChange: (v: number | null) => void;
  decimals?: boolean;
}) {
  if (!editable) {
    return (
      <span className="font-mono text-xs text-slate-900">
        {value == null ? "—" : value.toLocaleString("fr-FR", { maximumFractionDigits: decimals ? 2 : 0 })}
      </span>
    );
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      step={decimals ? "0.25" : "1"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-2 text-right font-mono text-xs"
    />
  );
}

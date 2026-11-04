"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, Input } from "@/components/ui/Field";
import { useTaxBrackets } from "@/hooks/paie";
import { apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { localDateISO } from "@/lib/date-local";
import { formatMontant, formatTaux, type TaxBracket } from "@/lib/types-paie";

type Draft = { id: number | null; bareme: string; borneMin: string; borneMax: string; taux: string; dateDebut: string };

function toNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function BaremesTab({ canWrite, onSaved }: { canWrite: boolean; onSaved: () => void }) {
  const { baremes, isLoading, mutate } = useTaxBrackets();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<TaxBracket | null>(null);
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, TaxBracket[]>();
    for (const t of baremes) {
      const key = `${t.bareme}|${t.dateDebut}`;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([key, tranches]) => {
        const [bareme, dateDebut] = key.split("|");
        return { key, bareme, dateDebut, dateFin: tranches[0]?.dateFin ?? null, tranches: tranches.sort((a, b) => a.borneMin - b.borneMin) };
      })
      .sort((a, b) => a.bareme.localeCompare(b.bareme) || b.dateDebut.localeCompare(a.dateDebut));
  }, [baremes]);

  async function save() {
    if (!draft) return;
    const borneMin = toNum(draft.borneMin);
    const borneMax = toNum(draft.borneMax);
    const taux = toNum(draft.taux);
    if (!draft.bareme.trim() || borneMin == null || taux == null || !draft.dateDebut) {
      toast.error("Barème, borne minimale, taux et date d'effet sont obligatoires.");
      return;
    }
    if (borneMax != null && borneMax <= borneMin) {
      toast.error("La borne maximale doit être supérieure à la borne minimale.");
      return;
    }
    setSaving(true);
    const body = { bareme: draft.bareme.trim().toUpperCase(), borneMin, borneMax, taux, dateDebut: draft.dateDebut };
    try {
      if (draft.id) await apiClient.put(`/paie-settings/baremes/${draft.id}`, body);
      else await apiClient.post("/paie-settings/baremes", body);
      toast.success("Tranche enregistrée");
      setDraft(null);
      await mutate();
      onSaved();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setSaving(true);
    try {
      await apiClient.post(`/paie-settings/baremes/${toDelete.id}/delete`);
      toast.success("Tranche supprimée");
      setToDelete(null);
      await mutate();
      onSaved();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function newTranche(bareme = "", dateDebut = localDateISO(), borneMin = "") {
    setDraft({ id: null, bareme, borneMin, borneMax: "", taux: "", dateDebut });
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="max-w-2xl text-xs text-text-secondary">
          Barèmes progressifs (par exemple l&apos;IRPP). Chaque tranche applique son taux à la part du revenu comprise entre
          ses bornes. Borne maximale vide = tranche ouverte. Taux en pourcentage : 10 = 10 %.
        </p>
        {canWrite && (
          <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => newTranche()}>
            Nouvelle tranche
          </Button>
        )}
      </GlassCard>

      {groups.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-text-secondary">Aucun barème saisi.</GlassCard>
      ) : (
        groups.map((g) => (
          <GlassCard key={g.key} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold text-slate-900">{g.bareme}</p>
                <p className="text-xs text-text-tertiary">
                  En vigueur depuis le {g.dateDebut.split("-").reverse().join("/")}
                  {g.dateFin ? ` jusqu'au ${g.dateFin.split("-").reverse().join("/")}` : ""}
                </p>
              </div>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const last = g.tranches[g.tranches.length - 1];
                    newTranche(g.bareme, g.dateDebut, last?.borneMax != null ? String(last.borneMax) : "");
                  }}
                >
                  Ajouter une tranche
                </Button>
              )}
            </div>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[480px] text-xs">
                <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-2">De (F)</th>
                    <th className="px-3 py-2">À (F)</th>
                    <th className="px-3 py-2 text-right">Taux</th>
                    {canWrite && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {g.tranches.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono">{formatMontant(t.borneMin)}</td>
                      <td className="px-3 py-2 font-mono">{t.borneMax != null ? formatMontant(t.borneMax) : "et plus"}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatTaux(t.taux)}
                      </td>
                      {canWrite && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setDraft({
                                  id: t.id,
                                  bareme: t.bareme,
                                  borneMin: String(t.borneMin),
                                  borneMax: t.borneMax != null ? String(t.borneMax) : "",
                                  taux: String(t.taux),
                                  dateDebut: t.dateDebut,
                                })
                              }
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              aria-label="Modifier la tranche"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setToDelete(t)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              aria-label="Supprimer la tranche"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ))
      )}

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Modifier la tranche" : "Nouvelle tranche"} size="md">
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Code du barème" required>
                <Input value={draft.bareme} className="font-mono uppercase" onChange={(e) => setDraft({ ...draft, bareme: e.target.value })} />
              </Field>
              <Field label="Date d'effet" required>
                <Input type="date" value={draft.dateDebut} onChange={(e) => setDraft({ ...draft, dateDebut: e.target.value })} />
              </Field>
              <Field label="Borne minimale (F)" required>
                <Input inputMode="numeric" value={draft.borneMin} className="font-mono" onChange={(e) => setDraft({ ...draft, borneMin: e.target.value })} />
              </Field>
              <Field label="Borne maximale (F)" hint="Vide = tranche ouverte">
                <Input inputMode="numeric" value={draft.borneMax} className="font-mono" onChange={(e) => setDraft({ ...draft, borneMax: e.target.value })} />
              </Field>
              <Field label="Taux" required hint="En % : 10 = 10 %">
                <Input inputMode="decimal" value={draft.taux} className="font-mono" onChange={(e) => setDraft({ ...draft, taux: e.target.value })} />
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

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={saving}
        title="Supprimer cette tranche ?"
        description="Les bulletins déjà validés ne sont pas modifiés."
        confirmLabel="Supprimer"
      />
    </div>
  );
}

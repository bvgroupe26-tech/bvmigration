"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ChevronRight, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { usePayParameters } from "@/hooks/paie";
import { apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { localDateISO } from "@/lib/date-local";
import { isAConfirmer, type PayParameter } from "@/lib/types-paie";

type Group = { code: string; current: PayParameter | null; history: PayParameter[] };

type Draft = { code: string; valeur: string; dateDebut: string; description: string; lockedCode: boolean };

function groupParameters(list: PayParameter[], today: string): Group[] {
  const byCode = new Map<string, PayParameter[]>();
  for (const p of list) {
    const arr = byCode.get(p.code) ?? [];
    arr.push(p);
    byCode.set(p.code, arr);
  }
  return [...byCode.entries()]
    .map(([code, items]) => {
      const history = [...items].sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));
      const current =
        history.find((p) => p.dateDebut <= today && (!p.dateFin || p.dateFin >= today)) ?? history[0] ?? null;
      return { code, current, history };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

function formatDate(d: string | null): string {
  return d ? d.split("-").reverse().join("/") : "—";
}

export default function ParametresTab({ canWrite, onSaved }: { canWrite: boolean; onSaved: () => void }) {
  const { parametres, isLoading, mutate } = usePayParameters();
  const today = localDateISO();
  const groups = useMemo(() => groupParameters(parametres, today), [parametres, today]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const aConfirmer = groups.filter((g) => g.current && isAConfirmer(g.current)).length;

  function toggle(code: string) {
    const next = new Set(open);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setOpen(next);
  }

  async function save() {
    if (!draft) return;
    const valeur = Number(draft.valeur.replace(",", "."));
    if (!draft.code.trim() || !Number.isFinite(valeur) || !draft.dateDebut) {
      toast.error("Code, valeur et date d'effet sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post("/paie-settings/parametres", {
        code: draft.code.trim().toUpperCase(),
        valeur,
        dateDebut: draft.dateDebut,
        description: draft.description.trim() || null,
      });
      toast.success("Nouvelle valeur enregistrée");
      setDraft(null);
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
        <div className="max-w-2xl space-y-1 text-xs text-text-secondary">
          <p>
            Taux, plafonds et montants utilisés par les rubriques. Chaque modification crée une nouvelle valeur avec sa
            date d&apos;effet ; l&apos;historique est conservé pour recalculer correctement les anciennes périodes.
          </p>
          <p>Les taux se saisissent en décimal : 0,04 = 4 %.</p>
        </div>
        {canWrite && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setDraft({ code: "", valeur: "", dateDebut: today, description: "", lockedCode: false })}
          >
            Nouveau paramètre
          </Button>
        )}
      </div>

      {aConfirmer > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {aConfirmer} paramètre(s) à confirmer par le comptable avant de lancer le calcul de la paie.
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] text-xs">
          <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="w-8 px-3 py-2.5" />
              <th className="px-3 py-2.5">Code</th>
              <th className="px-3 py-2.5 text-right">Valeur en vigueur</th>
              <th className="px-3 py-2.5">Depuis le</th>
              <th className="px-3 py-2.5">Description</th>
              {canWrite && <th className="px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 6 : 5} className="px-3 py-8 text-center text-text-tertiary">
                  Aucun paramètre.
                </td>
              </tr>
            ) : (
              groups.map((g) => {
                const flagged = g.current ? isAConfirmer(g.current) : true;
                const expanded = open.has(g.code);
                return (
                  <Fragment key={g.code}>
                    <tr className={flagged ? "border-t border-slate-100 bg-amber-50/60" : "border-t border-slate-100"}>
                      <td className="px-3 py-2">
                        {g.history.length > 1 && (
                          <button type="button" onClick={() => toggle(g.code)} className="text-slate-400 hover:text-slate-700" aria-label="Historique">
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                        {g.code}
                        {flagged && (
                          <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 font-sans text-[10px] font-semibold text-amber-900">
                            À confirmer
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900">
                        {g.current ? g.current.valeur.toLocaleString("fr-FR", { maximumFractionDigits: 4 }) : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{formatDate(g.current?.dateDebut ?? null)}</td>
                      <td className="px-3 py-2 text-slate-600">{g.current?.description ?? ""}</td>
                      {canWrite && (
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                code: g.code,
                                valeur: g.current ? String(g.current.valeur) : "",
                                dateDebut: today,
                                description: (g.current?.description ?? "").replace(/À CONFIRMER[^.]*\.?/i, "").trim(),
                                lockedCode: true,
                              })
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Nouvelle valeur
                          </button>
                        </td>
                      )}
                    </tr>
                    {expanded &&
                      g.history.map((h) => (
                        <tr key={h.id} className="border-t border-slate-50 bg-slate-50/50 text-slate-500">
                          <td />
                          <td className="px-3 py-1.5 pl-6 text-[11px]">Historique</td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            {h.valeur.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
                          </td>
                          <td className="px-3 py-1.5">
                            {formatDate(h.dateDebut)} → {h.dateFin ? formatDate(h.dateFin) : "en cours"}
                          </td>
                          <td className="px-3 py-1.5" colSpan={canWrite ? 2 : 1}>
                            {h.description ?? ""}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={draft !== null} onClose={() => setDraft(null)} title="Nouvelle valeur de paramètre" size="md">
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Code" required>
                <Input
                  value={draft.code}
                  disabled={draft.lockedCode}
                  className="font-mono uppercase"
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                />
              </Field>
              <Field label="Valeur" required hint="Taux : 0,04 = 4 %">
                <Input
                  inputMode="decimal"
                  value={draft.valeur}
                  className="font-mono"
                  onChange={(e) => setDraft({ ...draft, valeur: e.target.value })}
                />
              </Field>
              <Field label="Date d'effet" required>
                <Input type="date" value={draft.dateDebut} onChange={(e) => setDraft({ ...draft, dateDebut: e.target.value })} />
              </Field>
            </div>
            <Field label="Description / source" hint="Référence du texte légal ou validation du comptable.">
              <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
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
    </GlassCard>
  );
}

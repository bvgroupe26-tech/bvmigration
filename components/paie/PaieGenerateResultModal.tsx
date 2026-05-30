"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import StatBadge from "@/components/ui/StatBadge";
import {
  type GeneratePaieResult,
  PAIE_SKIP_REASON_LABELS,
} from "@/lib/paie-utils";

type PaieGenerateResultModalProps = {
  open: boolean;
  onClose: () => void;
  result: GeneratePaieResult | null;
  periodeLabel: string;
};

export default function PaieGenerateResultModal({
  open,
  onClose,
  result,
  periodeLabel,
}: PaieGenerateResultModalProps) {
  if (!result) return null;

  const summary = result.summary;
  const details = result.skippedDetails ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Résultat de la génération"
      description={`Période : ${periodeLabel}`}
      size="lg"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Générés</p>
            <p className="mt-1 font-display text-3xl font-bold text-emerald-900">{result.generated}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">Ignorés</p>
            <p className="mt-1 font-display text-3xl font-bold text-amber-950">{result.skipped}</p>
          </div>
        </div>

        {summary && result.skipped > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Motifs d&apos;exclusion
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(summary) as [keyof typeof summary, number][]).map(([key, count]) =>
                count > 0 ? (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                  >
                    {PAIE_SKIP_REASON_LABELS[key as keyof typeof PAIE_SKIP_REASON_LABELS] ?? key}
                    <span className="font-mono font-bold">{count}</span>
                  </span>
                ) : null
              )}
            </div>
          </div>
        )}

        {details.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Employé</th>
                  <th className="px-3 py-2">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {details.map((row) => (
                  <tr key={`${row.employeId}-${row.reason}`}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">
                        {row.prenom} {row.nom}
                      </p>
                      <p className="text-[11px] text-slate-500">{row.message}</p>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <StatBadge variant="warning" showDot={false}>
                        {PAIE_SKIP_REASON_LABELS[row.reason] ?? row.reason}
                      </StatBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result.generated === 0 && result.skipped === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Aucun bulletin éligible pour cette période. Vérifiez les statuts employés, les dates d&apos;embauche
            et de fin de contrat.
          </p>
        )}

        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

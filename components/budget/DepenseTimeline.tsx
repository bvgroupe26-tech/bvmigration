"use client";

import { History } from "lucide-react";
import { DEPENSE_STATUT_LABELS } from "@/lib/budget-depense-utils";
import type { HistoriqueDepense } from "@/lib/types-finance";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  brouillon: "bg-slate-400",
  soumise: "bg-amber-500",
  validee_n1: "bg-sky-500",
  validee: "bg-emerald-500",
  refusee: "bg-red-500",
  payee: "bg-[#1F3F73]",
  annulee: "bg-slate-500",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Brazzaville",
  });
}

export default function DepenseTimeline({ historique }: { historique: HistoriqueDepense[] }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <History className="h-4 w-4 text-slate-400" />
        Historique
      </h3>
      {historique.length === 0 ? (
        <p className="text-xs text-slate-500">Aucun événement enregistré.</p>
      ) : (
        <ol className="relative ml-2 space-y-4 border-l border-slate-200 pl-5">
          {historique.map((h) => (
            <li key={h.id} className="relative">
              <span
                className={cn(
                  "absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white",
                  DOT[h.vers_statut] ?? "bg-slate-400"
                )}
              />
              <p className="text-sm font-medium text-slate-900">
                {h.de_statut ? `${DEPENSE_STATUT_LABELS[h.de_statut]} → ` : ""}
                {DEPENSE_STATUT_LABELS[h.vers_statut]}
              </p>
              <p className="text-[11px] text-slate-500">
                {h.user_nom ? `${h.user_nom} · ` : ""}
                {formatDateTime(h.created_at)}
              </p>
              {h.commentaire ? (
                <p className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700">{h.commentaire}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

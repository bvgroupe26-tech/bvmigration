"use client";

import { cn } from "@/lib/utils";
import { ALERTE_LABELS } from "@/lib/budget-depense-utils";
import type { AlerteBudget } from "@/lib/types-finance";

type Props = {
  prevu: number;
  realise: number;
  engage: number;
  alerte: AlerteBudget;
  seuilPct?: number;
  className?: string;
};

const COLORS: Record<AlerteBudget, { realise: string; engage: string; text: string }> = {
  ok: { realise: "bg-emerald-500", engage: "bg-emerald-300", text: "text-emerald-700" },
  seuil: { realise: "bg-amber-500", engage: "bg-amber-300", text: "text-amber-700" },
  depasse: { realise: "bg-red-500", engage: "bg-red-300", text: "text-red-700" },
};

/** Barre réalisé (plein) + engagé (clair) sur le prévu, avec repère du seuil d'alerte. */
export default function ConsumptionBar({ prevu, realise, engage, alerte, seuilPct = 80, className }: Props) {
  const base = prevu > 0 ? prevu : Math.max(realise + engage, 1);
  const pctRealise = Math.min(100, (realise / base) * 100);
  const pctEngage = Math.min(100 - pctRealise, (engage / base) * 100);
  const pctTotal = prevu > 0 ? ((realise + engage) / prevu) * 100 : 0;
  const c = COLORS[alerte];

  return (
    <div className={cn("min-w-[140px]", className)} title={ALERTE_LABELS[alerte]}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={cn("absolute inset-y-0 left-0", c.realise)} style={{ width: `${pctRealise}%` }} />
        <div
          className={cn("absolute inset-y-0", c.engage)}
          style={{ left: `${pctRealise}%`, width: `${pctEngage}%` }}
        />
        {prevu > 0 && seuilPct > 0 && seuilPct < 100 ? (
          <div className="absolute inset-y-0 w-px bg-slate-500/60" style={{ left: `${seuilPct}%` }} />
        ) : null}
      </div>
      <p className={cn("mt-1 text-[11px] font-semibold", c.text)}>
        {prevu > 0 ? `${Math.round(pctTotal)} %` : "Sans prévu"}
        {alerte !== "ok" ? ` · ${ALERTE_LABELS[alerte]}` : ""}
      </p>
    </div>
  );
}

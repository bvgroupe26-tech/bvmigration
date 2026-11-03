import { Check } from "lucide-react";
import { PERIODE_ETAPES, PERIODE_STATUT_LABELS, type PeriodeStatut } from "@/lib/types-paie";
import { cn } from "@/lib/utils";

export default function PeriodeStepper({ statut }: { statut: PeriodeStatut }) {
  const current = PERIODE_ETAPES.indexOf(statut);
  return (
    <ol className="flex w-full items-center gap-1 overflow-x-auto pb-1">
      {PERIODE_ETAPES.map((etape, i) => {
        const done = i < current || statut === "cloturee";
        const active = i === current && statut !== "cloturee";
        return (
          <li key={etape} className="flex min-w-[96px] flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                done && "border-emerald-500 bg-emerald-500 text-white",
                active && "border-[#2F5F9D] bg-[#2F5F9D] text-white",
                !done && !active && "border-slate-300 bg-white text-slate-400"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn("text-xs font-medium", active ? "text-slate-900" : done ? "text-emerald-800" : "text-slate-400")}>
              {PERIODE_STATUT_LABELS[etape]}
            </span>
            {i < PERIODE_ETAPES.length - 1 && <span className={cn("h-px flex-1", done ? "bg-emerald-400" : "bg-slate-200")} />}
          </li>
        );
      })}
    </ol>
  );
}

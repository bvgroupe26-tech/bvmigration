"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import BudgetSubNav from "@/components/budget/BudgetSubNav";
import BudgetYearSelect from "@/components/budget/BudgetYearSelect";
import ConsumptionBar from "@/components/budget/ConsumptionBar";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import Skeleton from "@/components/ui/Skeleton";
import { useFinanceSynthese } from "@/hooks/budget";
import { exportJournalAchats } from "@/lib/budget-api";
import { formatFCFA, cn } from "@/lib/utils";
import { getUserErrorMessage } from "@/lib/api-errors";
import type { SyntheseFinance } from "@/lib/types-finance";

const BudgetMonthlyChart = dynamic(() => import("@/components/budget/BudgetMonthlyChart"), {
  ssr: false,
  loading: () => <Skeleton className="mt-4 h-[280px] w-full rounded-xl" />,
});

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <GlassCard className="p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn("mt-2 font-mono text-lg font-bold sm:text-xl", tone ?? "text-slate-900")}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-text-tertiary">{hint}</p> : null}
    </GlassCard>
  );
}

function CategoryBreakdown({ rows }: { rows: SyntheseFinance["par_categorie"] }) {
  const data = rows
    .map((r) => ({ ...r, total: r.realise + r.engage }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const max = Math.max(...data.map((r) => r.total), 1);
  if (data.length === 0) {
    return <p className="mt-4 text-sm text-text-secondary">Aucune dépense engagée ou payée sur l&apos;exercice.</p>;
  }
  return (
    <ul className="mt-4 space-y-3">
      {data.map((r) => (
        <li key={`${r.id}-${r.code}`}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-slate-800">
              {r.libelle}
              {r.compte_syscohada ? <span className="ml-1 font-mono text-[11px] text-slate-400">{r.compte_syscohada}</span> : null}
            </span>
            <span className="shrink-0 font-mono text-xs font-semibold text-slate-900">{formatFCFA(r.total)}</span>
          </div>
          <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="bg-[#1F3F73]" style={{ width: `${(r.realise / max) * 100}%` }} />
            <div className="bg-[#93b4e0]" style={{ width: `${(r.engage / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function BudgetOverviewPage() {
  const router = useRouter();
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);
  const { synthese, isLoading, error, mutate } = useFinanceSynthese(annee);

  async function onExport() {
    setExporting(true);
    try {
      await exportJournalAchats(annee);
    } catch (e) {
      toast.error(getUserErrorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  const alertes = synthese?.par_enveloppe.filter((e) => e.alerte !== "ok") ?? [];

  return (
    <div className="space-y-6">
      <BudgetSubNav />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-bold tracking-tight text-slate-900"
          >
            Suivi budgétaire
          </motion.h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Prévu, engagé (dépenses validées), réalisé (dépenses payées) et disponible par enveloppe.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BudgetYearSelect value={annee} onChange={setAnnee} />
          <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void mutate()}>
            Actualiser
          </Button>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={exporting} onClick={() => void onExport()}>
            Export CSV
          </Button>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => router.push("/budget/depenses?nouveau=1")}>
            Nouvelle dépense
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : error || !synthese ? (
        <GlassCard className="p-6 text-center">
          <p className="text-sm text-slate-600">
            {error ? getUserErrorMessage(error) : "Aucune donnée budgétaire pour cet exercice."}
          </p>
          <Button variant="primary" className="mt-4" onClick={() => void mutate()}>
            Réessayer
          </Button>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
            <Kpi label="Prévu" value={formatFCFA(synthese.totaux.prevu)} hint="Enveloppes actives" />
            <Kpi label="Engagé" value={formatFCFA(synthese.totaux.engage)} hint="Validé, non payé" tone="text-sky-800" />
            <Kpi label="Réalisé" value={formatFCFA(synthese.totaux.realise)} hint="Payé" tone="text-emerald-800" />
            <Kpi
              label="Disponible"
              value={formatFCFA(synthese.totaux.disponible)}
              hint="Prévu − engagé − réalisé"
              tone={synthese.totaux.disponible < 0 ? "text-red-700" : "text-[#1F3F73]"}
            />
            <Kpi label="En attente" value={formatFCFA(synthese.totaux.en_attente)} hint="Soumis à validation" tone="text-amber-800" />
            <Kpi
              label="Consommation"
              value={synthese.totaux.prevu > 0 ? `${synthese.totaux.taux} %` : "—"}
              hint="(Engagé + réalisé) / prévu"
              tone={synthese.totaux.taux > 100 ? "text-red-700" : "text-slate-900"}
            />
          </div>

          {alertes.length > 0 ? (
            <GlassCard className="border-amber-200 bg-amber-50/60 p-4">
              <p className="text-sm font-semibold text-amber-900">
                {alertes.length} enveloppe{alertes.length > 1 ? "s" : ""} en alerte
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {alertes.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium ring-1",
                      a.alerte === "depasse" ? "bg-red-50 text-red-800 ring-red-200" : "bg-white text-amber-900 ring-amber-200"
                    )}
                  >
                    {a.libelle} · {a.taux} %
                  </li>
                ))}
              </ul>
            </GlassCard>
          ) : null}

          <GlassCard className="p-5">
            <SectionHeader title="Dépenses mensuelles" subtitle={`Exercice ${synthese.annee} — réalisé et engagé par mois`} />
            <BudgetMonthlyChart data={synthese.depenses_par_mois} />
          </GlassCard>

          <GlassCard className="p-5">
            <SectionHeader title="Enveloppes" subtitle="Consommation par ligne budgétaire" />
            <div className="mt-4 overflow-x-auto">
              <table className="table-dark min-w-[820px]">
                <thead>
                  <tr>
                    <th>Enveloppe</th>
                    <th>Département</th>
                    <th className="text-right">Prévu</th>
                    <th className="text-right">Engagé</th>
                    <th className="text-right">Réalisé</th>
                    <th className="text-right">Disponible</th>
                    <th>Consommation</th>
                  </tr>
                </thead>
                <tbody>
                  {synthese.par_enveloppe.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-text-secondary">
                        Aucune enveloppe pour cet exercice.{" "}
                        <Link href="/budget/enveloppes" className="font-medium text-[#2F5F9D] hover:underline">
                          Créer une enveloppe
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    synthese.par_enveloppe.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium text-slate-900">
                          {r.libelle}
                          {r.statut !== "actif" ? (
                            <span className="ml-2 text-[11px] capitalize text-slate-400">({r.statut})</span>
                          ) : null}
                        </td>
                        <td className="text-slate-600">{r.departement ?? "—"}</td>
                        <td className="text-right font-mono">{formatFCFA(r.prevu)}</td>
                        <td className="text-right font-mono text-sky-800">{formatFCFA(r.engage)}</td>
                        <td className="text-right font-mono text-emerald-800">{formatFCFA(r.realise)}</td>
                        <td className={cn("text-right font-mono font-semibold", r.disponible < 0 ? "text-red-700" : "text-slate-900")}>
                          {formatFCFA(r.disponible)}
                        </td>
                        <td>
                          <ConsumptionBar
                            prevu={r.prevu}
                            realise={r.realise}
                            engage={r.engage}
                            alerte={r.alerte}
                            seuilPct={r.seuil_alerte_pct}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <GlassCard className="p-5">
              <SectionHeader title="Par catégorie" subtitle="Réalisé + engagé, comptes SYSCOHADA" />
              <CategoryBreakdown rows={synthese.par_categorie} />
            </GlassCard>
            <GlassCard className="p-5">
              <SectionHeader title="Top fournisseurs" subtitle="Montants payés sur l'exercice" />
              {synthese.top_fournisseurs.length === 0 ? (
                <p className="mt-4 text-sm text-text-secondary">Aucun paiement fournisseur sur l&apos;exercice.</p>
              ) : (
                <ol className="mt-4 divide-y divide-slate-100">
                  {synthese.top_fournisseurs.slice(0, 8).map((f, i) => (
                    <li key={`${f.id}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[11px] text-slate-600">
                          {i + 1}
                        </span>
                        <span className="truncate text-slate-800">{f.nom}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs font-semibold text-slate-900">{formatFCFA(f.total)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}

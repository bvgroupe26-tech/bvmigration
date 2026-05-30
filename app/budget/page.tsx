"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import BudgetSubNav from "@/components/budget/BudgetSubNav";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import Skeleton from "@/components/ui/Skeleton";
import { useBudgetSynthese } from "@/hooks/api";
import { formatFCFA } from "@/lib/utils";

const CHART_TT = {
  contentStyle: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.1)",
    borderRadius: "10px",
    fontSize: "12px",
  },
};

export default function BudgetOverviewPage() {
  const router = useRouter();
  const year = new Date().getFullYear();
  const [annee, setAnnee] = useState(year);
  const { synthese, isLoading, mutate } = useBudgetSynthese(annee);

  const taux = useMemo(() => {
    if (!synthese) return null;
    return synthese.totaux.taux_consommation_pct;
  }, [synthese]);

  if (isLoading || !synthese) {
    return (
      <div className="space-y-4">
        <BudgetSubNav />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BudgetSubNav />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-bold tracking-tight text-slate-900"
          >
            Suivi budgétaire
          </motion.h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Reporting des dépenses par rapport aux enveloppes prévues. Workflow : catégories → enveloppes → saisie des
            dépenses (validation par statut).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Exercice</label>
          <input
            type="number"
            min={2000}
            max={2100}
            value={annee}
            onChange={(e) => setAnnee(Number(e.target.value))}
            className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm font-mono text-slate-900"
          />
          <Button variant="ghost" onClick={() => mutate()}>
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Prévu (actif)</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900">{formatFCFA(synthese.totaux.prevu_actif)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Réalisé (approuvé + payé)</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-800">
            {formatFCFA(synthese.totaux.realise_approuve_paye)}
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">En attente</p>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-800">{formatFCFA(synthese.totaux.en_attente)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taux consommation</p>
          <p className="mt-2 font-mono text-2xl font-bold text-[#1F3F73]">{taux != null ? `${taux} %` : "—"}</p>
          <p className="mt-1 text-[11px] text-text-tertiary">Réalisé / prévu actif</p>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <SectionHeader
          title="Dépenses mensuelles"
          subtitle="Montants saisis (tous statuts sauf refusé) sur 12 mois glissants"
        />
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={synthese.depenses_par_mois} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={1} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip {...CHART_TT} formatter={(value) => [formatFCFA(Number(value)), ""]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="montant" fill="#6366f1" name="Montant (FCFA)" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader title="Enveloppes" subtitle={`Exercice ${synthese.annee} — écart = prévu − réalisé (approuvé/payé)`} />
        <div className="mt-4 overflow-x-auto">
          <table className="table-dark min-w-[640px]">
            <thead>
              <tr>
                <th>Enveloppe</th>
                <th>Département</th>
                <th>Statut</th>
                <th className="text-right">Prévu</th>
                <th className="text-right">Réalisé</th>
                <th className="text-right">En attente</th>
                <th className="text-right">Écart</th>
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
                    <td className="font-medium text-slate-900">{r.libelle}</td>
                    <td className="text-slate-600">{r.departement ?? "—"}</td>
                    <td>
                      <span className="text-xs capitalize text-slate-600">{r.statut}</span>
                    </td>
                    <td className="text-right font-mono">{formatFCFA(r.montant_prevu)}</td>
                    <td className="text-right font-mono text-emerald-800">{formatFCFA(r.realise)}</td>
                    <td className="text-right font-mono text-amber-800">{formatFCFA(r.en_attente)}</td>
                    <td className="text-right font-mono font-semibold text-slate-900">{formatFCFA(r.ecart)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => router.push("/budget/depenses")}>
          Saisir une dépense
        </Button>
        <Button variant="secondary" onClick={() => router.push("/budget/enveloppes")}>
          Gérer les enveloppes
        </Button>
      </div>
    </div>
  );
}

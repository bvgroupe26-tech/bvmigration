"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Wallet,
  CheckCircle2,
  Clock,
  FileText,
  Calculator,
  Download,
  RefreshCcw,
} from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import StatBadge from "@/components/ui/StatBadge";
import Avatar from "@/components/ui/Avatar";
import SectionHeader from "@/components/ui/SectionHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import PaieGenerateResultModal from "@/components/paie/PaieGenerateResultModal";
import { usePaie, usePaieStats, usePaieEvolution } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { refreshNotificationsCache } from "@/hooks/useNotifications";
import { formatProrata, normalizeGeneratePaieResult, type GeneratePaieResult } from "@/lib/paie-utils";
import type { Paie } from "@/lib/types";

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function PaiePage() {
  const now = new Date();
  const [mois, setMois] = useState<string>(String(now.getMonth() + 1).padStart(2, "0"));
  const [annee, setAnnee] = useState<number>(now.getFullYear());
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GeneratePaieResult | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const { bulletins, isLoading, mutate } = usePaie(mois, annee, statutFilter === "all" ? undefined : statutFilter);
  const { stats, mutate: mutateStats } = usePaieStats(mois, annee);
  const { evolution } = usePaieEvolution();

  async function generate() {
    setGenerating(true);
    const periodeLabel = `${MOIS_NOMS[parseInt(mois, 10) - 1]} ${annee}`;
    try {
      const raw = await apiClient.post<unknown>("/paie", { mois, annee });
      const res = normalizeGeneratePaieResult(raw);
      setGenerateResult(res);
      setResultModalOpen(true);
      if (res.generated > 0) {
        toast.success(`${res.generated} bulletin(s) généré(s) · ${res.skipped} ignoré(s)`);
      } else if (res.skipped > 0) {
        toast.info(`Aucun nouveau bulletin pour ${periodeLabel} (${res.skipped} ignoré(s))`);
      } else {
        toast.info(`Aucun bulletin éligible pour ${periodeLabel}`);
      }
      mutate();
      mutateStats();
      void refreshNotificationsCache();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setGenerating(false);
      setConfirmGenerate(false);
    }
  }

  async function changeStatut(b: Paie, statut: "paye" | "annule") {
    try {
      await apiClient.put(`/paie/${b.id}`, { statut });
      toast.success(`Bulletin ${statut === "paye" ? "marqué payé" : "annulé"}`);
      mutate();
      mutateStats();
      void refreshNotificationsCache();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  }

  async function exportExcel() {
    try {
      const XLSX = await import("xlsx");
      const data = bulletins.map((b) => ({
        Employe: `${b.employe_prenom ?? ""} ${b.employe_nom ?? ""}`.trim(),
        Poste: b.employe_poste ?? "",
        Periode: `${b.mois}/${b.annee}`,
        SalaireBase: b.salaire_base,
        PrimeTransport: b.prime_transport,
        PrimeLogement: b.prime_logement,
        PrimePerformance: b.prime_performance,
        AutresPrimes: b.autres_primes,
        CNSS: b.cnss,
        Impot: b.impot,
        AutresRetenues: b.autres_retenues,
        SalaireNet: b.salaire_net,
        Statut: b.statut,
        DatePaiement: b.date_paiement ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Paie");
      XLSX.writeFile(wb, `paie_${annee}_${mois}.xlsx`);
      toast.success("Export généré");
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Impossible d'exporter les données."));
    }
  }

  const annees = useMemo(() => {
    const out: number[] = [];
    for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) out.push(y);
    return out;
  }, [now]);

  const columns: Column<Paie>[] = [
    {
      key: "employe",
      header: "Employé",
      render: (b) => (
        <div className="flex items-center gap-3">
          <Avatar nom={b.employe_nom ?? "?"} prenom={b.employe_prenom ?? ""} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {b.employe_prenom} {b.employe_nom}
            </p>
            <p className="truncate text-xs text-text-tertiary">{b.employe_poste ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "periode",
      header: "Période",
      render: (b) => {
        const prorata = formatProrata(b);
        return (
          <div>
            <span className="font-mono text-xs text-text-secondary">{b.mois}/{b.annee}</span>
            {prorata && (
              <p className="mt-0.5 text-[10px] font-medium text-amber-700">{prorata}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "base",
      header: "Salaire base",
      align: "right",
      render: (b) => <span className="font-mono text-xs text-text-secondary">{b.salaire_base.toLocaleString("fr-FR")}</span>,
    },
    {
      key: "primes",
      header: "Primes",
      align: "right",
      render: (b) => (
        <span className="font-mono text-xs text-emerald-300">
          +{(b.prime_transport + b.prime_logement + b.prime_performance + b.autres_primes).toLocaleString("fr-FR")}
        </span>
      ),
    },
    {
      key: "retenues",
      header: "Retenues",
      align: "right",
      render: (b) => (
        <span className="font-mono text-xs text-red-300">
          -{(b.cnss + b.impot + b.autres_retenues).toLocaleString("fr-FR")}
        </span>
      ),
    },
    {
      key: "net",
      header: "Salaire net",
      align: "right",
      render: (b) => (
        <span className="font-mono text-sm font-bold text-slate-900">{b.salaire_net.toLocaleString("fr-FR")} F</span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (b) => (
        <StatBadge variant={b.statut as "en_attente" | "paye" | "annule"}>{b.statut.replace("_", " ")}</StatBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/paie/${b.id}`}
            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-text-secondary transition hover:bg-slate-100 hover:text-slate-900"
          >
            Voir
          </Link>
          {b.statut === "en_attente" && (
            <>
              <button
                type="button"
                onClick={() => changeStatut(b, "paye")}
                className="inline-flex h-8 items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 text-[11px] text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Payer
              </button>
              <button
                type="button"
                onClick={() => changeStatut(b, "annule")}
                className="inline-flex h-8 items-center rounded-lg border border-red-500/20 bg-red-500/10 px-2 text-[11px] text-red-300 transition hover:bg-red-500/20"
              >
                Annuler
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-7">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Gestion de la paie</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Bulletins de paie, calculs automatiques (CNSS 5.6% · Impôt 10%) et export Excel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            {MOIS_NOMS.map((m, i) => (
              <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
            ))}
          </select>
          <select
            value={annee}
            onChange={(e) => setAnnee(Number(e.target.value))}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            {annees.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button variant="ghost" icon={<Download className="h-4 w-4" />} onClick={exportExcel} disabled={bulletins.length === 0}>
            Exporter
          </Button>
          <Button
            variant="primary"
            icon={<Calculator className="h-4 w-4" />}
            onClick={() => setConfirmGenerate(true)}
          >
            Générer la paie
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Masse salariale"
          value={stats?.masse_salariale ?? 0}
          icon={Wallet}
          color="cyan"
          format="currency"
          index={0}
        />
        <KPICard title="Bulletins payés" value={stats?.payes ?? 0} icon={CheckCircle2} color="green" index={1} />
        <KPICard title="En attente" value={stats?.en_attente ?? 0} icon={Clock} color="amber" index={2} />
        <KPICard title="Total bulletins" value={stats?.total ?? 0} icon={FileText} color="blue" index={3} />
      </div>

      <GlassCard className="p-6">
        <SectionHeader title="Évolution masse salariale" subtitle="6 derniers mois" />
        {evolution.length === 0 ? (
          <p className="mt-5 text-sm text-text-tertiary">Pas encore d&apos;historique.</p>
        ) : (
          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolution}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="mois" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(59,130,246,0.08)" }}
                  contentStyle={{
                    background: "rgba(10,15,30,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${Number(v).toLocaleString("fr-FR")} F`, "Masse"]}
                />
                <Bar dataKey="masse" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader
            title={`Bulletins · ${MOIS_NOMS[parseInt(mois, 10) - 1]} ${annee}`}
            subtitle={`${bulletins.length} bulletin(s)`}
          />
          <div className="flex items-center gap-2">
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900"
            >
              <option value="all">Tous statuts</option>
              <option value="en_attente">En attente</option>
              <option value="paye">Payés</option>
              <option value="annule">Annulés</option>
            </select>
            <Button variant="ghost" size="sm" icon={<RefreshCcw className="h-3.5 w-3.5" />} onClick={() => mutate()}>
              Rafraîchir
            </Button>
          </div>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              data={bulletins}
              columns={columns}
              rowKey={(b) => b.id}
              pagination
              pageSize={10}
              emptyMessage={`Aucun bulletin pour ${MOIS_NOMS[parseInt(mois, 10) - 1]} ${annee}. Cliquez sur « Générer la paie » pour créer les bulletins.`}
            />
          )}
        </div>
      </GlassCard>

      <ConfirmDialog
        open={confirmGenerate}
        onClose={() => setConfirmGenerate(false)}
        onConfirm={generate}
        title={`Générer la paie ${MOIS_NOMS[parseInt(mois, 10) - 1]} ${annee} ?`}
        description={`Seuls les employés éligibles recevront un bulletin (actifs, ou inactifs avec fin de contrat dans le mois). Les autres seront listés avec le motif d'exclusion.`}
        confirmLabel="Générer"
        variant="warning"
        loading={generating}
      />

      <PaieGenerateResultModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        result={generateResult}
        periodeLabel={`${MOIS_NOMS[parseInt(mois, 10) - 1]} ${annee}`}
      />
    </div>
  );
}

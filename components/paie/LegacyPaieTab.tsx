"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Wallet, CheckCircle2, Clock, FileText, Calculator, Download, RefreshCcw } from "lucide-react";
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
import { useEmployes, usePaie, usePaieStats, usePaieEvolution } from "@/hooks/api";
import { apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { refreshNotificationsCache } from "@/hooks/useNotifications";
import { formatProrata, normalizeGeneratePaieResult, type GeneratePaieResult } from "@/lib/paie-utils";
import { MOIS_NOMS } from "@/lib/types-paie";
import type { Paie } from "@/lib/types";

type PendingAction = { bulletin: Paie; statut: "paye" | "annule" } | null;

export default function LegacyPaieTab() {
  const now = new Date();
  const [mois, setMois] = useState<string>(String(now.getMonth() + 1).padStart(2, "0"));
  const [annee, setAnnee] = useState<number>(now.getFullYear());
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [selectedEmployeId, setSelectedEmployeId] = useState<number | undefined>(undefined);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GeneratePaieResult | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [changing, setChanging] = useState(false);

  const { employes } = useEmployes({ statut: "actif", limit: 500 });
  const selectedEmploye = employes.find((e) => e.id === selectedEmployeId);
  const { bulletins, isLoading, mutate } = usePaie(mois, annee, statutFilter === "all" ? undefined : statutFilter);
  const { stats, mutate: mutateStats } = usePaieStats(mois, annee);
  const { evolution } = usePaieEvolution();
  const tableRef = useRef<HTMLDivElement>(null);
  const periode = `${MOIS_NOMS[parseInt(mois, 10) - 1]} ${annee}`;

  function goToBulletins(filter: string) {
    setStatutFilter(filter);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function generate() {
    setGenerating(true);
    try {
      const raw = await apiClient.post<unknown>("/paie", { mois, annee, employe_id: selectedEmployeId });
      const res = normalizeGeneratePaieResult(raw);
      setGenerateResult(res);
      setResultModalOpen(true);
      if (res.generated > 0) {
        toast.success(`${res.generated} bulletin(s) généré(s) · ${res.skipped} ignoré(s)`);
      } else if (res.skipped > 0) {
        toast.info(`Aucun nouveau bulletin pour ${periode} (${res.skipped} ignoré(s))`);
      } else {
        toast.info(`Aucun bulletin éligible pour ${periode}`);
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

  async function changeStatut() {
    if (!pending) return;
    setChanging(true);
    try {
      await apiClient.put(`/paie/${pending.bulletin.id}`, { statut: pending.statut });
      toast.success(`Bulletin ${pending.statut === "paye" ? "marqué payé" : "annulé"}`);
      setPending(null);
      mutate();
      mutateStats();
      void refreshNotificationsCache();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setChanging(false);
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

  const currentYear = now.getFullYear();
  const annees = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) out.push(y);
    return out;
  }, [currentYear]);

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
            {prorata && <p className="mt-0.5 text-[10px] font-medium text-amber-700">{prorata}</p>}
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
                onClick={() => setPending({ bulletin: b, statut: "paye" })}
                className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[11px] text-emerald-800 transition hover:bg-emerald-100"
              >
                Payer
              </button>
              <button
                type="button"
                onClick={() => setPending({ bulletin: b, statut: "annule" })}
                className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 px-2 text-[11px] text-red-800 transition hover:bg-red-100"
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-text-secondary">
          Ancien calcul : CNSS et impôt selon les taux saisis sur chaque fiche employé. Reste disponible tant que le
          paramétrage du nouveau moteur n&apos;est pas complet.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            {MOIS_NOMS.map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
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
          <select
            value={selectedEmployeId ?? ""}
            onChange={(e) => setSelectedEmployeId(e.target.value ? Number(e.target.value) : undefined)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="">Tous les employés</option>
            {employes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.prenom} {e.nom}
              </option>
            ))}
          </select>
          <Button variant="ghost" icon={<Download className="h-4 w-4" />} onClick={exportExcel} disabled={bulletins.length === 0}>
            Exporter
          </Button>
          <Button variant="primary" icon={<Calculator className="h-4 w-4" />} onClick={() => setConfirmGenerate(true)}>
            Générer la paie
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Masse salariale" value={stats?.masse_salariale ?? 0} icon={Wallet} color="cyan" format="currency" index={0} />
        <KPICard title="Bulletins payés" value={stats?.payes ?? 0} icon={CheckCircle2} color="green" index={1} />
        <KPICard title="En attente" value={stats?.en_attente ?? 0} icon={Clock} color="amber" index={2} onClick={() => goToBulletins("en_attente")} />
        <KPICard title="Total bulletins" value={stats?.total ?? 0} icon={FileText} color="blue" index={3} onClick={() => goToBulletins("all")} />
      </div>

      <GlassCard className="p-6">
        <SectionHeader title="Évolution masse salariale" subtitle="6 derniers mois" />
        {evolution.length === 0 ? (
          <p className="mt-5 text-sm text-text-tertiary">Pas encore d&apos;historique.</p>
        ) : (
          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolution}>
                <CartesianGrid stroke="rgba(148,163,184,0.2)" vertical={false} />
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
                  contentStyle={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [`${Number(v).toLocaleString("fr-FR")} F`, "Masse"]}
                />
                <Bar dataKey="masse" fill="#2F5F9D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <div ref={tableRef} className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title={`Bulletins · ${periode}`} subtitle={`${bulletins.length} bulletin(s)`} />
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
              emptyMessage={`Aucun bulletin pour ${periode}. Cliquez sur « Générer la paie » pour créer les bulletins.`}
            />
          )}
        </div>
      </GlassCard>

      <ConfirmDialog
        open={confirmGenerate}
        onClose={() => setConfirmGenerate(false)}
        onConfirm={generate}
        title={`Générer la paie ${periode} ?`}
        description={
          selectedEmploye
            ? `Générer un bulletin pour ${selectedEmploye.prenom} ${selectedEmploye.nom}. Les employés non sélectionnés ne seront pas traités.`
            : "Seuls les employés éligibles recevront un bulletin (actifs, ou inactifs avec fin de contrat dans le mois). Les autres seront listés avec le motif d'exclusion."
        }
        confirmLabel="Générer"
        variant="warning"
        loading={generating}
      />

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={changeStatut}
        loading={changing}
        variant={pending?.statut === "annule" ? "danger" : "warning"}
        title={pending?.statut === "paye" ? "Marquer ce bulletin comme payé ?" : "Annuler ce bulletin ?"}
        description={
          pending
            ? `${pending.bulletin.employe_prenom ?? ""} ${pending.bulletin.employe_nom ?? ""} — ${pending.bulletin.salaire_net.toLocaleString("fr-FR")} F`
            : undefined
        }
        confirmLabel={pending?.statut === "paye" ? "Marquer payé" : "Annuler le bulletin"}
        cancelLabel="Retour"
      />

      <PaieGenerateResultModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        result={generateResult}
        periodeLabel={periode}
      />
    </div>
  );
}

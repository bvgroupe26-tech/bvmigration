"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChartLine,
  Award,
  TrendingUp,
  Users,
  Plus,
  Trash2,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Avatar from "@/components/ui/Avatar";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import SectionHeader from "@/components/ui/SectionHeader";
import EvaluationForm from "@/components/forms/EvaluationForm";
import { useEvaluations } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import type { Evaluation } from "@/lib/types";

export default function EvaluationsPage() {
  const { evaluations, isLoading, mutate } = useEvaluations();
  const [showAdd, setShowAdd] = useState(false);
  const [del, setDel] = useState<Evaluation | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  const stats = useMemo(() => {
    const total = evaluations.length;
    const moyenne = total > 0 ? evaluations.reduce((acc, e) => acc + e.note_globale, 0) / total : 0;
    const excellents = evaluations.filter((e) => e.note_globale >= 8).length;
    const aRevoir = evaluations.filter((e) => e.note_globale < 5).length;
    return { total, moyenne, excellents, aRevoir };
  }, [evaluations]);

  const chartData = useMemo(() => {
    // Grouper par période, moyenne des notes
    const map = new Map<string, { sum: number; count: number }>();
    for (const e of evaluations) {
      const entry = map.get(e.periode) ?? { sum: 0, count: 0 };
      entry.sum += e.note_globale;
      entry.count += 1;
      map.set(e.periode, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periode, { sum, count }]) => ({
        periode,
        moyenne: Number((sum / count).toFixed(2)),
      }));
  }, [evaluations]);

  async function confirmDel() {
    if (!del) return;
    setBusyDel(true);
    try {
      await apiClient.del(`/evaluations/${del.id}`);
      toast.success("Évaluation supprimée");
      setDel(null);
      mutate();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusyDel(false);
    }
  }

  const cols: Column<Evaluation>[] = [
    {
      key: "emp",
      header: "Employé",
      render: (e) => (
        <Link href={`/employes/${e.employe_id}`} className="flex items-center gap-3 group">
          <Avatar nom={e.employe_nom ?? "?"} prenom={e.employe_prenom ?? ""} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 group-hover:text-[#1F3F73]">
              {e.employe_prenom} {e.employe_nom}
            </p>
            <p className="truncate text-xs text-text-tertiary">{e.employe_poste ?? "—"}</p>
          </div>
        </Link>
      ),
    },
    { key: "periode", header: "Période", render: (e) => <span className="font-mono text-xs text-text-secondary">{e.periode}</span> },
    { key: "evaluateur", header: "Évaluateur", render: (e) => <span className="text-text-secondary">{e.evaluateur ?? "—"}</span> },
    {
      key: "criteres",
      header: "Détail",
      render: (e) => (
        <span className="font-mono text-[11px] text-text-tertiary">
          P:{e.ponctualite} · Q:{e.qualite_travail} · T:{e.travail_equipe} · I:{e.initiative}
        </span>
      ),
    },
    {
      key: "note",
      header: "Note globale",
      align: "right",
      render: (e) => {
        const color =
          e.note_globale >= 8
            ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
            : e.note_globale >= 6
            ? "text-[#2F5F9D]/80 bg-[#2F5F9D]/10 border-[#2F5F9D]/30"
            : e.note_globale >= 4
            ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
            : "text-red-300 bg-red-500/10 border-red-500/30";
        return (
          <span className={`inline-flex rounded-lg border px-2.5 py-1 font-mono text-xs font-bold ${color}`}>
            {e.note_globale.toFixed(1)} / 10
          </span>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      render: (e) => (
        <span className="font-mono text-xs text-text-tertiary">
          {e.date_evaluation.slice(0, 10)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <button
          type="button"
          onClick={() => setDel(e)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-text-secondary transition hover:bg-red-500/10 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
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
          <Link href="/competences" className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-slate-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour aux compétences
          </Link>
          <h1 className="mt-2 font-display text-[28px] font-bold tracking-tight text-slate-900">Évaluations</h1>
          <p className="mt-1 text-sm text-text-secondary">Suivi des performances des collaborateurs.</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
          Nouvelle évaluation
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total" value={stats.total} icon={Users} color="blue" index={0} />
        <KPICard
          title="Moyenne globale"
          value={Math.round(stats.moyenne * 10) / 10}
          icon={ChartLine}
          color="cyan"
          suffix="/ 10"
          index={1}
        />
        <KPICard title="Excellents (≥8)" value={stats.excellents} icon={Award} color="green" index={2} />
        <KPICard title="À revoir (<5)" value={stats.aRevoir} icon={TrendingUp} color="amber" index={3} />
      </div>

      <GlassCard className="p-6">
        <SectionHeader title="Évolution des notes" subtitle="Moyenne par période" />
        {chartData.length === 0 ? (
          <p className="mt-5 text-sm text-text-tertiary">Pas encore d&apos;évaluations.</p>
        ) : (
          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="periode" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={11} domain={[0, 10]} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,15,30,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="moyenne"
                  stroke="#06B6D4"
                  strokeWidth={3}
                  dot={{ fill: "#06B6D4", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader title={`${evaluations.length} évaluation(s)`} />
        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <DataTable
              data={evaluations}
              columns={cols}
              rowKey={(e) => e.id}
              pagination
              pageSize={10}
              emptyMessage="Aucune évaluation enregistrée."
            />
          )}
        </div>
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle évaluation" size="lg">
        <EvaluationForm
          onSuccess={() => {
            setShowAdd(false);
            mutate();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={confirmDel}
        title="Supprimer cette évaluation ?"
        description={del ? `Évaluation de ${del.employe_prenom} ${del.employe_nom} (${del.periode})` : ""}
        confirmLabel="Supprimer"
        loading={busyDel}
      />
    </div>
  );
}

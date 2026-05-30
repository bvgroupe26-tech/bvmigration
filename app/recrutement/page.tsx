"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Briefcase,
  Users,
  CheckCircle2,
  TrendingUp,
  Plus,
  Lock,
  Trash2,
} from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import StatBadge from "@/components/ui/StatBadge";
import Skeleton from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import OffreForm from "@/components/forms/OffreForm";
import { useOffres, useOffresStats } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import type { Offre } from "@/lib/types";

export default function RecrutementPage() {
  const [statut, setStatut] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<Offre | null>(null);
  const [busy, setBusy] = useState(false);

  const { offres, isLoading, mutate } = useOffres({ statut: statut === "all" ? undefined : statut });
  const { stats, mutate: mutateStats } = useOffresStats();

  async function closeOffre(o: Offre) {
    try {
      await apiClient.put(`/offres/${o.id}`, { statut: "fermee" });
      toast.success("Offre fermée");
      mutate();
      mutateStats();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiClient.del(`/offres/${deleting.id}`);
      toast.success("Offre supprimée");
      setDeleting(null);
      mutate();
      mutateStats();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Recrutement</h1>
          <p className="mt-1 text-sm text-text-secondary">Offres d&apos;emploi et candidatures.</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
          Nouveau poste
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Offres ouvertes" value={stats?.ouvertes ?? 0} icon={Briefcase} color="blue" index={0} />
        <KPICard title="Candidatures" value={stats?.total_candidats ?? 0} icon={Users} color="cyan" index={1} />
        <KPICard title="Pourvues" value={stats?.pourvues ?? 0} icon={CheckCircle2} color="green" index={2} />
        <KPICard title="Total offres" value={stats?.total ?? 0} icon={TrendingUp} color="violet" index={3} />
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">Offres</h2>
            <p className="text-xs text-text-secondary">{offres.length} offre(s)</p>
          </div>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="all">Toutes</option>
            <option value="ouverte">Ouvertes</option>
            <option value="fermee">Fermées</option>
            <option value="pourvue">Pourvues</option>
          </select>
        </div>

        {isLoading ? (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        ) : offres.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-10 text-center">
            <Briefcase className="mx-auto h-9 w-9 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Aucune offre publiée pour le moment.</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={() => setShowAdd(true)} icon={<Plus className="h-4 w-4" />}>
              Publier une offre
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offres.map((o, idx) => {
              const cible = o.cible_candidats || 10;
              const ratio = Math.min(100, Math.round(((o.candidats_count ?? 0) / cible) * 100));
              const barColor =
                ratio >= 100
                  ? "from-emerald-500 to-emerald-300"
                  : ratio >= 70
                  ? "from-[#2F5F9D] to-[#1F3F73]"
                  : ratio >= 40
                  ? "from-[#2F5F9D] to-[#1F3F73]"
                  : "from-amber-500 to-amber-300";

              return (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.04 }}
                  className="group rounded-2xl border border-slate-200 bg-white/[0.02] p-5 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/recrutement/${o.id}`} className="min-w-0">
                      <p className="truncate font-display font-semibold text-slate-900 group-hover:text-[#1F3F73] transition">
                        {o.titre}
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">{o.departement} · {o.type_contrat}</p>
                    </Link>
                    <StatBadge variant={o.statut}>{o.statut}</StatBadge>
                  </div>

                  {o.description && (
                    <p className="mt-3 line-clamp-2 text-xs text-text-secondary">{o.description}</p>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-text-secondary">
                      <span>
                        <span className="font-mono text-slate-900">{o.candidats_count ?? 0}</span>
                        <span className="text-text-tertiary"> / {cible}</span>
                      </span>
                      <span className="font-mono">{ratio}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${ratio}%` }}
                        transition={{ duration: 0.8, delay: 0.15 + idx * 0.05 }}
                        className={`h-full bg-gradient-to-r ${barColor}`}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-[11px] text-text-tertiary">
                      Publiée le{" "}
                      {new Date(o.date_publication.replace(" ", "T")).toLocaleDateString("fr-FR")}
                    </span>
                    <div className="flex items-center gap-1">
                      {o.statut === "ouverte" && (
                        <button
                          type="button"
                          onClick={() => closeOffre(o)}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] text-text-secondary hover:text-slate-900 hover:bg-slate-100 transition"
                        >
                          <Lock className="h-3 w-3" /> Fermer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleting(o)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-text-secondary hover:text-red-600 hover:bg-red-500/10 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle offre d'emploi" size="lg">
        <OffreForm
          onSuccess={() => {
            setShowAdd(false);
            mutate();
            mutateStats();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Supprimer cette offre ?"
        description={deleting ? `« ${deleting.titre} » et toutes les candidatures associées seront supprimées.` : ""}
        confirmLabel="Supprimer"
        loading={busy}
      />
    </div>
  );
}

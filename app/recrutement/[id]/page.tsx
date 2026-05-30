"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Plus, Lock, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import StatBadge from "@/components/ui/StatBadge";
import SectionHeader from "@/components/ui/SectionHeader";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useOffre } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { useRouter } from "next/navigation";

export default function OffreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { offre, isLoading, mutate } = useOffre(id);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  async function close() {
    try {
      await apiClient.put(`/offres/${id}`, { statut: "fermee" });
      toast.success("Offre fermée");
      mutate();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  }

  async function del() {
    setBusy(true);
    try {
      await apiClient.del(`/offres/${id}`);
      toast.success("Offre supprimée");
      router.push("/recrutement");
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function changeCandidatStatut(cid: number, statut: string) {
    try {
      await apiClient.put(`/candidatures/${cid}`, { statut });
      toast.success("Statut mis à jour");
      mutate();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!offre) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-text-secondary">Offre introuvable</p>
        <Link href="/recrutement" className="mt-4 inline-block text-sm font-medium text-[#2F5F9D] hover:text-[#1F3F73]">
          ← Retour
        </Link>
      </GlassCard>
    );
  }

  const cible = offre.cible_candidats || 10;
  const ratio = Math.min(100, Math.round(((offre.candidats_count ?? 0) / cible) * 100));

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-2">
        <Link href="/recrutement" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="flex items-center gap-2">
          {offre.statut === "ouverte" && (
            <Button variant="ghost" icon={<Lock className="h-4 w-4" />} onClick={close}>
              Fermer l&apos;offre
            </Button>
          )}
          <Link href={`/recrutement/${id}/candidature`}>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Ajouter candidat
            </Button>
          </Link>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDel(true)}>
            Supprimer
          </Button>
        </div>
      </motion.div>

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{offre.titre}</h1>
            <p className="mt-1 text-sm text-text-secondary">{offre.departement} · {offre.type_contrat}</p>
          </div>
          <StatBadge variant={offre.statut}>{offre.statut}</StatBadge>
        </div>

        {offre.description && (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Description</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{offre.description}</p>
          </div>
        )}

        {offre.competences_requises && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Compétences requises</h3>
            <p className="mt-2 text-sm text-text-secondary">{offre.competences_requises}</p>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-slate-200 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">
              Candidats : <span className="font-mono text-slate-900">{offre.candidats_count ?? 0}</span>
              <span className="text-text-tertiary"> / {cible}</span>
            </span>
            <span className="font-mono text-text-secondary">{ratio}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ratio}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-[#2F5F9D] to-[#1F3F73]"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader title={`Candidatures (${offre.candidatures?.length ?? 0})`} />
        {!offre.candidatures || offre.candidatures.length === 0 ? (
          <p className="mt-4 text-sm text-text-tertiary">Aucune candidature pour le moment.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {offre.candidatures.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{c.prenom} {c.nom}</p>
                  <p className="text-[11px] text-text-tertiary">
                    {c.email ?? "—"} · {c.telephone ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={c.statut}
                    onChange={(e) => changeCandidatStatut(c.id, e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-900"
                  >
                    <option value="recu">Reçu</option>
                    <option value="en_cours">En cours</option>
                    <option value="retenu">Retenu</option>
                    <option value="rejete">Rejeté</option>
                  </select>
                  <StatBadge variant={c.statut as "recu" | "en_cours" | "retenu" | "rejete"} size="sm">
                    {c.statut.replace("_", " ")}
                  </StatBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={del}
        title="Supprimer cette offre ?"
        description={`« ${offre.titre} » et toutes les candidatures associées seront supprimées.`}
        confirmLabel="Supprimer"
        loading={busy}
      />
    </div>
  );
}

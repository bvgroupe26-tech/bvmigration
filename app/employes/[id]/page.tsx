"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Wallet,
  Pencil,
  Trash2,
  FileText,
  Award,
  GraduationCap,
  CalendarOff,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import StatBadge from "@/components/ui/StatBadge";
import SectionHeader from "@/components/ui/SectionHeader";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import EmployeForm from "@/components/forms/EmployeForm";
import { useEmploye, useCompetences, useFormations, useEvaluations, usePaie, useAbsences } from "@/hooks/api";
import { absenceDureeJours, formatMoisPaie, formatPeriodeAbsence } from "@/lib/absence-utils";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import { useRouter } from "next/navigation";

export default function EmployeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const empId = Number(id);
  const router = useRouter();
  const { employe, isLoading, mutate } = useEmploye(empId);
  const { competences } = useCompetences(empId);
  const { formations } = useFormations(empId);
  const { evaluations } = useEvaluations({ employe_id: empId });
  const { bulletins } = usePaie();
  const { absences: employeAbsences } = useAbsences({ employe_id: empId });
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const employeBulletins = bulletins.filter((b) => b.employe_id === empId).slice(0, 5);

  async function confirmDelete() {
    setBusy(true);
    try {
      await apiClient.del(`/employes/${empId}`);
      toast.success("Employé supprimé");
      router.push("/employes");
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!employe) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-text-secondary">Employé introuvable</p>
        <Link href="/employes" className="mt-4 inline-block text-sm font-medium text-[#2F5F9D] hover:text-[#1F3F73]">
          ← Retour à la liste
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-7">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <Link href="/employes" className="inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Retour aux employés
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
            Modifier
          </Button>
          <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(true)}>
            Supprimer
          </Button>
        </div>
      </motion.div>

      <GlassCard className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar nom={employe.nom} prenom={employe.prenom} size="xl" showStatus status={employe.statut === "actif" ? "online" : "offline"} />
          <div className="flex-1 min-w-[240px]">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {employe.prenom} {employe.nom}
              </h1>
              <StatBadge variant={employe.statut as "actif" | "inactif" | "suspendu"}>{employe.statut}</StatBadge>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {employe.poste ?? "—"} · {employe.departement ?? "—"}
            </p>
            <p className="mt-2 inline-flex rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Matricule RH : {employe.matricule ?? formatEmployeeMatricule(employe.id)}
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Info icon={Mail} label="Email" value={employe.email ?? "—"} />
              <Info icon={Phone} label="Téléphone" value={employe.telephone ?? "—"} />
              <Info icon={MapPin} label="Adresse" value={employe.adresse ?? "—"} />
              <Info icon={Calendar} label="Date d'embauche" value={employe.date_embauche ?? "—"} />
              <Info
                icon={Calendar}
                label="Fin de contrat"
                value={
                  employe.date_fin_contrat ??
                  (employe as { dateFinContrat?: string | null }).dateFinContrat ??
                  "—"
                }
              />
              <Info icon={Briefcase} label="Type de contrat" value={employe.type_contrat ?? "—"} />
              <Info icon={Wallet} label="Salaire de base" value={`${(employe.salaire_base ?? 0).toLocaleString("fr-FR")} F CFA`} />
              <Info icon={Calendar} label="Date de naissance" value={employe.date_naissance ?? "—"} />
              <Info icon={Briefcase} label="Situation" value={employe.situation_familiale ?? "—"} />
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard className="p-5">
          <SectionHeader title="Compétences" subtitle={`${competences.length} compétence(s)`} icon={<GraduationCap className="h-4 w-4" />} />
          {competences.length === 0 ? (
            <p className="mt-4 text-sm text-text-tertiary">Aucune compétence enregistrée.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {competences.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/[0.02] px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.nom_competence}</p>
                    {c.categorie && <p className="text-[11px] text-text-tertiary">{c.categorie}</p>}
                  </div>
                  <span className="font-mono text-xs text-text-secondary capitalize">{c.niveau}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Formations & certifications" subtitle={`${formations.length} document(s)`} icon={<Award className="h-4 w-4" />} />
          {formations.length === 0 ? (
            <p className="mt-4 text-sm text-text-tertiary">Aucune formation.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {formations.map((f) => (
                <li key={f.id} className="rounded-xl border border-slate-200 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{f.titre}</p>
                    <span className="font-mono text-[10px] uppercase text-text-tertiary">{f.type}</span>
                  </div>
                  {f.organisme && <p className="text-[11px] text-text-tertiary">{f.organisme}</p>}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Évaluations" subtitle={`${evaluations.length} évaluation(s)`} icon={<FileText className="h-4 w-4" />} />
          {evaluations.length === 0 ? (
            <p className="mt-4 text-sm text-text-tertiary">Aucune évaluation.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {evaluations.map((ev) => (
                <li key={ev.id} className="rounded-xl border border-slate-200 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{ev.periode}</p>
                    <span className="font-mono text-sm font-bold text-emerald-300">
                      {ev.note_globale.toFixed(1)}/10
                    </span>
                  </div>
                  {ev.commentaire && (
                    <p className="mt-1 text-[11px] text-text-tertiary line-clamp-2">{ev.commentaire}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader
            title="Congés & absences"
            subtitle={`${employeAbsences.length} demande(s)`}
            icon={<CalendarOff className="h-4 w-4" />}
            actions={
              <Link href="/presence/absences" className="text-xs font-medium text-[#2F5F9D] hover:text-[#1F3F73]">
                Tout gérer →
              </Link>
            }
          />
          {employeAbsences.length === 0 ? (
            <p className="mt-4 text-sm text-text-tertiary">Aucune demande pour cet employé.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {employeAbsences.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 capitalize">
                      {(a.type_absence ?? "").replace(/_/g, " ")}
                    </p>
                    <p className="text-[11px] text-text-tertiary truncate">
                      {formatPeriodeAbsence(a.date_debut, a.date_fin)} · {absenceDureeJours(a)} j
                    </p>
                  </div>
                  <StatBadge variant={a.statut as "en_attente" | "approuve" | "refuse"}>
                    {a.statut.replace("_", " ")}
                  </StatBadge>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Derniers bulletins" subtitle={`${employeBulletins.length} bulletin(s)`} icon={<Wallet className="h-4 w-4" />} />
          {employeBulletins.length === 0 ? (
            <p className="mt-4 text-sm text-text-tertiary">Aucun bulletin.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {employeBulletins.map((b) => (
                <li key={b.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/[0.02] px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatMoisPaie(b.mois, b.annee)}
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      Net : {b.salaire_net.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                  <StatBadge variant={b.statut as "en_attente" | "paye" | "annule"}>{b.statut.replace("_", " ")}</StatBadge>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Modifier l'employé"
        size="lg"
      >
        <EmployeForm
          employe={employe}
          onSuccess={() => {
            setEditing(false);
            mutate();
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={confirmDelete}
        title="Supprimer cet employé ?"
        description={`${employe.prenom} ${employe.nom} et toutes ses données associées (présences, paie, compétences...) seront supprimés. Action irréversible.`}
        confirmLabel="Supprimer"
        loading={busy}
      />
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
        <p className="truncate text-sm text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function formatEmployeeMatricule(id: number): string {
  return `EMP-${String(id).padStart(6, "0")}`;
}

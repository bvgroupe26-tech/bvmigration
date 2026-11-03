"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  GraduationCap,
  Award,
  TrendingUp,
  Plus,
  Trash2,
  ChartLine,
} from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Avatar from "@/components/ui/Avatar";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import CompetenceForm from "@/components/forms/CompetenceForm";
import { useCompetences, useFormations, useEmployes } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import type { Competence, Formation } from "@/lib/types";
import { NIVEAU_TEXT_TO_INT } from "@/lib/types";

const TABS = [
  { id: "competences", label: "Compétences" },
  { id: "formations", label: "Formations & Certifications" },
  { id: "employes", label: "Vue par employé" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function CompetencesPage() {
  const [tab, setTab] = useState<Tab>("competences");
  const [showAdd, setShowAdd] = useState(false);
  const [delC, setDelC] = useState<Competence | null>(null);
  const [busyDel, setBusyDel] = useState(false);

  const { competences, isLoading: lc, mutate: mutC } = useCompetences();
  const { formations, isLoading: lf } = useFormations();
  const { employes } = useEmployes({ statut: "actif" });

  const stats = useMemo(() => {
    const total = competences.length;
    const experts = competences.filter((c) => c.niveau === "expert").length;
    const formationsCount = formations.length;
    const moyenneNiveau =
      competences.length > 0
        ? competences.reduce((acc, c) => acc + NIVEAU_TEXT_TO_INT[c.niveau], 0) / competences.length
        : 0;
    return { total, experts, formationsCount, moyenneNiveau };
  }, [competences, formations]);

  async function confirmDelete() {
    if (!delC) return;
    setBusyDel(true);
    try {
      await apiClient.del(`/competences/${delC.id}`);
      toast.success("Compétence supprimée");
      setDelC(null);
      mutC();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusyDel(false);
    }
  }

  const competenceColumns: Column<Competence>[] = [
    {
      key: "emp",
      header: "Employé",
      render: (c) => (
        <Link href={`/employes/${c.employe_id}`} className="flex items-center gap-3 group">
          <Avatar nom={c.employe_nom ?? "?"} prenom={c.employe_prenom ?? ""} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 group-hover:text-[#1F3F73]">
              {c.employe_prenom} {c.employe_nom}
            </p>
          </div>
        </Link>
      ),
    },
    { key: "nom", header: "Compétence", render: (c) => <span className="text-slate-900">{c.nom_competence}</span> },
    {
      key: "categorie",
      header: "Catégorie",
      render: (c) => (
        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-text-secondary">
          {c.categorie ?? "—"}
        </span>
      ),
    },
    {
      key: "niveau",
      header: "Niveau",
      render: (c) => {
        const lvl = NIVEAU_TEXT_TO_INT[c.niveau];
        return (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-3 rounded-full ${i <= lvl ? "bg-[#2F5F9D]" : "bg-slate-200"}`}
                />
              ))}
            </div>
            <span className="text-xs text-text-secondary capitalize">{c.niveau}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <button
          type="button"
          onClick={() => setDelC(c)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-text-secondary transition hover:bg-red-500/10 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  const formationColumns: Column<Formation>[] = [
    {
      key: "emp",
      header: "Employé",
      render: (f) => (
        <Link href={`/employes/${f.employe_id}`} className="flex items-center gap-3 group">
          <Avatar nom={f.employe_nom ?? "?"} prenom={f.employe_prenom ?? ""} size="sm" />
          <p className="truncate font-semibold text-slate-900 group-hover:text-[#1F3F73]">
            {f.employe_prenom} {f.employe_nom}
          </p>
        </Link>
      ),
    },
    { key: "titre", header: "Titre", render: (f) => <span className="text-slate-900">{f.titre}</span> },
    {
      key: "type",
      header: "Type",
      render: (f) => (
        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-text-secondary capitalize">
          {f.type}
        </span>
      ),
    },
    { key: "organisme", header: "Organisme", render: (f) => <span className="text-text-secondary">{f.organisme ?? "—"}</span> },
    {
      key: "date",
      header: "Date d'obtention",
      render: (f) => (
        <span className="font-mono text-xs text-text-tertiary">
          {f.date_obtention ?? "—"}
        </span>
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
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Compétences</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Suivi des compétences, formations et évaluations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/competences/evaluations">
            <Button variant="ghost" icon={<ChartLine className="h-4 w-4" />}>
              Évaluations
            </Button>
          </Link>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Nouvelle compétence
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Compétences" value={stats.total} icon={GraduationCap} color="blue" index={0} />
        <KPICard title="Experts" value={stats.experts} icon={Award} color="cyan" index={1} />
        <KPICard title="Formations" value={stats.formationsCount} icon={Award} color="cyan" index={2} />
        <KPICard
          title="Niveau moyen"
          value={Math.round(stats.moyenneNiveau * 10) / 10}
          icon={TrendingUp}
          color="amber"
          suffix="/ 5"
          index={3}
        />
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === t.id
                  ? "text-slate-900"
                  : "text-text-secondary hover:text-slate-900"
              }`}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="comp-tab"
                  className="absolute inset-0 rounded-lg border border-slate-200 bg-white/[0.05]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "competences" &&
            (lc ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <DataTable
                data={competences}
                columns={competenceColumns}
                rowKey={(c) => c.id}
                pagination
                pageSize={10}
                emptyMessage="Aucune compétence enregistrée."
              />
            ))}

          {tab === "formations" &&
            (lf ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <DataTable
                data={formations}
                columns={formationColumns}
                rowKey={(f) => f.id}
                pagination
                pageSize={10}
                emptyMessage="Aucune formation enregistrée."
              />
            ))}

          {tab === "employes" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {employes.length === 0 && (
                <p className="col-span-full text-sm text-text-tertiary">Aucun employé actif.</p>
              )}
              {employes.map((emp) => {
                const empCompetences = competences.filter((c) => c.employe_id === emp.id);
                return (
                  <Link
                    key={emp.id}
                    href={`/employes/${emp.id}`}
                    className="group rounded-2xl border border-slate-200 bg-white/[0.02] p-4 transition hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar nom={emp.nom} prenom={emp.prenom} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 group-hover:text-[#1F3F73]">
                          {emp.prenom} {emp.nom}
                        </p>
                        <p className="truncate text-xs text-text-tertiary">{emp.poste ?? "—"}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-text-secondary">
                      <span className="font-mono text-slate-900">{empCompetences.length}</span>{" "}
                      compétence(s)
                    </p>
                    {empCompetences.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {empCompetences.slice(0, 4).map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-text-secondary"
                          >
                            {c.nom_competence}
                          </span>
                        ))}
                        {empCompetences.length > 4 && (
                          <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-text-tertiary">
                            +{empCompetences.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle compétence">
        <CompetenceForm
          onSuccess={() => {
            setShowAdd(false);
            mutC();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!delC}
        onClose={() => setDelC(null)}
        onConfirm={confirmDelete}
        title="Supprimer cette compétence ?"
        description={delC ? `« ${delC.nom_competence} » sera retirée.` : ""}
        confirmLabel="Supprimer"
        loading={busyDel}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  TrendingUp,
  Briefcase,
  Plus,
  Search,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import StatBadge from "@/components/ui/StatBadge";
import Avatar from "@/components/ui/Avatar";
import SectionHeader from "@/components/ui/SectionHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import EmployeForm from "@/components/forms/EmployeForm";
import { useEmployeePanel } from "@/components/EmployeeDetailPanel";
import { useEmployes } from "@/hooks/api";
import {apiClient, getUserErrorMessage } from "@/lib/fetcher";
import type { Employe } from "@/lib/types";

const DEPARTEMENTS = ["Tech", "Commercial", "Marketing", "Finance", "RH", "Direction", "Produit", "Juridique"];

export default function EmployesPage() {
  const { openPanel } = useEmployeePanel();
  const [search, setSearch] = useState("");
  const [departement, setDepartement] = useState("all");
  const [type_contrat, setTypeContrat] = useState("all");
  const [statut, setStatut] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Employe | null>(null);
  const [deleting, setDeleting] = useState<Employe | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const { employes, isLoading, mutate } = useEmployes({
    departement: departement === "all" ? undefined : departement,
    type_contrat: type_contrat === "all" ? undefined : type_contrat,
    statut: statut === "all" ? undefined : statut,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return employes;
    const q = search.toLowerCase();
    return employes.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        e.prenom.toLowerCase().includes(q) ||
        (e.poste ?? "").toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q)
    );
  }, [employes, search]);

  const stats = useMemo(() => {
    const total = employes.length;
    const actifs = employes.filter((e) => e.statut === "actif").length;
    const cdi = employes.filter((e) => e.type_contrat === "CDI").length;
    const taux = total > 0 ? Math.round((actifs / total) * 100) : 0;
    return { total, actifs, cdi, taux };
  }, [employes]);

  async function exportExcel() {
    try {
      const XLSX = await import("xlsx");
      const data = filtered.map((e) => ({
        ID: e.id,
        Nom: e.nom,
        Prenom: e.prenom,
        Email: e.email ?? "",
        Telephone: e.telephone ?? "",
        Poste: e.poste ?? "",
        Departement: e.departement ?? "",
        TypeContrat: e.type_contrat ?? "",
        SalaireBase: e.salaire_base,
        DateEmbauche: e.date_embauche ?? "",
        Statut: e.statut,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employes");
      XLSX.writeFile(wb, `employes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Export Excel généré");
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Impossible d'exporter les données."));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyDelete(true);
    try {
      await apiClient.del(`/employes/${deleting.id}`);
      toast.success(`${deleting.prenom} ${deleting.nom} supprimé`);
      setDeleting(null);
      mutate();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setBusyDelete(false);
    }
  }

  const columns: Column<Employe>[] = useMemo(
    () => [
    {
      key: "employe",
      header: "Employé",
      render: (e) => (
        <div className="flex items-center gap-3 group">
          <Avatar nom={e.nom} prenom={e.prenom} size="sm" showStatus status={e.statut === "actif" ? "online" : "offline"} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900 group-hover:text-[#1F3F73] transition">
              {e.prenom} {e.nom}
            </p>
            <p className="truncate text-xs text-text-tertiary">{e.email ?? "—"}</p>
          </div>
          <Link
            href={`/employes/${e.id}`}
            onClick={(ev) => ev.stopPropagation()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-text-tertiary transition hover:bg-slate-100 hover:text-[#1F3F73]"
            title="Fiche détaillée"
          >
            <span className="sr-only">Fiche</span>
            <span aria-hidden className="text-xs font-bold">
              ↗
            </span>
          </Link>
        </div>
      ),
    },
    {
      key: "poste",
      header: "Poste",
      render: (e) => <span className="text-text-secondary">{e.poste ?? "—"}</span>,
    },
    {
      key: "departement",
      header: "Département",
      render: (e) => (
        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-text-secondary">
          {e.departement ?? "—"}
        </span>
      ),
    },
    {
      key: "contrat",
      header: "Contrat",
      render: (e) => (
        <span className="font-mono text-[11px] text-text-secondary">{e.type_contrat ?? "—"}</span>
      ),
    },
    {
      key: "salaire",
      header: "Salaire",
      align: "right",
      render: (e) => (
        <span className="font-mono text-xs text-text-secondary">
          {(e.salaire_base ?? 0).toLocaleString("fr-FR")} F
        </span>
      ),
    },
    {
      key: "date",
      header: "Entrée",
      render: (e) => (
        <span className="font-mono text-xs text-text-tertiary">
          {e.date_embauche ? new Date(e.date_embauche).toLocaleDateString("fr-FR") : "—"}
        </span>
      ),
    },
    {
      key: "fin_contrat",
      header: "Fin contrat",
      render: (e) => {
        const fin = e.date_fin_contrat ?? (e as { dateFinContrat?: string | null }).dateFinContrat;
        return (
          <span className="font-mono text-xs text-text-tertiary">
            {fin ? new Date(fin).toLocaleDateString("fr-FR") : "—"}
          </span>
        );
      },
    },
    {
      key: "statut",
      header: "Statut",
      render: (e) => (
        <StatBadge variant={e.statut as "actif" | "inactif" | "suspendu"}>{e.statut}</StatBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              setEditing(e);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-text-secondary transition hover:bg-[#2F5F9D]/15 hover:text-[#1F3F73]"
            title="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              setDeleting(e);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-text-secondary transition hover:bg-red-500/15 hover:text-red-600"
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ],
    []
  );

  return (
    <div className="space-y-7">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">Employés</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Gérez l&apos;équipe BV GROUPE et leurs informations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={<Download className="h-4 w-4" />} onClick={exportExcel}>
            Exporter
          </Button>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>
            Nouvel employé
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total employés" value={stats.total} icon={Users} color="blue" index={0} />
        <KPICard title="Actifs" value={stats.actifs} icon={UserCheck} color="green" index={1} />
        <KPICard title="CDI" value={stats.cdi} icon={Briefcase} color="cyan" index={2} />
        <KPICard title="Taux d'activité" value={stats.taux} icon={TrendingUp} color="amber" suffix="%" index={3} />
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un employé..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-text-tertiary"
            />
          </div>
          <select
            value={departement}
            onChange={(e) => setDepartement(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="all">Tous départements</option>
            {DEPARTEMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={type_contrat}
            onChange={(e) => setTypeContrat(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="all">Tous contrats</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="Stage">Stage</option>
            <option value="Freelance">Freelance</option>
            <option value="Interim">Intérim</option>
          </select>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="all">Tous statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="suspendu">Suspendu</option>
          </select>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader
          title={`${filtered.length} employé${filtered.length > 1 ? "s" : ""}`}
          subtitle="Liste mise à jour en direct depuis SQLite"
        />
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              rowKey={(e) => e.id}
              pagination
              pageSize={10}
              onRowClick={(e) => openPanel(e)}
              emptyMessage={
                search || departement !== "all" || type_contrat !== "all" || statut !== "all"
                  ? "Aucun employé ne correspond aux filtres"
                  : "Aucun employé. Cliquez sur « Nouvel employé » pour commencer."
              }
            />
          )}
        </div>
      </GlassCard>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Nouvel employé"
        description="Tous les champs marqués d'un astérisque sont requis"
        size="lg"
      >
        <EmployeForm
          onSuccess={() => {
            setShowAdd(false);
            mutate();
          }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Modifier l'employé"
        description={editing ? `${editing.prenom} ${editing.nom}` : ""}
        size="lg"
      >
        {editing && (
          <EmployeForm
            employe={editing}
            onSuccess={() => {
              setEditing(null);
              mutate();
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Supprimer cet employé ?"
        description={
          deleting
            ? `${deleting.prenom} ${deleting.nom} ainsi que ses présences, absences, bulletins de paie, compétences et évaluations seront supprimés. Cette action est irréversible.`
            : ""
        }
        confirmLabel="Supprimer"
        loading={busyDelete}
      />
    </div>
  );
}

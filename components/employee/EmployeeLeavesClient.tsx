"use client";

import { useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAbsenceBalance,
  useAuthMe,
  useEmployeMe,
  useMyAbsences,
  createAbsence,
  cancelAbsence,
} from "@/hooks/employee";
import {
  ABSENCE_STATUT_LABELS,
  ABSENCE_TYPE_LABELS,
  type AbsenceType,
} from "@/lib/employee/types";
import {
  absenceDurationDays,
  formatDateRange,
  normalizeAbsence,
} from "@/lib/employee/utils";
import { EmployeeEmpty, EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import {cn, getUserErrorMessage } from "@/lib/utils";

const TYPES: AbsenceType[] = [
  "conge_paye",
  "maladie",
  "conge_sans_solde",
  "maternite",
  "paternite",
  "autre",
];

export default function EmployeeLeavesClient() {
  const { user } = useAuthMe();
  const { employe } = useEmployeMe();
  const { balance } = useAbsenceBalance();
  const { absences, isLoading, error, mutate } = useMyAbsences();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    dateDebut: "",
    dateFin: "",
    typeAbsence: "conge_paye" as AbsenceType,
    justification: "",
  });

  const employeId = employe?.id ?? user?.employeId;
  const sorted = [...absences].sort(
    (a, b) =>
      new Date(normalizeAbsence(b).dateDebut).getTime() -
      new Date(normalizeAbsence(a).dateDebut).getTime()
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeId) {
      toast.error("Fiche employé introuvable");
      return;
    }
    setSubmitting(true);
    try {
      await createAbsence({
        employeId,
        ...form,
      });
      await mutate();
      setShowForm(false);
      setForm({ dateDebut: "", dateFin: "", typeAbsence: "conge_paye", justification: "" });
      toast.success("Demande envoyée");
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: number) {
    try {
      await cancelAbsence(id);
      await mutate();
      toast.success("Demande annulée");
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  }

  if (isLoading) return <EmployeeLoading />;

  return (
    <div className="space-y-4">
      {error && <EmployeeError message="Impossible de charger vos congés." />}

      {balance && (
        <section className="grid grid-cols-3 gap-2">
          <Stat label="Droit" value={balance.total ?? balance.droitAnnuel} />
          <Stat label="Pris" value={balance.pris ?? balance.joursPris} />
          <Stat label="Restant" value={balance.restant ?? balance.soldeRestant} highlight />
        </section>
      )}

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#2F5F9D] to-[#1F3F73] px-4 py-3.5 text-sm font-semibold text-white shadow-md"
      >
        <Plus className="h-4 w-4" />
        {showForm ? "Fermer le formulaire" : "Nouvelle demande de congé"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Date début</span>
            <input
              type="date"
              required
              value={form.dateDebut}
              onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Date fin</span>
            <input
              type="date"
              required
              value={form.dateFin}
              onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Type</span>
            <select
              value={form.typeAbsence}
              onChange={(e) => setForm((f) => ({ ...f, typeAbsence: e.target.value as AbsenceType }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {ABSENCE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Justification</span>
            <textarea
              rows={2}
              value={form.justification}
              onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#2F5F9D] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Envoi…" : "Soumettre la demande"}
          </button>
        </form>
      )}

      {sorted.length === 0 ? (
        <EmployeeEmpty
          icon={CalendarClock}
          title="Aucune demande"
          description="Vos demandes de congé apparaîtront ici."
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((raw) => {
            const a = normalizeAbsence(raw);
            const days = absenceDurationDays(a.dateDebut, a.dateFin);
            const canCancel = a.statut === "en_attente";
            return (
              <article
                key={a.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {ABSENCE_TYPE_LABELS[a.typeAbsence] ?? a.typeAbsence}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateRange(a.dateDebut, a.dateFin)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{days} jour(s)</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      a.statut === "approuve" && "bg-emerald-50 text-emerald-700",
                      a.statut === "en_attente" && "bg-amber-50 text-amber-700",
                      a.statut === "refuse" && "bg-red-50 text-red-700"
                    )}
                  >
                    {ABSENCE_STATUT_LABELS[a.statut] ?? a.statut}
                  </span>
                </div>
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => handleCancel(a.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Annuler la demande
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: number | null;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 font-display text-xl font-bold", highlight ? "text-[#1F3F73]" : "text-slate-800")}>
        {value ?? "—"}
      </p>
    </div>
  );
}

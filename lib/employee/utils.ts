import type { EmployeeAbsence } from "@/lib/employee/types";

export function normalizeAbsence(a: EmployeeAbsence) {
  return {
    id: a.id,
    dateDebut: a.dateDebut ?? a.date_debut ?? "",
    dateFin: a.dateFin ?? a.date_fin ?? "",
    typeAbsence: a.typeAbsence ?? a.type_absence ?? "autre",
    statut: a.statut,
    justification: a.justification ?? "",
  };
}

export function absenceDurationDays(dateDebut: string, dateFin: string): number {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  debut.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  return Math.floor((fin.getTime() - debut.getTime()) / 86400000) + 1;
}

export function formatDateRange(dateDebut: string, dateFin: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const d0 = new Date(dateDebut).toLocaleDateString("fr-FR", opts);
  const d1 = new Date(dateFin).toLocaleDateString("fr-FR", opts);
  return d0 === d1 ? d0 : `${d0} → ${d1}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonthYear(mois: string | number, annee: number): string {
  const m = Number(mois);
  const date = new Date(annee, m - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function isNotificationRead(n: { lu?: boolean; lue?: boolean }): boolean {
  return Boolean(n.lu ?? n.lue);
}

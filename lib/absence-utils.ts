import type { Absence } from "@/lib/types";

const MOIS_LABELS: Record<string, string> = {
  "01": "Janvier",
  "02": "Février",
  "03": "Mars",
  "04": "Avril",
  "05": "Mai",
  "06": "Juin",
  "07": "Juillet",
  "08": "Août",
  "09": "Septembre",
  "10": "Octobre",
  "11": "Novembre",
  "12": "Décembre",
};

export function absenceDureeJours(a: Pick<Absence, "date_debut" | "date_fin">): number {
  const debut = new Date(a.date_debut);
  const fin = new Date(a.date_fin);
  debut.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  return Math.floor((fin.getTime() - debut.getTime()) / 86400000) + 1;
}

export function formatPeriodeAbsence(dateDebut: string, dateFin: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const d0 = new Date(dateDebut).toLocaleDateString("fr-FR", opts);
  const d1 = new Date(dateFin).toLocaleDateString("fr-FR", opts);
  return d0 === d1 ? d0 : `${d0} → ${d1}`;
}

export function formatMoisPaie(mois: string, annee: number): string {
  const key = mois.padStart(2, "0");
  const label = MOIS_LABELS[key] ?? mois;
  return `${label} ${annee}`;
}

export function formatReferenceBulletin(id: number, mois: string, annee: number): string {
  const m = mois.padStart(2, "0");
  return `BV-PAIE-${annee}-${m}-${String(id).padStart(4, "0")}`;
}

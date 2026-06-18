import type { Presence } from "@/lib/types";

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function pick(o: Record<string, unknown>, snake: string, camel: string): unknown {
  return o[snake] ?? o[camel];
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function dateOnly(v: unknown): string {
  const s = str(v);
  if (!s) return "";
  return s.includes("T") ? s.slice(0, 10) : s.slice(0, 10);
}

export function formatPresenceDate(value?: string | null): string {
  if (!value) return "—";
  const iso = dateOnly(value);
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (y && m && d) {
      return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
  return value;
}

export function normalizePresence(raw: unknown): Presence {
  const o = rec(raw);
  const emp = rec(o.employe);

  return {
    id: num(o.id),
    employe_id: num(pick(o, "employe_id", "employeId")),
    date: dateOnly(o.date),
    heure_entree: str(pick(o, "heure_entree", "heureEntree")),
    heure_sortie: str(pick(o, "heure_sortie", "heureSortie")),
    statut: String(o.statut ?? "present") as Presence["statut"],
    justification: str(o.justification),
    heures_supplementaires: num(pick(o, "heures_supplementaires", "heuresSupplementaires")),
    employe_nom: str(emp.nom ?? pick(o, "employe_nom", "employeNom")) ?? undefined,
    employe_prenom: str(emp.prenom ?? pick(o, "employe_prenom", "employePrenom")) ?? undefined,
    employe_poste: str(emp.poste ?? pick(o, "employe_poste", "employePoste")),
  };
}

export function normalizePresenceList(raw: unknown): Presence[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizePresence);
}

export const PRESENCE_STATUT_LABELS: Record<string, string> = {
  present: "Présent",
  absent: "Absent",
  retard: "Retard",
  conge: "Congé",
  mission: "Mission",
};

export function getMonthBounds(year: number, month: number): { date_from: string; date_to: string } {
  const m = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    date_from: `${year}-${m}-01`,
    date_to: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function computePresenceStats(presences: Presence[]) {
  return {
    present: presences.filter((p) => p.statut === "present").length,
    absent: presences.filter((p) => p.statut === "absent").length,
    retard: presences.filter((p) => p.statut === "retard").length,
    conge: presences.filter((p) => p.statut === "conge").length,
    mission: presences.filter((p) => p.statut === "mission").length,
    total: presences.length,
  };
}

/** Taux basé sur le nombre d'employés actifs (pas seulement les fiches pointées). */
export function computeDailyPresenceRate(
  presences: Presence[],
  activeEmployeeCount: number
): {
  present: number;
  retard: number;
  absent: number;
  conge: number;
  mission: number;
  nonPointes: number;
  tauxPct: number;
  effectif: number;
} {
  const stats = computePresenceStats(presences);
  const effectif = Math.max(activeEmployeeCount, 0);
  const pointes = stats.present + stats.retard + stats.absent + stats.conge + stats.mission;
  const nonPointes = Math.max(0, effectif - pointes);
  const presentsEffectifs = stats.present + stats.retard;
  const tauxPct =
    effectif > 0 ? Math.round((presentsEffectifs / effectif) * 100) : 0;

  return {
    present: stats.present,
    retard: stats.retard,
    absent: stats.absent + nonPointes,
    conge: stats.conge,
    mission: stats.mission,
    nonPointes,
    tauxPct,
    effectif,
  };
}

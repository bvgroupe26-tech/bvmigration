import type { Absence, AbsenceStatut, AbsenceType, Employe } from "@/lib/types";

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function pick(o: Record<string, unknown>, snake: string, camel: string): unknown {
  return o[snake] ?? o[camel];
}

function pickFirst(o: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const v = o[key];
    if (v != null && v !== "") return v;
  }
  return undefined;
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
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const s = str(v);
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

function pickDate(o: Record<string, unknown>, debutKeys: string[], finKeys: string[]) {
  return {
    debut: dateOnly(pickFirst(o, debutKeys)),
    fin: dateOnly(pickFirst(o, finKeys)),
  };
}

function resolveEmployeFields(o: Record<string, unknown>) {
  const emp = rec(o.employe ?? o.employee ?? o.Employe ?? o.collaborateur);
  const user = rec(emp.user ?? o.user);

  const nom =
    str(emp.nom) ??
    str(user.nom) ??
    str(pick(o, "employe_nom", "employeNom")) ??
    str(o.lastName) ??
    str(o.nom);

  const prenom =
    str(emp.prenom) ??
    str(user.prenom) ??
    str(pick(o, "employe_prenom", "employePrenom")) ??
    str(o.firstName) ??
    str(o.prenom);

  const poste =
    str(emp.poste) ??
    str(user.poste) ??
    str(pick(o, "employe_poste", "employePoste")) ??
    str(o.poste);

  return { nom, prenom, poste };
}

function toSnakeKey(value: string): string {
  return value
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/-/g, "_");
}

function normalizeTypeAbsence(v: unknown): AbsenceType {
  const raw = String(v ?? "autre");
  const key = toSnakeKey(raw) as AbsenceType;
  const allowed: AbsenceType[] = [
    "maladie",
    "conge_paye",
    "conge_sans_solde",
    "maternite",
    "paternite",
    "autre",
  ];
  return allowed.includes(key) ? key : "autre";
}

function normalizeStatut(v: unknown): AbsenceStatut {
  const key = toSnakeKey(String(v ?? "en_attente"));
  if (key === "approuve" || key === "refuse" || key === "en_attente") return key;
  return "en_attente";
}

/** Extrait le tableau d'absences quelle que soit l'enveloppe API. */
export function unwrapAbsenceListPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const o = rec(raw);
  for (const key of ["data", "absences", "items", "results", "rows", "list", "records", "content"]) {
    const nested = o[key];
    if (Array.isArray(nested)) return nested;
    if (nested && typeof nested === "object") {
      const inner = unwrapAbsenceListPayload(nested);
      if (inner.length > 0) return inner;
    }
  }
  return [];
}

/** Normalise une absence admin (Nest camelCase + employé imbriqué). */
export function normalizeAbsence(raw: unknown): Absence {
  const o = rec(raw);
  const { nom, prenom, poste } = resolveEmployeFields(o);

  const dates = pickDate(
    o,
    ["date_debut", "dateDebut", "startDate", "start_date", "debut", "dateDebutAbsence"],
    ["date_fin", "dateFin", "endDate", "end_date", "fin", "dateFinAbsence"]
  );

  const dureeJours = num(pick(o, "duree_jours", "dureeJours") ?? pick(o, "nb_jours", "nbJours"));
  let dateDebut = dates.debut;
  let dateFin = dates.fin;
  if ((!dateDebut || !dateFin) && dureeJours > 0 && dateDebut) {
    const fin = new Date(dateDebut);
    fin.setDate(fin.getDate() + dureeJours - 1);
    dateFin = dateFin || fin.toISOString().slice(0, 10);
  }

  const emp = rec(o.employe ?? o.employee ?? o.Employe);
  const employeId = num(pick(o, "employe_id", "employeId")) || num(emp.id);

  return {
    id: num(o.id),
    employe_id: employeId,
    date_debut: dateDebut,
    date_fin: dateFin,
    type_absence: normalizeTypeAbsence(pickFirst(o, ["type_absence", "typeAbsence", "type"])),
    justification: str(o.justification ?? o.motif ?? o.reason),
    statut: normalizeStatut(o.statut ?? o.status),
    created_at: String(pick(o, "created_at", "createdAt") ?? ""),
    employe_nom: nom ?? undefined,
    employe_prenom: prenom ?? undefined,
    employe_poste: poste,
    ...(dureeJours > 0 ? { duree_jours: dureeJours } : {}),
  };
}

export function normalizeAbsenceList(raw: unknown): Absence[] {
  let payload = raw;
  const envelope = rec(raw);
  if (envelope.ok === true && envelope.data !== undefined) {
    payload = envelope.data;
  }
  return unwrapAbsenceListPayload(payload).map(normalizeAbsence);
}

/** Complète nom / poste via la liste employés si l'API ne joint pas l'employé. */
export function enrichAbsencesWithEmployes(absences: Absence[], employes: Employe[]): Absence[] {
  if (!employes.length) return absences;
  const byId = new Map(employes.map((e) => [e.id, e]));
  return absences.map((a) => {
    const emp = byId.get(a.employe_id);
    if (!emp) return a;
    return {
      ...a,
      employe_nom: a.employe_nom || emp.nom || undefined,
      employe_prenom: a.employe_prenom || emp.prenom || undefined,
      employe_poste: a.employe_poste ?? emp.poste ?? null,
    };
  });
}

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

/** Durée en jours ouvrés (lundi→vendredi), comme le calcul du solde côté serveur. */
export function absenceDureeJours(
  a: Pick<Absence, "date_debut" | "date_fin"> & { duree_jours?: number }
): number {
  if (a.duree_jours && a.duree_jours > 0) return a.duree_jours;
  const debut = Date.parse(`${a.date_debut.slice(0, 10)}T00:00:00Z`);
  const fin = Date.parse(`${a.date_fin.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(debut) || Number.isNaN(fin) || fin < debut) return 0;
  let count = 0;
  for (let t = debut; t <= fin; t += 86400000) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function formatPeriodeAbsence(dateDebut: string, dateFin: string): string {
  if (!dateDebut || !dateFin) return "—";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) return "—";
  const d0 = debut.toLocaleDateString("fr-FR", opts);
  const d1 = fin.toLocaleDateString("fr-FR", opts);
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

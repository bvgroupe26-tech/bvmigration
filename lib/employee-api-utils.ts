import type {
  AbsenceBalance,
  EmployeeAbsence,
  EmployeeDocument,
  EmployeeNotification,
  PaieBulletin,
} from "@/lib/employee/types";
import { normalizePaieList } from "@/lib/paie-utils";

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeAbsenceBalance(raw: unknown): AbsenceBalance {
  const o = rec(raw);
  const total = num(o.total ?? o.droitAnnuel ?? o.droit_annuel);
  const pris = num(o.pris ?? o.joursPris ?? o.jours_pris);
  const restant = num(o.restant ?? o.soldeRestant ?? o.solde_restant ?? total - pris);
  return {
    annee: num(o.annee) || new Date().getFullYear(),
    droitAnnuel: num(o.droitAnnuel ?? o.droit_annuel) || total,
    joursPris: num(o.joursPris ?? o.jours_pris) || pris,
    soldeRestant: num(o.soldeRestant ?? o.solde_restant) || restant,
    detailParType: (o.detailParType ?? o.detail_par_type) as Record<string, number> | undefined,
    total,
    pris,
    restant,
    en_attente: num(o.en_attente ?? o.enAttente),
  };
}

export function normalizeEmployeeAbsences(raw: unknown): EmployeeAbsence[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const o = rec(row);
    return {
      id: num(o.id),
      employe_id: num(o.employe_id ?? o.employeId) || undefined,
      employeId: num(o.employeId ?? o.employe_id) || undefined,
      date_debut: String(o.date_debut ?? o.dateDebut ?? ""),
      date_fin: String(o.date_fin ?? o.dateFin ?? ""),
      dateDebut: String(o.dateDebut ?? o.date_debut ?? ""),
      dateFin: String(o.dateFin ?? o.date_fin ?? ""),
      type_absence: String(o.type_absence ?? o.typeAbsence ?? "autre"),
      typeAbsence: String(o.typeAbsence ?? o.type_absence ?? "autre"),
      statut: String(o.statut ?? "en_attente"),
      justification: (o.justification as string | null) ?? null,
      created_at: String(o.created_at ?? o.createdAt ?? ""),
    };
  });
}

export function normalizePaieBulletins(raw: unknown): PaieBulletin[] {
  return normalizePaieList(raw).map((p) => ({
    id: p.id,
    mois: p.mois,
    annee: p.annee,
    salaire_net: p.salaire_net,
    statut: p.statut,
    date_paiement: p.date_paiement,
    jours_travailles: p.jours_travailles,
    jours_periode: p.jours_periode,
    joursTravailles: p.jours_travailles,
    joursPeriode: p.jours_periode,
  }));
}

export function normalizeEmployeeDocuments(raw: unknown): EmployeeDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const o = rec(row);
    return {
      id: num(o.id),
      nom: (o.nom as string | undefined) ?? (o.titre as string | undefined),
      titre: (o.titre as string | undefined) ?? (o.nom as string | undefined),
      type: o.type as string | undefined,
      created_at: String(o.created_at ?? o.createdAt ?? o.date_creation ?? ""),
      date_creation: String(o.date_creation ?? o.created_at ?? o.createdAt ?? ""),
    };
  });
}

export function normalizeEmployeeNotifications(raw: unknown): EmployeeNotification[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const o = rec(row);
    return {
      id: num(o.id),
      titre: String(o.titre ?? ""),
      message: String(o.message ?? ""),
      lu: Boolean(o.lu ?? o.lue),
      lue: Boolean(o.lue ?? o.lu),
      created_at: String(o.created_at ?? o.createdAt ?? o.date ?? ""),
      date: String(o.date ?? o.created_at ?? o.createdAt ?? ""),
    };
  });
}

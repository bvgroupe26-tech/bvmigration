import { normalizeAppRole } from "@/lib/session";
import type {
  AlerteBudget,
  BudgetDepenseStatut,
  DepenseFinance,
  ModePaiement,
  ParametresFinance,
} from "@/lib/types-finance";

export const DEPENSE_STATUT_LABELS: Record<BudgetDepenseStatut, string> = {
  brouillon: "Brouillon",
  soumise: "Soumise",
  validee_n1: "Validée N1",
  validee: "Validée",
  refusee: "Refusée",
  payee: "Payée",
  annulee: "Annulée",
};

export const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  especes: "Espèces (caisse)",
  virement: "Virement bancaire",
  cheque: "Chèque",
  mobile_money: "Mobile Money",
  carte: "Carte bancaire",
};

export const ALERTE_LABELS: Record<AlerteBudget, string> = {
  ok: "Dans le budget",
  seuil: "Seuil d'alerte atteint",
  depasse: "Budget dépassé",
};

/** Variante visuelle de StatBadge (partagée avec les absences). */
export function depenseStatutBadgeVariant(
  s: BudgetDepenseStatut
): "brouillon" | "en_attente" | "en_cours" | "approuve" | "refuse" | "paye" | "annule" {
  switch (s) {
    case "brouillon":
      return "brouillon";
    case "soumise":
      return "en_attente";
    case "validee_n1":
      return "en_cours";
    case "validee":
      return "approuve";
    case "refusee":
      return "refuse";
    case "payee":
      return "paye";
    case "annulee":
      return "annule";
  }
}

/** Calcul indicatif affiché pendant la saisie ; le serveur recalcule et fait foi. */
export function computeTva(montantHt: number, tauxTva: number) {
  const ht = Math.max(0, Math.round(montantHt || 0));
  const tva = Math.round((ht * (tauxTva || 0)) / 100);
  return { ht, tva, ttc: ht + tva };
}

export type DepenseActor = { id: number; role: string | null | undefined };

export type DepensePermissions = {
  isOwn: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canValidate: boolean;
  canRefuse: boolean;
  canPay: boolean;
  canCancel: boolean;
  canManagePieces: boolean;
  /** Bouton visible mais bloqué : l'utilisateur aurait le droit, mais c'est sa propre dépense. */
  blockedBySelf: { validate: boolean; pay: boolean };
  needsN2: boolean;
};

/**
 * Règles d'affichage alignées sur le contrat backend (le serveur reste l'autorité).
 * Valider N1 : manager/rh/admin ; N2 (TTC > seuil) : admin ; payer : rh/admin ; jamais sa propre dépense.
 */
export function depensePermissions(
  d: DepenseFinance,
  actor: DepenseActor | null,
  params?: ParametresFinance | null
): DepensePermissions {
  const role = normalizeAppRole(actor?.role);
  const isOwn = !!actor && d.demandeur_id != null && d.demandeur_id === actor.id;
  const isRhAdmin = role === "rh" || role === "admin";
  const isValidator = role === "manager" || isRhAdmin;
  const seuilN2 = params?.seuil_validation_n2 ?? 0;
  const needsN2 = seuilN2 > 0 && d.montant_ttc > seuilN2;

  const editable = d.statut === "brouillon" || d.statut === "refusee";
  const canEdit = editable && (isOwn || isRhAdmin);
  const canSubmit = d.statut === "brouillon" && (isOwn || isRhAdmin);

  const validateRight =
    (d.statut === "soumise" && isValidator) || (d.statut === "validee_n1" && role === "admin");
  const payRight = d.statut === "validee" && isRhAdmin;

  const cancellableByOwner = isOwn && (d.statut === "brouillon" || d.statut === "soumise");
  const cancellableByRh =
    isRhAdmin && ["brouillon", "soumise", "validee_n1", "validee"].includes(d.statut);

  return {
    isOwn,
    canEdit,
    canSubmit,
    canValidate: validateRight && !isOwn,
    canRefuse: validateRight && !isOwn,
    canPay: payRight && !isOwn,
    canCancel: cancellableByOwner || cancellableByRh,
    canManagePieces: canEdit,
    blockedBySelf: { validate: validateRight && isOwn, pay: payRight && isOwn },
    needsN2,
  };
}

export function needsJustificatif(montantTtc: number, params?: ParametresFinance | null): boolean {
  const seuil = params?.seuil_justificatif ?? 0;
  return seuil > 0 && montantTtc >= seuil;
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

import { apiClient } from "@/lib/fetcher";
import type { BudgetDepenseStatut, BudgetEnveloppe } from "@/lib/types";

export const DEFAULT_BUDGET_ENVELOPPE_LABEL = "Budget général";

export const DEPENSE_STATUT_LABELS: Record<BudgetDepenseStatut, string> = {
  brouillon: "Brouillon",
  soumise: "Soumise",
  validee_n1: "Validée N1",
  validee: "Validée",
  refusee: "Refusée",
  payee: "Payée",
  annulee: "Annulée",
};

/** Variante visuelle de StatBadge (partagée avec les absences). */
export function depenseStatutBadgeVariant(
  s: BudgetDepenseStatut
): "en_attente" | "approuve" | "refuse" | "paye" {
  if (s === "payee") return "paye";
  if (s === "validee") return "approuve";
  if (s === "refusee" || s === "annulee") return "refuse";
  return "en_attente";
}

function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && "data" in raw) {
    const data = (raw as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

export function isDefaultBudgetEnveloppe(label?: string | null): boolean {
  if (!label) return false;
  return label.trim().toLowerCase() === DEFAULT_BUDGET_ENVELOPPE_LABEL.toLowerCase();
}

/** Résout l'enveloppe API : choix explicite ou enveloppe « Budget général » auto-créée pour l'exercice. */
export async function resolveEnveloppeIdForDepense(
  enveloppeId: number | undefined | null,
  annee: number
): Promise<number> {
  if (enveloppeId && enveloppeId > 0) return enveloppeId;

  const raw = await apiClient.get<unknown>(`/budget/enveloppes?annee=${annee}`);
  const list = unwrapList<BudgetEnveloppe>(raw);
  const existing = list.find(
    (e) =>
      isDefaultBudgetEnveloppe(e.libelle) ||
      e.libelle?.trim().toLowerCase().startsWith("budget général")
  );
  if (existing?.id) return existing.id;

  const created = await apiClient.post<BudgetEnveloppe>("/budget/enveloppes", {
    libelle: DEFAULT_BUDGET_ENVELOPPE_LABEL,
    annee,
    montantPrevu: 0,
    statut: "actif",
    notes: "Enveloppe technique — dépenses sans ventilation enveloppe dédiée",
  });
  return created.id;
}

export function depenseToApiPayload(data: Record<string, unknown>, enveloppeId: number) {
  const categorieId = data.categorie_id;
  return {
    enveloppeId,
    ...(categorieId && Number(categorieId) > 0 ? { categorieId: Number(categorieId) } : {}),
    libelle: data.libelle,
    montant: Number(data.montant),
    dateDepense: data.date_depense,
    fournisseur: data.fournisseur || undefined,
    referencePiece: data.reference_piece || undefined,
    statut: data.statut,
    commentaire: data.commentaire || undefined,
  };
}

import { apiClient } from "@/lib/fetcher";
import { apiDownload } from "@/lib/apiClient";
import { getAccessToken, refreshAccessToken } from "@/lib/authClient";
import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import { extractApiErrorMessage, resolveApiErrorContext } from "@/lib/api-errors";
import type { Fournisseur, ModePaiement, ParametresFinance } from "@/lib/types-finance";

export type DepensePayload = {
  enveloppeId: number;
  categorieId: number | null;
  fournisseurId: number | null;
  libelle: string;
  montantHt: number;
  tauxTva: number;
  dateDepense: string;
  referencePiece?: string;
  commentaire?: string;
};

export type DepenseAction = "soumettre" | "valider" | "refuser" | "payer" | "annuler";

export type PaiementPayload = {
  modePaiement: ModePaiement;
  referencePaiement?: string;
  datePaiement: string;
};

export function createDepense(payload: DepensePayload) {
  return apiClient.post<unknown>("/budget/depenses", payload);
}

export function updateDepense(id: number, payload: DepensePayload) {
  return apiClient.put<unknown>(`/budget/depenses/${id}`, payload);
}

export function runDepenseAction(
  id: number,
  action: DepenseAction,
  body?: { motif?: string } | PaiementPayload
) {
  return apiClient.post<unknown>(`/budget/depenses/${id}/${action}`, body ?? {});
}

/** Multipart en POST : apiUpload du client commun ne fait que du PUT. */
export async function uploadPieceJointe(depenseId: number, file: File): Promise<void> {
  const path = `/budget/depenses/${depenseId}/pieces`;
  const url = `${resolveApiBaseUrl()}${path}`;

  const send = async (retry: boolean): Promise<void> => {
    const form = new FormData();
    form.append("file", file);
    const headers = new Headers();
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: form,
      credentials: "include",
      cache: "no-store",
    });
    if (res.status === 401 && retry) {
      await refreshAccessToken();
      return send(false);
    }
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(extractApiErrorMessage(json, res.status, resolveApiErrorContext(path)));
    }
  };

  await send(true);
}

export function deletePieceJointe(pieceId: number) {
  return apiClient.del<unknown>(`/budget/pieces/${pieceId}`);
}

export type FournisseurPayload = Omit<Fournisseur, "id" | "actif">;

export function createFournisseur(payload: Partial<FournisseurPayload> & { nom: string }) {
  return apiClient.post<unknown>("/fournisseurs", stripEmptyStrings(payload));
}

export function updateFournisseur(id: number, payload: Partial<FournisseurPayload>) {
  return apiClient.put<unknown>(`/fournisseurs/${id}`, payload);
}

export function deleteFournisseur(id: number) {
  return apiClient.del<unknown>(`/fournisseurs/${id}`);
}

export function updateParametresFinance(p: ParametresFinance) {
  return apiClient.put<unknown>("/budget/parametres", {
    tauxTvaDefaut: p.taux_tva_defaut,
    seuilJustificatif: p.seuil_justificatif,
    seuilValidationN2: p.seuil_validation_n2,
    periodeCloseJusquau: p.periode_close_jusquau || null,
  });
}

export function exportJournalAchats(annee: number) {
  return apiDownload(`/budget/export?annee=${annee}&format=csv`, `journal-achats-${annee}.csv`);
}

function stripEmptyStrings<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null)) as Partial<T>;
}

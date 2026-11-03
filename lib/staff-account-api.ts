import { apiClient } from "@/lib/fetcher";
import type { StaffAccountInput } from "@/lib/schemas";

type StaffPayload = {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role: StaffAccountInput["role"];
  salaireBase?: number;
};

type CreatedStaffUser = {
  id?: number;
  email?: string;
  nom?: string;
  prenom?: string;
  role?: string;
  employe_id?: number | null;
};

/**
 * Crée un compte administration via POST /users (admin : tous rôles ; RH : rh et manager).
 * N'ouvre aucune session pour le compte créé : l'utilisateur courant reste connecté.
 */
export function createStaffAccount(data: StaffPayload): Promise<CreatedStaffUser> {
  return apiClient.post<CreatedStaffUser>("/users", data);
}

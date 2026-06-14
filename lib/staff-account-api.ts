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
};

/**
 * Crée un compte administration via l'API Nest.
 * - rh / manager → POST /auth/register
 * - admin → POST /auth/register-admin puis repli POST /users
 */
export async function createStaffAccount(data: StaffPayload): Promise<CreatedStaffUser> {
  const payload = data;

  if (payload.role === "admin") {
    try {
      return await apiClient.post<CreatedStaffUser>("/auth/register-admin", payload);
    } catch (adminErr) {
      try {
        return await apiClient.post<CreatedStaffUser>("/users", payload);
      } catch {
        throw adminErr;
      }
    }
  }

  return apiClient.post<CreatedStaffUser>("/auth/register", payload);
}

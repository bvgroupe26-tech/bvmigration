import { apiClient } from "@/lib/fetcher";
import type { AppRole } from "@/lib/session";

export type AdminUserRecord = {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: AppRole | string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  employe_id: number | null;
};

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeAdminUser(raw: unknown): AdminUserRecord | null {
  const o = rec(raw);
  const id = num(o.id);
  if (id <= 0) return null;

  const rawEmployeId = o.employe_id ?? o.employeId;
  return {
    id,
    email: String(o.email ?? ""),
    nom: String(o.nom ?? ""),
    prenom: String(o.prenom ?? ""),
    role: String(o.role ?? "employee"),
    isActive: o.isActive !== false && o.is_active !== false,
    createdAt: String(o.createdAt ?? o.created_at ?? ""),
    lastLogin:
      o.lastLogin != null || o.last_login != null
        ? String(o.lastLogin ?? o.last_login)
        : null,
    employe_id: rawEmployeId != null && Number.isFinite(Number(rawEmployeId)) ? Number(rawEmployeId) : null,
  };
}

export function normalizeAdminUserList(raw: unknown): AdminUserRecord[] {
  const list = Array.isArray(raw) ? raw : Array.isArray(rec(raw).data) ? rec(raw).data : [];
  return (list as unknown[])
    .map(normalizeAdminUser)
    .filter((u): u is AdminUserRecord => u != null);
}

export async function fetchAdminUsers(): Promise<AdminUserRecord[]> {
  const raw = await apiClient.get<unknown>("/users");
  return normalizeAdminUserList(raw);
}

export async function ensureUserEmploye(id: number): Promise<{ employe_id: number }> {
  return apiClient.post<{ employe_id: number }>(`/users/${id}/ensure-employe`, {});
}

export async function updateAdminUser(
  id: number,
  body: { isActive?: boolean; role?: string }
): Promise<AdminUserRecord> {
  const raw = await apiClient.put<unknown>(`/users/${id}`, body);
  const user = normalizeAdminUser(raw);
  if (!user) throw new Error("Réponse utilisateur invalide");
  return user;
}

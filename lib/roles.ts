import { type AppRole, normalizeAppRole } from "@/lib/session";

/** Rôles avec accès au panneau d'administration (sidebar, dashboard, employés, etc.). */
export const ADMIN_PANEL_ROLES: AppRole[] = ["admin", "manager", "rh"];

/** Rôles créables via l'interface « Comptes administration ». */
export const STAFF_ACCOUNT_ROLES = ["admin", "rh", "manager"] as const;
export type StaffAccountRole = (typeof STAFF_ACCOUNT_ROLES)[number];

export const ROLE_LABELS: Record<AppRole | StaffAccountRole, string> = {
  admin: "Administrateur",
  manager: "Manager",
  rh: "Ressources humaines",
  employee: "Employé",
};

export const ROLE_DESCRIPTIONS: Record<StaffAccountRole, string> = {
  admin: "Accès complet : paramètres, création de comptes, toutes les modules RH.",
  rh: "Gestion RH : employés, paie, présences, budget, recrutement, etc.",
  manager: "Pilotage d'équipe : tableaux de bord et modules RH (selon droits API).",
};

export function hasAdminPanelAccess(role?: string | null): boolean {
  const normalized = normalizeAppRole(role);
  return normalized !== null && ADMIN_PANEL_ROLES.includes(normalized);
}

/** Qui peut créer quel rôle de compte staff. */
export function canCreateStaffRole(
  creatorRole: string | null | undefined,
  targetRole: StaffAccountRole
): boolean {
  const creator = normalizeAppRole(creatorRole);
  if (!creator) return false;
  if (creator === "admin") return true;
  if (creator === "rh") return targetRole === "rh" || targetRole === "manager";
  if (creator === "manager") return targetRole === "manager";
  return false;
}

export function getCreatableStaffRoles(creatorRole: string | null | undefined): StaffAccountRole[] {
  return STAFF_ACCOUNT_ROLES.filter((r) => canCreateStaffRole(creatorRole, r));
}

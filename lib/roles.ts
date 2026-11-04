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

export function isEmployeePath(pathname: string): boolean {
  return pathname === "/employee" || pathname.startsWith("/employee/");
}

/** Accès à l'espace employé (/employee) : employés, et staff (RH, manager, admin) ayant une fiche liée. */
export function hasEmployeePanelAccess(
  role?: string | null,
  employeId?: number | null
): boolean {
  const normalized = normalizeAppRole(role);
  if (!normalized) return false;
  if (normalized === "employee") return true;
  return hasAdminPanelAccess(normalized) && employeId != null && employeId > 0;
}

/** Staff qui est aussi salarié : peut basculer entre l'espace RH et son espace employé. */
export function hasDualRole(role?: string | null, employeId?: number | null): boolean {
  return hasAdminPanelAccess(role) && hasEmployeePanelAccess(role, employeId);
}

export type Workspace = "rh" | "employee";
const LAST_WORKSPACE_KEY = "bv-last-workspace";

export function rememberWorkspace(space: Workspace): void {
  try {
    localStorage.setItem(LAST_WORKSPACE_KEY, space);
  } catch {
    /* mode privé / stockage bloqué */
  }
}

export function readLastWorkspace(): Workspace | null {
  try {
    const v = localStorage.getItem(LAST_WORKSPACE_KEY);
    return v === "rh" || v === "employee" ? v : null;
  } catch {
    return null;
  }
}

/** Rôles autorisés sur les layouts /employee (AuthGuard). */
export const EMPLOYEE_PANEL_ROLES: AppRole[] = ["employee", "admin", "manager", "rh"];

/** Vérifie si un rôle peut accéder à une route (hors pages publiques). */
export function canRoleAccessPath(
  role: string | null | undefined,
  pathname: string,
  employeId?: number | null
): boolean {
  if (pathname === "/" || pathname === "/login" || pathname === "/offline") return true;
  if (pathname.startsWith("/verify/")) return true;
  const normalized = normalizeAppRole(role);
  if (!normalized) return false;
  if (isEmployeePath(pathname)) return hasEmployeePanelAccess(normalized, employeId);
  if (!hasAdminPanelAccess(normalized)) return false;
  if (normalized === "manager" && isHrOnlyPath(pathname) && !isManagerException(pathname)) return false;
  return true;
}

/** Modules réservés admin/rh côté API (le manager reçoit 403). `/parametres/finance` : rh en lecture seule. */
const HR_ONLY_PREFIXES = ["/paie", "/budget", "/administration", "/parametres"];

/** Le manager valide les dépenses en N1 : liste et détail, sans vue d'ensemble ni référentiels. */
const MANAGER_EXCEPTIONS = ["/budget/depenses"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isHrOnlyPath(pathname: string): boolean {
  return HR_ONLY_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

function isManagerException(pathname: string): boolean {
  return MANAGER_EXCEPTIONS.some((p) => matchesPrefix(pathname, p));
}

export function filterNavForRole<T extends { href: string }>(
  items: T[],
  role: string | null | undefined
): T[] {
  return items.filter((item) => item.href.startsWith("#") || canRoleAccessPath(role, item.href));
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

/** Liste et consultation des comptes (GET /users). */
export function canViewAdminUsers(role?: string | null): boolean {
  const normalized = normalizeAppRole(role);
  return normalized === "admin" || normalized === "rh";
}

/** Activation, désactivation et changement de rôle (PUT /users/:id). */
export function canManageAdminUsers(role?: string | null): boolean {
  return normalizeAppRole(role) === "admin";
}

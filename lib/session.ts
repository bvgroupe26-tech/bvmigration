export type AppRole = "admin" | "manager" | "rh" | "employee";

const ADMIN_ROLES: AppRole[] = ["admin", "manager", "rh"];

/** Rôle API / JWT → clé interne (évite blocage AuthGuard si casse différente). */
export function normalizeAppRole(role?: string | null): AppRole | null {
  if (!role || typeof role !== "string") return null;
  const key = role.trim().toLowerCase();
  if (key === "employee" || key === "employe" || key === "employé") return "employee";
  if (key === "admin" || key === "administrator" || key === "superadmin") return "admin";
  if (key === "manager" || key === "gestionnaire") return "manager";
  if (key === "rh" || key === "hr" || key === "ressources_humaines") return "rh";
  return null;
}

export function isAdminRole(role?: string | null): boolean {
  const normalized = normalizeAppRole(role);
  return normalized !== null && ADMIN_ROLES.includes(normalized);
}

type JwtPayload = {
  role?: AppRole | string;
  exp?: number;
  iat?: number;
  sub?: number;
  userId?: number;
  email?: string;
  nom?: string;
  prenom?: string;
};

export function getHomeRouteByRole(role?: string | null): string {
  return normalizeAppRole(role) === "employee" ? "/employee/dashboard" : "/dashboard";
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    if (typeof atob !== "function") return null;
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** Marge horloge (secondes) avant de considérer le JWT comme expiré. */
export const JWT_EXPIRY_SKEW_SEC = 30;

/** Renouveler le jeton d'accès avant expiration (ex. JWT court côté Nest). */
export const JWT_REFRESH_BUFFER_SEC = 120;

export function isJwtExpired(
  payload: { exp?: number } | null,
  skewSeconds = JWT_EXPIRY_SKEW_SEC
): boolean {
  if (!payload?.exp || typeof payload.exp !== "number") return false;
  return payload.exp <= Math.floor(Date.now() / 1000) + skewSeconds;
}

export function isJwtExpiringSoon(
  payload: { exp?: number } | null,
  bufferSeconds = JWT_REFRESH_BUFFER_SEC
): boolean {
  if (!payload?.exp || typeof payload.exp !== "number") return true;
  return payload.exp <= Math.floor(Date.now() / 1000) + bufferSeconds;
}

export function isAccessTokenUsable(token: string | null | undefined): boolean {
  if (!token || token.split(".").length !== 3) return false;
  const payload = decodeJwtPayload(token);
  return Boolean(payload && !isJwtExpired(payload));
}

export function shouldRefreshAccessToken(token: string | null | undefined): boolean {
  if (!token || token.split(".").length !== 3) return true;
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (isJwtExpired(payload)) return true;
  return isJwtExpiringSoon(payload);
}

export function getTokenMaxAgeSeconds(token: string, fallbackSeconds: number): number {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp || typeof payload.exp !== "number") return fallbackSeconds;
  const ttl = payload.exp - Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ttl) || ttl <= 0) return 1;
  return Math.min(fallbackSeconds, ttl);
}

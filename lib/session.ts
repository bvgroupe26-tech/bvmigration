export type AppRole = "admin" | "manager" | "rh" | "employee";

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
  return role === "employee" ? "/employee/dashboard" : "/dashboard";
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

export function isJwtExpired(payload: { exp?: number } | null): boolean {
  if (!payload?.exp || typeof payload.exp !== "number") return false;
  return payload.exp <= Math.floor(Date.now() / 1000);
}

export function getTokenMaxAgeSeconds(token: string, fallbackSeconds: number): number {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp || typeof payload.exp !== "number") return fallbackSeconds;
  const ttl = payload.exp - Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ttl) || ttl <= 0) return 1;
  return Math.min(fallbackSeconds, ttl);
}

import type { UserMePayload } from "@/lib/employee/types";

export const PROFILE_STORAGE_KEY = "bv_user_profile";
export const LAST_ROUTE_STORAGE_KEY = "bv_last_route";

export function readCachedProfile(): UserMePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserMePayload;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readLastRoute(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const route = localStorage.getItem(LAST_ROUTE_STORAGE_KEY);
    if (!route || !route.startsWith("/") || route.startsWith("//")) return null;
    if (route === "/offline" || route === "/login") return null;
    return route;
  } catch {
    return null;
  }
}

export function persistLastRoute(pathname: string): void {
  if (typeof window === "undefined") return;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return;
  if (pathname === "/offline" || pathname === "/login" || pathname === "/") return;
  try {
    localStorage.setItem(LAST_ROUTE_STORAGE_KEY, pathname);
  } catch {
    /* ignore */
  }
}

export function getDisplayName(profile: UserMePayload): string {
  const parts = [profile.prenom, profile.nom].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : profile.email || "Utilisateur";
}

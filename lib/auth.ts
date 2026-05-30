import "server-only";
import { cookies } from "next/headers";
import { decodeJwtPayload, isJwtExpired, type AppRole } from "@/lib/session";

export const TOKEN_COOKIE_NAME = "bv-token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export type SessionPayload = {
  userId: number;
  email: string;
  nom: string;
  prenom: string;
  role: AppRole;
};

export async function getAuthToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(TOKEN_COOKIE_NAME)?.value ?? null;
}

export async function setAuthToken(token: string): Promise<void> {
  const c = await cookies();
  c.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });
}

export async function clearAuthToken(): Promise<void> {
  const c = await cookies();
  c.delete(TOKEN_COOKIE_NAME);
}

/**
 * Décode le payload JWT sans vérification de signature (lecture seule côté Next.js).
 * La vérification de signature se fait côté NestJS.
 */
export function decodeTokenPayload(token: string): SessionPayload | null {
  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    if (isJwtExpired(payload)) return null;
    return {
      userId: payload.sub || payload.userId || 0,
      email: payload.email ?? "",
      nom: payload.nom ?? "",
      prenom: payload.prenom ?? "",
      role: (payload.role ?? "employee") as AppRole,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = await getAuthToken();
  if (!token) {
    console.log("[AUTH] getSession: no token found in cookies");
    return null;
  }
  const payload = decodeTokenPayload(token);
  if (!payload) {
    console.log("[AUTH] getSession: failed to decode token:", token.substring(0, 20) + "...");
  }
  return payload;
}

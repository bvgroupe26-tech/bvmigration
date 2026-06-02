"use client";

import type { UserMePayload } from "@/lib/employee/types";
import {
  decodeJwtPayload,
  isAccessTokenUsable,
  isJwtExpired,
  shouldRefreshAccessToken,
} from "@/lib/session";

/** BFF Next (même origine) — relaie les cookies HttpOnly vers NestJS */
export const AUTH_REFRESH_URL = "/api/auth/refresh";
const AUTH_LOGIN_URL = "/api/auth/login";
const AUTH_LOGOUT_URL = "/api/auth/logout";
const SET_TOKEN_URL = "/api/set-token";

export const ACCESS_TOKEN_COOKIE = "bv-token";

let accessToken: string | null = null;
let isRefreshing = false;

type RefreshWaiter = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let refreshWaiters: RefreshWaiter[] = [];

const AUTH_FETCH_TIMEOUT_MS = 20_000;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Lit le jeton stocké dans le cookie `bv-token` (survit au rechargement / mobile). */
/** Lit le cookie bv-token même si le JWT est expiré (pour déclencher un refresh). */
export function readPersistedAccessTokenRaw(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACCESS_TOKEN_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return token.split(".").length === 3 ? token : null;
  } catch {
    return null;
  }
}

export function readPersistedAccessToken(): string | null {
  const token = readPersistedAccessTokenRaw();
  return isAccessTokenUsable(token) ? token : null;
}

export function getAccessToken(): string | null {
  if (accessToken && isAccessTokenUsable(accessToken)) return accessToken;
  if (accessToken && !isAccessTokenUsable(accessToken)) accessToken = null;

  const persisted = readPersistedAccessToken();
  if (persisted) {
    accessToken = persisted;
    return persisted;
  }
  return null;
}

export function getIsRefreshing(): boolean {
  return isRefreshing;
}

/** Réinitialise l’état client après déconnexion (évite les blocages sur mobile). */
export function resetAuthSessionState(): void {
  accessToken = null;
  if (isRefreshing) {
    notifyRefreshFailure(new Error("Session fermée"));
  }
  isRefreshing = false;
  refreshWaiters = [];
  if (typeof document !== "undefined") {
    document.cookie = `${ACCESS_TOKEN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: "include",
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

type AuthTokenPayload = {
  access_token?: string;
  accessToken?: string;
  token?: string;
  user?: UserMePayload;
};

function unwrapPayload<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export function extractAccessToken(payload: AuthTokenPayload | string | null | undefined): string {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  return payload.access_token || payload.accessToken || payload.token || "";
}

function notifyRefreshSuccess(token: string): void {
  refreshWaiters.forEach(({ resolve }) => resolve(token));
  refreshWaiters = [];
}

function notifyRefreshFailure(error: unknown): void {
  refreshWaiters.forEach(({ reject }) => reject(error));
  refreshWaiters = [];
}

/** Enregistre le jeton côté navigateur (cookie `bv-token` via BFF). */
export async function persistAccessToken(token: string): Promise<void> {
  setAccessToken(token);
  try {
    await authFetch(SET_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    /* le serveur a peut-être déjà posé le cookie lors du login/refresh */
  }
}

export async function clearPersistedAccessToken(): Promise<void> {
  resetAuthSessionState();
  try {
    await authFetch(SET_TOKEN_URL, { method: "DELETE" });
  } catch {
    /* ignore */
  }
}

/**
 * POST /api/auth/refresh — cookie HttpOnly refresh uniquement (pas de body).
 */
export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshWaiters.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const res = await authFetch(AUTH_REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      setAccessToken(null);
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }

    if (!res.ok) {
      const message =
        (json && typeof json === "object" && "error" in json && String((json as { error: unknown }).error)) ||
        "Impossible de renouveler la session.";
      throw new Error(message);
    }

    const payload = unwrapPayload<AuthTokenPayload>(json);
    const token = extractAccessToken(payload);
    if (!token) {
      throw new Error("Jeton d'accès introuvable.");
    }

    await persistAccessToken(token);
    notifyRefreshSuccess(token);
    return token;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutErr = new Error("Délai dépassé. Vérifiez votre connexion et réessayez.");
      setAccessToken(null);
      notifyRefreshFailure(timeoutErr);
      throw timeoutErr;
    }
    notifyRefreshFailure(error);
    throw error;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Renouvelle le jeton si absent, expiré ou proche de l'expiration.
 */
export async function ensureValidAccessToken(): Promise<string> {
  const current = getAccessToken() ?? readPersistedAccessTokenRaw();
  if (current && !shouldRefreshAccessToken(current)) {
    setAccessToken(current);
    return current;
  }
  return refreshAccessToken();
}

/**
 * Restaure la session : jeton valide en cache → sinon refresh (cookie HttpOnly).
 */
export async function restoreSessionAccessToken(): Promise<string> {
  return ensureValidAccessToken();
}

/** Rafraîchissement silencieux (retour app, timer) — ne propage pas l'erreur. */
export async function trySilentRefresh(): Promise<string | null> {
  try {
    return await ensureValidAccessToken();
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await clearPersistedAccessToken();
  try {
    await authFetch(AUTH_LOGOUT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    /* ignore network errors during logout */
  } finally {
    resetAuthSessionState();
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }
}

export type LoginCredentials = {
  email: string;
  password: string;
};

export async function loginRequest(credentials: LoginCredentials): Promise<{
  accessToken: string;
  user?: UserMePayload;
}> {
  resetAuthSessionState();

  const res = await authFetch(AUTH_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "error" in json && String((json as { error: unknown }).error)) ||
      "Email ou mot de passe incorrect.";
    throw new Error(message);
  }

  const payload = unwrapPayload<AuthTokenPayload>(json);
  const token = extractAccessToken(payload);
  if (!token) {
    throw new Error("Réponse de connexion invalide.");
  }

  await persistAccessToken(token);
  return { accessToken: token, user: payload.user };
}

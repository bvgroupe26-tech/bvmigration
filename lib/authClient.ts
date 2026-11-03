"use client";

import type { UserMePayload } from "@/lib/employee/types";
import { isAccessTokenUsable, shouldRefreshAccessToken } from "@/lib/session";

/** BFF Next (même origine) — relaie les cookies HttpOnly vers NestJS */
export const AUTH_REFRESH_URL = "/api/auth/refresh";
const AUTH_LOGIN_URL = "/api/auth/login";
const AUTH_LOGOUT_URL = "/api/auth/logout";
const SET_TOKEN_URL = "/api/set-token";

export const ACCESS_TOKEN_COOKIE = "bv-token";

const REFRESH_LOCK_NAME = "bv-refresh";
const AUTH_CHANNEL_NAME = "bv-auth";

let accessToken: string | null = null;
let refreshInFlight: Promise<string> | null = null;

const AUTH_FETCH_TIMEOUT_MS = 20_000;
/** Render free tier : cold start pouvant dépasser 20s sur POST /api/auth/refresh */
const AUTH_REFRESH_FETCH_TIMEOUT_MS = 35_000;
const REFRESH_RETRY_DELAYS_MS = [1_000, 2_000] as const;

/** Le serveur a refusé la session (401/403) : seule cause légitime de déconnexion. */
export class RefreshAuthError extends Error {
  constructor(message = "Session expirée. Veuillez vous reconnecter.") {
    super(message);
    this.name = "RefreshAuthError";
  }
}

/** Réseau coupé, timeout, cold start ou 5xx : la session est peut-être toujours valide. */
export class RefreshTransientError extends Error {
  constructor(message = "Délai dépassé. Vérifiez votre connexion et réessayez.") {
    super(message);
    this.name = "RefreshTransientError";
  }
}

type AuthChannelMessage = { type: "token"; token: string } | { type: "logout" };

const authChannel: BroadcastChannel | null =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(AUTH_CHANNEL_NAME)
    : null;

authChannel?.addEventListener("message", (event: MessageEvent<AuthChannelMessage>) => {
  const message = event.data;
  if (message?.type === "token" && isAccessTokenUsable(message.token)) {
    accessToken = message.token;
  } else if (message?.type === "logout") {
    accessToken = null;
  }
});

function broadcast(message: AuthChannelMessage): void {
  try {
    authChannel?.postMessage(message);
  } catch {
    /* canal fermé */
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Ancien cookie lisible JS (avant passage en httpOnly) ; renvoie null une fois le cookie httpOnly. */
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
  return refreshInFlight !== null;
}

/** Réinitialise l’état client après déconnexion (évite les blocages sur mobile). */
export function resetAuthSessionState(): void {
  accessToken = null;
  refreshInFlight = null;
  if (typeof document !== "undefined") {
    document.cookie = `${ACCESS_TOKEN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRefreshAuthRejected(error: unknown): boolean {
  return error instanceof RefreshAuthError;
}

async function authFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = AUTH_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
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
 * Sérialise le refresh entre onglets / PWA + navigateur : le backend fait tourner le refresh token
 * et considère la réutilisation d'un token déjà remplacé comme un vol.
 */
async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && "locks" in navigator && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK_NAME, fn);
  }
  return fn();
}

async function performRefresh(tokenAtStart: string | null): Promise<string> {
  // Un autre onglet a renouvelé pendant qu'on attendait le verrou : on réutilise son jeton.
  if (
    accessToken &&
    accessToken !== tokenAtStart &&
    isAccessTokenUsable(accessToken) &&
    !shouldRefreshAccessToken(accessToken)
  ) {
    return accessToken;
  }

  let res: Response;
  try {
    res = await authFetch(
      AUTH_REFRESH_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      AUTH_REFRESH_FETCH_TIMEOUT_MS
    );
  } catch {
    throw new RefreshTransientError();
  }

  const json = await res.json().catch(() => null);

  if (res.status === 401 || res.status === 403) {
    setAccessToken(null);
    throw new RefreshAuthError();
  }

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "error" in json && String((json as { error: unknown }).error)) ||
      "Impossible de renouveler la session.";
    throw new RefreshTransientError(message);
  }

  const token = extractAccessToken(unwrapPayload<AuthTokenPayload>(json));
  if (!token) {
    throw new RefreshTransientError("Jeton d'accès introuvable.");
  }

  await persistAccessToken(token);
  broadcast({ type: "token", token });
  return token;
}

/**
 * POST /api/auth/refresh — cookie HttpOnly refresh uniquement (pas de body).
 * Rejette avec RefreshAuthError (session refusée) ou RefreshTransientError (réseau / serveur).
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  const tokenAtStart = accessToken;
  const pending = withRefreshLock(() => performRefresh(tokenAtStart)).finally(() => {
    if (refreshInFlight === pending) refreshInFlight = null;
  });
  refreshInFlight = pending;
  return pending;
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
 * Retries avec backoff (1s, 2s) pour absorber les cold starts Render.
 */
export async function restoreSessionAccessToken(): Promise<string> {
  const current = getAccessToken() ?? readPersistedAccessTokenRaw();
  if (current && !shouldRefreshAccessToken(current)) {
    setAccessToken(current);
    return current;
  }

  const maxAttempts = 1 + REFRESH_RETRY_DELAYS_MS.length;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await refreshAccessToken();
    } catch (error) {
      lastError = error;
      if (isRefreshAuthRejected(error)) throw error;
      if (attempt < REFRESH_RETRY_DELAYS_MS.length) {
        await delay(REFRESH_RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  throw lastError;
}

/** Rafraîchissement silencieux (retour app, timer) — ne propage pas l'erreur. */
export async function trySilentRefresh(): Promise<string | null> {
  try {
    return await ensureValidAccessToken();
  } catch {
    return null;
  }
}

async function clearClientCaches(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if ("caches" in window) {
      // Le precache (page /offline, assets du build) est conservé : il ne contient aucune donnée utilisateur.
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => !name.includes("precache")).map((name) => caches.delete(name))
      );
    }
  } catch {
    /* ignore */
  }
  try {
    const { clearAllOfflineData } = await import("@/lib/db/offlineDB");
    await clearAllOfflineData();
  } catch {
    /* IndexedDB indisponible (mode privé) */
  }
}

export async function logout(): Promise<void> {
  await clearPersistedAccessToken();
  broadcast({ type: "logout" });
  try {
    await authFetch(AUTH_LOGOUT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    /* ignore network errors during logout */
  } finally {
    resetAuthSessionState();
    await clearClientCaches();
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

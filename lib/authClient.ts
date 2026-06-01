"use client";

import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import type { UserMePayload } from "@/lib/employee/types";

/** Route unique de refresh — proxy Next → NestJS */
export const AUTH_REFRESH_URL = "/api/nest/auth/refresh";

let accessToken: string | null = null;
let isRefreshing = false;

type RefreshWaiter = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let refreshWaiters: RefreshWaiter[] = [];

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getIsRefreshing(): boolean {
  return isRefreshing;
}

type AuthTokenPayload = {
  access_token?: string;
  accessToken?: string;
  token?: string;
  user?: UserMePayload;
};

function resolveApiUrl(path: string): string {
  return path.startsWith("http") ? path : `${resolveApiBaseUrl()}${path}`;
}

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

/**
 * POST /api/nest/auth/refresh — cookie HttpOnly refresh uniquement (pas de body).
 */
export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshWaiters.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const res = await fetch(AUTH_REFRESH_URL, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
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

    setAccessToken(token);
    notifyRefreshSuccess(token);
    return token;
  } catch (error) {
    notifyRefreshFailure(error);
    throw error;
  } finally {
    isRefreshing = false;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(resolveApiUrl("/auth/logout"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    /* ignore network errors during logout */
  } finally {
    setAccessToken(null);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
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
  const res = await fetch(resolveApiUrl("/auth/login"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    cache: "no-store",
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

  setAccessToken(token);
  return { accessToken: token, user: payload.user };
}

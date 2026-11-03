"use client";

import { toast } from "sonner";
import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import {
  extractApiErrorMessage,
  getUserErrorMessage,
  isAuthApiPath,
  messageForHttpStatus,
  normalizeNetworkError,
  resolveApiErrorContext,
} from "@/lib/api-errors";
import {
  ensureValidAccessToken,
  getAccessToken,
  isRefreshAuthRejected,
  logout,
  refreshAccessToken,
} from "@/lib/authClient";
import { shouldRefreshAccessToken } from "@/lib/session";
import type { SyncQueueMethod } from "@/lib/db/types";
import { OfflineQueuedError, queueMutation } from "@/lib/sync/syncManager";

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export { OfflineQueuedError } from "@/lib/sync/syncManager";

/** Échec réseau réel (pas de réponse HTTP), distinct d'une erreur métier renvoyée par l'API. */
type ApiFailure = { ok: false; error: string; networkFailure?: boolean };

/**
 * Paie et changements de statut : un rejeu différé pourrait écraser une décision prise entre-temps
 * (bulletin payé/annulé, absence validée/refusée). Ces actions doivent échouer franchement.
 */
const NON_QUEUEABLE_PATH_PATTERNS: RegExp[] = [
  /^\/paie(\/|$|\?)/,
  /^\/absences\/\d+(\/|$)/,
  /\/statut(\/|$)/,
  /\/(valider|approuver|refuser|rejeter|annuler)(\/|$)/,
];

function isQueueablePath(path: string): boolean {
  if (isAuthApiPath(path)) return false;
  return !NON_QUEUEABLE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function isDeviceOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

async function maybeQueueOfflineMutation(
  path: string,
  method: SyncQueueMethod,
  body: unknown,
  failure: ApiFailure
): Promise<never> {
  // Une réponse HTTP (même 502/504 sur cold start Render) signifie que le serveur a peut-être
  // traité la requête : on ne la rejoue pas. Seul un fetch sans réponse (TypeError) ou un appareil hors ligne compte.
  const reallyOffline = failure.networkFailure === true || isDeviceOffline();
  if (!reallyOffline || !isQueueablePath(path)) {
    throw new Error(failure.error);
  }

  await queueMutation(method, path, body);
  toast.message("Enregistré hors ligne. Synchronisation à la reconnexion.");
  throw new OfflineQueuedError();
}

function getBaseUrl(): string {
  return resolveApiBaseUrl();
}

/** Avant chaque appel API : renouveler si le JWT court expire bientôt. */
async function maybeProactiveRefresh(path: string): Promise<void> {
  if (isAuthApiPath(path)) return;
  const token = getAccessToken();
  if (!token || !shouldRefreshAccessToken(token)) return;
  try {
    await ensureValidAccessToken();
  } catch {
    /* 401 handler prendra le relais */
  }
}

type RefreshOutcome = "refreshed" | "rejected" | "transient";

/** refreshAccessToken déduplique déjà les appels concurrents (mémoire + verrou inter-onglets). */
async function ensureFreshAccessToken(path: string): Promise<RefreshOutcome> {
  if (isAuthApiPath(path)) return "transient";
  try {
    await refreshAccessToken();
    return "refreshed";
  } catch (error) {
    return isRefreshAuthRejected(error) ? "rejected" : "transient";
  }
}

async function logoutIfOutsideLogin(): Promise<void> {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    await logout();
  }
}

function buildHeaders(options: RequestInit, includeJsonContentType: boolean): Headers {
  const headers = new Headers(options.headers);
  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (includeJsonContentType && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function parseResponse<T>(res: Response, path: string): Promise<ApiResponse<T>> {
  if (res.status === 204) {
    return { ok: true, data: undefined as T };
  }

  const json = await res.json().catch(() => null);

  if (res.status === 401) {
    const context = resolveApiErrorContext(path);
    return { ok: false, error: extractApiErrorMessage(json, 401, context) };
  }

  if (!res.ok) {
    const context = resolveApiErrorContext(path);
    return { ok: false, error: extractApiErrorMessage(json, res.status, context) };
  }

  const data = json?.data !== undefined ? json.data : json;
  return { ok: true, data: data as T };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<ApiResponse<T>> {
  return apiFetchInternal<T>(path, options, retryOnUnauthorized);
}

async function apiFetchInternal<T>(
  path: string,
  options: RequestInit,
  retryOnUnauthorized: boolean
): Promise<ApiResponse<T> | (ApiFailure & { ok: false })> {
  await maybeProactiveRefresh(path);

  const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;
  const headers = buildHeaders(options, true);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, error: normalizeNetworkError(err), networkFailure: true };
  }

  if (res.status === 401 && retryOnUnauthorized && !isAuthApiPath(path)) {
    const outcome = await ensureFreshAccessToken(path);
    if (outcome === "refreshed") {
      return apiFetchInternal<T>(path, options, false);
    }
    // Seul un refus explicite du refresh déconnecte ; un timeout / cold start garde la session.
    if (outcome === "rejected") {
      await logoutIfOutsideLogin();
    }
  }

  return parseResponse<T>(res, path);
}

export async function apiGet<T>(path: string): Promise<T> {
  const result = await apiFetchInternal<T>(path, {}, true);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const result = await apiFetchInternal<T>(
    path,
    { method: "POST", body: body ? JSON.stringify(body) : undefined },
    true
  );
  if (!result.ok) return maybeQueueOfflineMutation(path, "POST", body, result);
  return result.data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const result = await apiFetchInternal<T>(
    path,
    { method: "PUT", body: body ? JSON.stringify(body) : undefined },
    true
  );
  if (!result.ok) return maybeQueueOfflineMutation(path, "PUT", body, result);
  return result.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const deletePath = `${path}/delete`;
  const result = await apiFetchInternal<T>(deletePath, { method: "POST" }, true);
  if (!result.ok) return maybeQueueOfflineMutation(deletePath, "POST", undefined, result);
  return result.data;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;

  const execute = async (retryOnUnauthorized: boolean): Promise<T> => {
    const headers = buildHeaders({}, false);
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: formData,
      credentials: "include",
      cache: "no-store",
    });

    if (res.status === 401 && retryOnUnauthorized && !isAuthApiPath(path)) {
      const outcome = await ensureFreshAccessToken(path);
      if (outcome === "refreshed") return execute(false);
      if (outcome === "rejected") await logoutIfOutsideLogin();
    }

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      throw new Error(extractApiErrorMessage(json, 401, resolveApiErrorContext(path)));
    }

    if (!res.ok) {
      throw new Error(extractApiErrorMessage(json, res.status, resolveApiErrorContext(path)));
    }

    return (json?.data !== undefined ? json.data : json) as T;
  };

  try {
    return await execute(true);
  } catch (err) {
    throw new Error(getUserErrorMessage(err, normalizeNetworkError(err)));
  }
}

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(contentDisposition);
  return match ? decodeURIComponent(match[1].replace(/"/g, "")) : null;
}

export async function apiDownload(path: string, fallbackName = "fichier"): Promise<void> {
  const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;

  const execute = async (retryOnUnauthorized: boolean): Promise<void> => {
    const headers = buildHeaders({}, false);
    const res = await fetch(url, {
      headers,
      credentials: "include",
      cache: "no-store",
    });

    if (res.status === 401 && retryOnUnauthorized && !isAuthApiPath(path)) {
      const outcome = await ensureFreshAccessToken(path);
      if (outcome === "refreshed") return execute(false);
      if (outcome === "rejected") await logoutIfOutsideLogin();
    }

    if (res.status === 401) {
      const json = await res.json().catch(() => null);
      throw new Error(extractApiErrorMessage(json, 401, resolveApiErrorContext(path)));
    }

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(extractApiErrorMessage(json, res.status, resolveApiErrorContext(path)));
    }

    const blob = await res.blob();
    const filename = parseFilename(res.headers.get("Content-Disposition")) || fallbackName;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  };

  try {
    await execute(true);
  } catch (err) {
    throw new Error(getUserErrorMessage(err, messageForHttpStatus(500)));
  }
}

export { getUserErrorMessage } from "@/lib/api-errors";

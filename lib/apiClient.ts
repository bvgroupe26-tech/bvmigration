"use client";

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
  getAccessToken,
  getIsRefreshing,
  logout,
  refreshAccessToken,
} from "@/lib/authClient";

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

function getBaseUrl(): string {
  return resolveApiBaseUrl();
}

let isInterceptorRefreshing = false;
let refreshWaiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

function subscribeRefresh(): Promise<void> {
  return new Promise((resolve, reject) => {
    refreshWaiters.push({ resolve, reject });
  });
}

function notifyRefreshSuccess(): void {
  refreshWaiters.forEach(({ resolve }) => resolve());
  refreshWaiters = [];
}

function notifyRefreshFailure(error: unknown): void {
  refreshWaiters.forEach(({ reject }) => reject(error));
  refreshWaiters = [];
}

async function ensureFreshAccessToken(path: string): Promise<boolean> {
  if (isAuthApiPath(path)) return false;

  // Refresh déjà en cours (authClient ou intercepteur) — attendre sans relancer
  if (getIsRefreshing() || isInterceptorRefreshing) {
    try {
      await subscribeRefresh();
      return Boolean(getAccessToken());
    } catch {
      return false;
    }
  }

  isInterceptorRefreshing = true;
  try {
    await refreshAccessToken();
    notifyRefreshSuccess();
    return true;
  } catch {
    notifyRefreshFailure(new Error("refresh_failed"));
    await logout();
    return false;
  } finally {
    isInterceptorRefreshing = false;
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
  const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;
  const headers = buildHeaders(options, true);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });

    if (res.status === 401 && retryOnUnauthorized && !isAuthApiPath(path)) {
      const refreshed = await ensureFreshAccessToken(path);
      if (refreshed) {
        return apiFetch<T>(path, options, false);
      }
    }

    return parseResponse<T>(res, path);
  } catch (err) {
    return { ok: false, error: normalizeNetworkError(err) };
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const result = await apiFetch<T>(path);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const result = await apiFetch<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const result = await apiFetch<T>(path, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const result = await apiFetch<T>(`${path}/delete`, { method: "POST" });
  if (!result.ok) throw new Error(result.error);
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
      const refreshed = await ensureFreshAccessToken(path);
      if (refreshed) return execute(false);
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
      const refreshed = await ensureFreshAccessToken(path);
      if (refreshed) return execute(false);
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

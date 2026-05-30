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

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

function getBaseUrl(): string {
  return resolveApiBaseUrl();
}
const TOKEN_COOKIE_NAME = "bv-token";

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function handleUnauthorized(path: string, json: unknown): Promise<string> {
  const context = resolveApiErrorContext(path);
  const message = extractApiErrorMessage(json, 401, context);

  if (
    !isAuthApiPath(path) &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    await fetch("/api/set-token", { method: "DELETE" });
    window.location.href = "/login";
  }

  return message;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getTokenFromCookie();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    if (res.status === 204) {
      return { ok: true, data: undefined as T };
    }

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      return { ok: false, error: await handleUnauthorized(path, json) };
    }

    if (!res.ok) {
      const context = resolveApiErrorContext(path);
      const msg = extractApiErrorMessage(json, res.status, context);
      return { ok: false, error: msg };
    }

    const data = json?.data !== undefined ? json.data : json;
    return { ok: true, data: data as T };
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

export async function setAuthToken(token: string): Promise<void> {
  await fetch("/api/set-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export async function clearAuthToken(): Promise<void> {
  await fetch("/api/set-token", { method: "DELETE" });
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getTokenFromCookie();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;

  try {
    const res = await fetch(url, { method: "PUT", headers, body: formData, cache: "no-store" });
    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      throw new Error(await handleUnauthorized(path, json));
    }

    if (!res.ok) {
      throw new Error(extractApiErrorMessage(json, res.status, resolveApiErrorContext(path)));
    }

    return (json?.data !== undefined ? json.data : json) as T;
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
  const token = getTokenFromCookie();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = path.startsWith("http") ? path : `${getBaseUrl()}${path}`;

  try {
    const res = await fetch(url, { headers, cache: "no-store" });

    if (res.status === 401) {
      const json = await res.json().catch(() => null);
      throw new Error(await handleUnauthorized(path, json));
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
  } catch (err) {
    throw new Error(getUserErrorMessage(err, messageForHttpStatus(500)));
  }
}

export { getUserErrorMessage } from "@/lib/api-errors";

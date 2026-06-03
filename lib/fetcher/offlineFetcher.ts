"use client";

import { getFromStore, getById, saveToStore } from "@/lib/db/offlineDB";
import type {
  BudgetEntityKind,
  BudgetOfflineRow,
  DashboardCache,
  NotificationOffline,
} from "@/lib/db/types";
import { getStoreFromUrl } from "@/lib/db/store-map";
import { fetcher } from "@/lib/fetcher";
import { messageForHttpStatus } from "@/lib/api-errors";

export class OfflineDataUnavailableError extends Error {
  constructor(url: string) {
    super(`Offline: no cached data for ${url}`);
    this.name = "OfflineDataUnavailableError";
  }
}

const AUTH_ERROR_MESSAGES = new Set([
  messageForHttpStatus(401, "default"),
  messageForHttpStatus(401, "session"),
  messageForHttpStatus(403),
  "Session expirée. Veuillez vous reconnecter.",
]);

const NETWORK_ERROR_SNIPPETS = [
  "Impossible de joindre le serveur",
  "Vérifiez votre connexion",
  "Délai dépassé",
  "Failed to fetch",
  "NetworkError",
  "fetch failed",
];

type StorableRecord = Record<string, unknown> & { id?: number; key?: string };

function isAuthHttpError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return AUTH_ERROR_MESSAGES.has(error.message.trim());
}

function isNetworkHttpError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return NETWORK_ERROR_SNIPPETS.some((snippet) => msg.includes(snippet));
}

function unwrapEnvelope(payload: unknown): unknown {
  if (payload == null || typeof payload !== "object") return payload;

  const record = payload as Record<string, unknown>;

  if ("ok" in record && "data" in record) {
    return record.data;
  }

  if ("data" in record && record.data !== undefined) {
    return record.data;
  }

  return payload;
}

function hasStorableId(value: unknown): value is StorableRecord {
  if (!value || typeof value !== "object") return false;
  const id = (value as StorableRecord).id;
  return typeof id === "number" && Number.isFinite(id);
}

function budgetEntityKindFromPath(path: string): BudgetEntityKind | null {
  if (path.includes("/categories")) return "categories";
  if (path.includes("/enveloppes")) return "enveloppes";
  if (path.includes("/depenses")) return "depenses";
  return null;
}

function isBudgetOfflineRow(value: unknown): value is BudgetOfflineRow {
  if (!value || typeof value !== "object") return false;
  const row = value as BudgetOfflineRow;
  return (
    (row.entity_kind === "categories" ||
      row.entity_kind === "enveloppes" ||
      row.entity_kind === "depenses") &&
    typeof row.id === "number" &&
    Number.isFinite(row.id) &&
    row.record != null &&
    typeof row.record === "object"
  );
}

function normalizePath(url: string): string {
  let path = url.trim();
  if (path.startsWith("http://") || path.startsWith("https://")) {
    path = new URL(path).pathname;
  }
  const queryIndex = path.indexOf("?");
  if (queryIndex !== -1) path = path.slice(0, queryIndex);
  if (path.startsWith("/api/nest")) {
    path = path.slice("/api/nest".length) || "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;
  return path;
}

function isListEndpoint(path: string): boolean {
  if (path.endsWith("/me")) return false;
  if (path.includes("/balance")) return false;
  if (/\/\d+$/.test(path)) return false;
  return true;
}

function extractNumericId(path: string): number | null {
  const match = path.match(/\/(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

/**
 * Prépare les enregistrements IndexedDB à partir d'une réponse API déjà déballée.
 */
export function normalizePayload(
  url: string,
  storeName: string,
  response: unknown
): StorableRecord[] | DashboardCache[] | BudgetOfflineRow[] | NotificationOffline[] {
  const inner = unwrapEnvelope(response);
  const path = normalizePath(url);

  if (storeName === "dashboard") {
    return [
      {
        key: url,
        data: inner,
        cachedAt: Date.now(),
      },
    ];
  }

  if (storeName === "budget") {
    const entityKind = budgetEntityKindFromPath(path);
    if (!entityKind) return [];

    const toRow = (row: StorableRecord): BudgetOfflineRow => ({
      entity_kind: entityKind,
      id: row.id as number,
      record: row as BudgetOfflineRow["record"],
    });

    if (Array.isArray(inner)) {
      return inner.filter(hasStorableId).map(toRow);
    }

    if (hasStorableId(inner)) {
      return [toRow(inner)];
    }

    return [];
  }

  if (storeName === "notifications") {
    if (Array.isArray(inner)) {
      return inner.filter(hasStorableId) as unknown as NotificationOffline[];
    }

    if (hasStorableId(inner)) {
      return [inner as unknown as NotificationOffline];
    }

    return [];
  }

  if (Array.isArray(inner)) {
    return inner.filter(hasStorableId) as StorableRecord[];
  }

  if (hasStorableId(inner)) {
    return [inner];
  }

  return [];
}

async function persistResponse(url: string, storeName: string, response: unknown): Promise<void> {
  if (typeof window === "undefined") return;

  const path = normalizePath(url);
  const records = normalizePayload(url, storeName, response);

  if (records.length === 0) return;

  const entityRows =
    storeName === "budget"
      ? records.filter(isBudgetOfflineRow)
      : records.filter(hasStorableId);
  if (entityRows.length > 0) {
    await saveToStore(storeName, entityRows as StorableRecord[]);
  }

  const shouldCacheByUrl =
    storeName === "dashboard" ||
    !isListEndpoint(path) ||
    (extractNumericId(path) == null && !Array.isArray(unwrapEnvelope(response)));

  if (shouldCacheByUrl) {
    await saveToStore("dashboard", [
      {
        key: url,
        data: unwrapEnvelope(response),
        cachedAt: Date.now(),
      },
    ]);
  }
}

async function loadFromOfflineStore<T>(url: string, storeName: string): Promise<T | null> {
  if (typeof window === "undefined") return null;

  const path = normalizePath(url);

  if (storeName === "dashboard") {
    const rows = await getFromStore<DashboardCache>("dashboard");
    const hit = rows.find((row) => row.key === url);
    return (hit?.data as T) ?? null;
  }

  const dashboardRows = await getFromStore<DashboardCache>("dashboard");
  const dashboardHit = dashboardRows.find((row) => row.key === url);
  if (dashboardHit) {
    return dashboardHit.data as T;
  }

  const id = extractNumericId(path);
  if (id != null) {
    const one = await getById<T>(storeName, id);
    if (one !== undefined) return one;
  }

  const rows = await getFromStore<T>(storeName);

  if (isListEndpoint(path)) {
    return (rows.length > 0 ? rows : null) as T | null;
  }

  if (path.endsWith("/me") && rows.length > 0) {
    return rows[0] as T;
  }

  if (rows.length === 1) {
    return rows[0] as T;
  }

  return (rows.length > 0 ? rows : null) as T | null;
}

/**
 * Remplacement du `fetcher` SWR : cache IndexedDB + repli hors ligne.
 */
export async function offlineFetcher<T>(url: string): Promise<T> {
  if (typeof window === "undefined") {
    return fetcher<T>(url);
  }

  const storeName = getStoreFromUrl(url);

  try {
    const data = await fetcher<T>(url);

    if (storeName) {
      try {
        await persistResponse(url, storeName, data);
      } catch (persistError) {
        console.warn(`[offlineFetcher] persist failed for ${url}`, persistError);
      }
    }

    return data;
  } catch (error) {
    if (isAuthHttpError(error)) {
      throw error;
    }

    if (!isNetworkHttpError(error) || !storeName) {
      throw error;
    }

    const cached = await loadFromOfflineStore<T>(url, storeName);

    if (cached == null) {
      throw new OfflineDataUnavailableError(url);
    }

    return cached;
  }
}

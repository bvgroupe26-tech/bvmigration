"use client";

import {
  addToSyncQueue,
  clearSyncQueueItem,
  getSyncQueue,
  incrementSyncRetry,
} from "@/lib/db/offlineDB";
import type { SyncQueueItem, SyncQueueMethod } from "@/lib/db/types";
import {
  extractApiErrorMessage,
  isAuthApiPath,
  resolveApiErrorContext,
} from "@/lib/api-errors";
import { ensureValidAccessToken, getAccessToken } from "@/lib/authClient";
import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import {
  BV_RH_SYNC_TAG,
  MAX_SYNC_RETRIES,
} from "@/lib/sync/constants";

export class OfflineQueuedError extends Error {
  constructor(message = "Action enregistrée hors ligne. Synchronisation à la reconnexion.") {
    super(message);
    this.name = "OfflineQueuedError";
  }
}

export type SyncQueueResult = {
  synced: number;
  failed: number;
  skipped: number;
};

const NETWORK_ERROR_MARKERS = [
  "Impossible de joindre le serveur",
  "Failed to fetch",
  "NetworkError",
  "fetch failed",
  "Load failed",
] as const;

export function isOfflineRetryableError(message: string): boolean {
  const lower = message.toLowerCase();
  return NETWORK_ERROR_MARKERS.some(
    (marker) => lower.includes(marker.toLowerCase()) || message.includes(marker)
  );
}

let processing = false;

export async function queueMutation(
  method: SyncQueueMethod,
  url: string,
  body: unknown
): Promise<void> {
  if (isAuthApiPath(url)) return;

  await addToSyncQueue({
    method,
    url,
    body: body ?? null,
    timestamp: Date.now(),
  });

  await registerBackgroundSync();
}

export async function registerBackgroundSync(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (
      registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    ).sync;

    if (syncManager?.register) {
      await syncManager.register(BV_RH_SYNC_TAG);
    }
  } catch {
    /* Safari / Firefox : pas de Background Sync API */
  }
}

function buildReplayUrl(path: string): string {
  return path.startsWith("http") ? path : `${resolveApiBaseUrl()}${path}`;
}

async function replayQueuedItem(item: SyncQueueItem): Promise<"ok" | "network" | "fatal"> {
  if (!item.id) return "fatal";

  try {
    await ensureValidAccessToken();
  } catch {
    return "network";
  }

  const token = getAccessToken();
  if (!token) return "fatal";

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.set("Authorization", `Bearer ${token}`);

  const init: RequestInit = {
    method: item.method,
    headers,
    credentials: "include",
    cache: "no-store",
  };

  if (item.body != null && item.method !== "DELETE") {
    init.body = JSON.stringify(item.body);
  }

  let res: Response;
  try {
    res = await fetch(buildReplayUrl(item.url), init);
  } catch {
    return "network";
  }

  if (res.status === 401) {
    try {
      await ensureValidAccessToken();
      const retryToken = getAccessToken();
      if (!retryToken) return "fatal";
      headers.set("Authorization", `Bearer ${retryToken}`);
      res = await fetch(buildReplayUrl(item.url), { ...init, headers });
    } catch {
      return "network";
    }
  }

  if (res.status === 204) return "ok";

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const message = extractApiErrorMessage(
      json,
      res.status,
      resolveApiErrorContext(item.url)
    );
    if (isOfflineRetryableError(message)) return "network";
    return "fatal";
  }

  return "ok";
}

export async function processSyncQueue(): Promise<SyncQueueResult> {
  if (processing) return { synced: 0, failed: 0, skipped: 0 };
  processing = true;

  const result: SyncQueueResult = { synced: 0, failed: 0, skipped: 0 };

  try {
    const queue = await getSyncQueue();
    const pending = queue.filter(
      (item) => item.status === "pending" && item.retries <= MAX_SYNC_RETRIES
    );

    for (const item of pending) {
      const outcome = await replayQueuedItem(item);

      if (outcome === "ok" && item.id != null) {
        await clearSyncQueueItem(item.id);
        result.synced += 1;
        continue;
      }

      if (outcome === "network" && item.id != null) {
        await incrementSyncRetry(item.id);
        const retries = item.retries + 1;
        if (retries > MAX_SYNC_RETRIES) result.failed += 1;
        break;
      }

      if (item.id != null) {
        await incrementSyncRetry(item.id);
        if (item.retries + 1 > MAX_SYNC_RETRIES) result.failed += 1;
        else result.skipped += 1;
      }
    }
  } finally {
    processing = false;
  }

  return result;
}

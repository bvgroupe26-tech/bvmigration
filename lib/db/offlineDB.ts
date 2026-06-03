import { openDB, type IDBPDatabase } from "idb";
import type {
  BvRhOfflineSchema,
  DashboardCache,
  OfflineStoreName,
  SyncQueueItem,
  SyncQueueStatus,
} from "./types";

const DB_NAME = "bv-rh-offline";
const DB_VERSION = 2;

const STORE_NAMES: OfflineStoreName[] = [
  "employees",
  "presences",
  "leaves",
  "payslips",
  "documents",
  "dashboard",
  "budget",
  "notifications",
  "sync_queue",
];

let dbInstance: IDBPDatabase<BvRhOfflineSchema> | null = null;
let dbPromise: Promise<IDBPDatabase<BvRhOfflineSchema>> | null = null;

function isOfflineStoreName(name: string): name is OfflineStoreName {
  return (STORE_NAMES as string[]).includes(name);
}

export async function getDB(): Promise<IDBPDatabase<BvRhOfflineSchema>> {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  dbPromise = openDB<BvRhOfflineSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("employees")) {
        const employees = db.createObjectStore("employees", { keyPath: "id" });
        employees.createIndex("departement", "departement", { unique: false });
        employees.createIndex("statut", "statut", { unique: false });
      }

      if (!db.objectStoreNames.contains("presences")) {
        const presences = db.createObjectStore("presences", { keyPath: "id" });
        presences.createIndex("employe_id", "employe_id", { unique: false });
        presences.createIndex("date", "date", { unique: false });
      }

      if (!db.objectStoreNames.contains("leaves")) {
        const leaves = db.createObjectStore("leaves", { keyPath: "id" });
        leaves.createIndex("employe_id", "employe_id", { unique: false });
        leaves.createIndex("statut", "statut", { unique: false });
      }

      if (!db.objectStoreNames.contains("payslips")) {
        const payslips = db.createObjectStore("payslips", { keyPath: "id" });
        payslips.createIndex("employe_id", "employe_id", { unique: false });
        payslips.createIndex("mois", "mois", { unique: false });
      }

      if (!db.objectStoreNames.contains("documents")) {
        const documents = db.createObjectStore("documents", { keyPath: "id" });
        documents.createIndex("employe_id", "employe_id", { unique: false });
        documents.createIndex("type", "type", { unique: false });
      }

      if (!db.objectStoreNames.contains("dashboard")) {
        db.createObjectStore("dashboard", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("budget")) {
        const budget = db.createObjectStore("budget", {
          keyPath: ["entity_kind", "id"],
        });
        budget.createIndex("entity_kind", "entity_kind", { unique: false });
      }

      if (!db.objectStoreNames.contains("notifications")) {
        const notifications = db.createObjectStore("notifications", { keyPath: "id" });
        notifications.createIndex("employe_id", "employe_id", { unique: false });
        notifications.createIndex("lu", "lu", { unique: false });
      }

      if (!db.objectStoreNames.contains("sync_queue")) {
        const syncQueue = db.createObjectStore("sync_queue", {
          keyPath: "id",
          autoIncrement: true,
        });
        syncQueue.createIndex("timestamp", "timestamp", { unique: false });
        syncQueue.createIndex("status", "status", { unique: false });
      }
    },
  })
    .then((db) => {
      dbInstance = db;
      return db;
    })
    .catch((error) => {
      dbPromise = null;
      throw error;
    });

  return dbPromise;
}

export async function saveToStore<T extends { id?: number; key?: string }>(
  storeName: string,
  data: T[]
): Promise<void> {
  if (!isOfflineStoreName(storeName)) {
    throw new Error(`Store inconnu: ${storeName}`);
  }

  try {
    const db = await getDB();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.store;

    for (const item of data) {
      if (storeName === "dashboard") {
        const row = item as unknown as DashboardCache;
        if (!row.key) continue;
        await store.put({
          key: row.key,
          data: row.data,
          cachedAt: row.cachedAt ?? Date.now(),
        } satisfies DashboardCache);
      } else {
        await store.put(item as never);
      }
    }

    await tx.done;
  } catch (error) {
    console.error(`[offlineDB] saveToStore(${storeName})`, error);
    throw error;
  }
}

export async function getFromStore<T>(
  storeName: string,
  indexName?: string,
  query?: IDBKeyRange
): Promise<T[]> {
  if (!isOfflineStoreName(storeName)) {
    throw new Error(`Store inconnu: ${storeName}`);
  }

  try {
    const db = await getDB();
    const tx = db.transaction(storeName, "readonly");
    const store = tx.store;

    let results: T[];
    if (indexName && query !== undefined) {
      results = (await store.index(indexName).getAll(query)) as T[];
    } else if (indexName) {
      results = (await store.index(indexName).getAll()) as T[];
    } else {
      results = (await store.getAll()) as T[];
    }

    await tx.done;
    return results;
  } catch (error) {
    console.error(`[offlineDB] getFromStore(${storeName})`, error);
    throw error;
  }
}

export async function getById<T>(
  storeName: string,
  id: string | number
): Promise<T | undefined> {
  if (!isOfflineStoreName(storeName)) {
    throw new Error(`Store inconnu: ${storeName}`);
  }

  try {
    const db = await getDB();
    const key: string | number = storeName === "dashboard" ? String(id) : Number(id);
    const result = await db.get(storeName, key as never);
    return result as T | undefined;
  } catch (error) {
    console.error(`[offlineDB] getById(${storeName}, ${id})`, error);
    throw error;
  }
}

export async function clearStore(storeName: string): Promise<void> {
  if (!isOfflineStoreName(storeName)) {
    throw new Error(`Store inconnu: ${storeName}`);
  }

  try {
    const db = await getDB();
    const tx = db.transaction(storeName, "readwrite");
    await tx.store.clear();
    await tx.done;
  } catch (error) {
    console.error(`[offlineDB] clearStore(${storeName})`, error);
    throw error;
  }
}

export async function addToSyncQueue(
  item: Omit<SyncQueueItem, "id" | "retries" | "status">
): Promise<void> {
  try {
    const db = await getDB();
    const entry: SyncQueueItem = {
      ...item,
      timestamp: item.timestamp ?? Date.now(),
      retries: 0,
      status: "pending",
    };
    await db.add("sync_queue", entry);
  } catch (error) {
    console.error("[offlineDB] addToSyncQueue", error);
    throw error;
  }
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await getDB();
    const items = await db.getAll("sync_queue");
    return items.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("[offlineDB] getSyncQueue", error);
    throw error;
  }
}

export async function clearSyncQueueItem(id: number): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("sync_queue", id);
  } catch (error) {
    console.error(`[offlineDB] clearSyncQueueItem(${id})`, error);
    throw error;
  }
}

export async function incrementSyncRetry(id: number): Promise<void> {
  try {
    const db = await getDB();
    const item = await db.get("sync_queue", id);
    if (!item) return;

    const retries = item.retries + 1;
    const status: SyncQueueStatus = retries > 3 ? "failed" : item.status;

    await db.put("sync_queue", {
      ...item,
      id,
      retries,
      status,
    });
  } catch (error) {
    console.error(`[offlineDB] incrementSyncRetry(${id})`, error);
    throw error;
  }
}

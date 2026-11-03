import { apiClient } from "@/lib/fetcher";

/** Ancien stockage local (avant le référentiel partagé en base). Lu une seule fois pour migration. */
const LEGACY_STORAGE_KEY = "bv-postes-referentiel";

export const POSTES_REFERENTIEL_PATH = "/employes/postes/referentiel";

export function normalizePosteLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toSortedList(raw: unknown): string[] {
  const items = Array.isArray(raw) ? raw : [];
  const labels = items
    .map((p) => {
      if (typeof p === "string") return normalizePosteLabel(p);
      if (p && typeof p === "object" && "label" in p) {
        return normalizePosteLabel(String((p as { label: unknown }).label ?? ""));
      }
      return "";
    })
    .filter(Boolean);
  return Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b, "fr"));
}

export async function fetchPostesReferentiel(): Promise<string[]> {
  return toSortedList(await apiClient.get<unknown>(POSTES_REFERENTIEL_PATH));
}

export async function addPosteReferentiel(label: string): Promise<string[]> {
  return toSortedList(
    await apiClient.post<unknown>(POSTES_REFERENTIEL_PATH, { label: normalizePosteLabel(label) })
  );
}

export async function removePosteReferentiel(label: string): Promise<string[]> {
  return toSortedList(
    await apiClient.post<unknown>(`${POSTES_REFERENTIEL_PATH}/remove`, {
      label: normalizePosteLabel(label),
    })
  );
}

/** Envoie au serveur les postes saisis localement sur cet appareil, puis efface le stockage local. */
export async function migrateLegacyPostes(serverPostes: string[]): Promise<string[] | null> {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let legacy: string[] = [];
  try {
    legacy = toSortedList(JSON.parse(raw));
  } catch {
    /* contenu illisible : on l'abandonne */
  }

  const known = new Set(serverPostes.map((p) => p.toLowerCase()));
  let latest: string[] | null = null;
  for (const label of legacy) {
    if (label.length < 2 || known.has(label.toLowerCase())) continue;
    latest = await addPosteReferentiel(label);
    known.add(label.toLowerCase());
  }

  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return latest;
}

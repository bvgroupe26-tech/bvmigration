/**
 * Correspondance chemins API (relatifs ou proxifiés) → stores IndexedDB.
 * Les fetchers utilisent des paths du type `/employes`, `/employes/me`, `/absences?...`.
 */

export const URL_TO_STORE: Record<string, string> = {
  "/employes": "employees",
  "/presences": "presences",
  "/absences": "leaves",
  "/paie": "payslips",
  "/documents": "documents",
  "/dashboard": "dashboard",
  "/budget": "budget",
  "/notifications": "notifications",
};

/** Plus long en premier pour éviter que `/paie` masque `/paie/stats`. */
const SORTED_PREFIXES = Object.keys(URL_TO_STORE).sort((a, b) => b.length - a.length);

/**
 * Extrait le chemin API (sans origin, sans query) puis trouve le store.
 * Gère `/api/nest/employes/me`, `employes/123`, etc.
 */
export function getStoreFromUrl(url: string): string | null {
  try {
    let path = url.trim();

    if (path.startsWith("http://") || path.startsWith("https://")) {
      path = new URL(path).pathname;
    }

    const queryIndex = path.indexOf("?");
    if (queryIndex !== -1) {
      path = path.slice(0, queryIndex);
    }

    if (path.startsWith("/api/nest")) {
      path = path.slice("/api/nest".length) || "/";
    }

    if (!path.startsWith("/")) {
      path = `/${path}`;
    }

    for (const prefix of SORTED_PREFIXES) {
      if (path === prefix || path.startsWith(`${prefix}/`)) {
        return URL_TO_STORE[prefix] ?? null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function isKnownOfflineStore(storeName: string | null): boolean {
  if (!storeName) return false;
  return Object.values(URL_TO_STORE).includes(storeName);
}

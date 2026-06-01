const STORAGE_KEY = "bv-postes-referentiel";

export const DEFAULT_POSTES = [
  "Responsable RH",
  "Chargé de recrutement",
  "Comptable",
  "Développeur",
  "Développeur Senior",
  "Chef de projet",
  "Responsable commercial",
  "Assistant administratif",
  "Directeur général",
  "Technicien support",
];

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function readStoredPostes(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_POSTES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_POSTES];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_POSTES];
    return parsed
      .map((p) => (typeof p === "string" ? normalizeLabel(p) : ""))
      .filter(Boolean);
  } catch {
    return [...DEFAULT_POSTES];
  }
}

export function writeStoredPostes(postes: string[]): string[] {
  const unique = Array.from(
    new Set(postes.map(normalizeLabel).filter((p) => p.length >= 2))
  ).sort((a, b) => a.localeCompare(b, "fr"));
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  }
  return unique;
}

export function addStoredPoste(label: string): string[] {
  const next = normalizeLabel(label);
  if (!next) return readStoredPostes();
  return writeStoredPostes([...readStoredPostes(), next]);
}

export function removeStoredPoste(label: string): string[] {
  const key = normalizeLabel(label).toLowerCase();
  return writeStoredPostes(readStoredPostes().filter((p) => p.toLowerCase() !== key));
}

export function mergePostesFromStrings(extra: (string | null | undefined)[]): string[] {
  const current = readStoredPostes();
  const merged = [...current];
  for (const item of extra) {
    const label = item ? normalizeLabel(item) : "";
    if (label && !merged.some((p) => p.toLowerCase() === label.toLowerCase())) {
      merged.push(label);
    }
  }
  return writeStoredPostes(merged);
}

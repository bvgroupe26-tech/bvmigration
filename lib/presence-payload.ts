export function presenceToApiPayload(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const map: Record<string, string> = {
    employe_id: "employeId",
    heure_entree: "heureEntree",
    heure_sortie: "heureSortie",
    heures_supplementaires: "heuresSupplementaires",
  };

  for (const [key, value] of Object.entries(data)) {
    if (value === "" || value === undefined || value === null) continue;
    const apiKey = map[key] ?? key;
    result[apiKey] = value;
  }
  return result;
}

export function nowTimeValue(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

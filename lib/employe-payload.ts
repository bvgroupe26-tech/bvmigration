function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Prépare le corps JSON pour POST/PUT /employes (camelCase, sans champs vides). */
export function prepareEmployeApiPayload(
  data: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === "password" || key === "password_confirm") continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;

    const camelKey = snakeToCamelKey(key);
    payload[camelKey] = value;
  }

  return payload;
}

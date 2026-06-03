import { getFromStore } from "@/lib/db/offlineDB";

export async function getOfflineDataSummary(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const [employees, presences, leaves, payslips, documents, budget, notifications] =
      await Promise.all([
        getFromStore("employees"),
        getFromStore("presences"),
        getFromStore("leaves"),
        getFromStore("payslips"),
        getFromStore("documents"),
        getFromStore("budget"),
        getFromStore("notifications"),
      ]);

    const parts: string[] = [];
    if (employees.length > 0) parts.push(`${employees.length} employé(s)`);
    if (presences.length > 0) parts.push(`${presences.length} présence(s)`);
    if (leaves.length > 0) parts.push(`${leaves.length} congé(s)`);
    if (payslips.length > 0) parts.push(`${payslips.length} bulletin(s)`);
    if (documents.length > 0) parts.push(`${documents.length} document(s)`);
    if (budget.length > 0) parts.push(`${budget.length} ligne(s) budget`);
    if (notifications.length > 0) parts.push(`${notifications.length} notification(s)`);

    return parts.length > 0 ? parts.join(" · ") : null;
  } catch {
    return null;
  }
}

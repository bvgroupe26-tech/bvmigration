/** Affichage montants FCFA avec séparateurs de milliers (ex. 140 000). */
export function formatFcfa(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return "";
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Parse une saisie utilisateur (espaces, points) en nombre entier FCFA. */
export function parseMoneyInput(value: string): number {
  const digits = value.replace(/\s/g, "").replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

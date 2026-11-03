export const APP_TIME_ZONE = "Africa/Brazzaville";

/** Jour civil "YYYY-MM-DD" dans le fuseau de l'entreprise (évite le décalage UTC de toISOString entre 00h et 01h). */
export function localDateISO(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

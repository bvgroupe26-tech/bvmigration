/**
 * URL de l'API NestJS.
 * - Côté navigateur : proxy relatif `/api/nest` (même origine → OK sur mobile LAN).
 * - Côté serveur Node : URL absolue (Render en prod, localhost en dev).
 */
const DEFAULT_LOCAL_API = "http://127.0.0.1:3001";
const DEFAULT_PROD_API = "https://bv-groupe.onrender.com";

export function resolveApiBaseUrl(): string {
  const fallbackTarget =
    process.env.NODE_ENV === "production" ? DEFAULT_PROD_API : DEFAULT_LOCAL_API;
  const serverTarget =
    process.env.API_PROXY_TARGET?.replace(/\/$/, "") || fallbackTarget;
  const serverBase = serverTarget.endsWith("/api") ? serverTarget : `${serverTarget}/api`;

  if (typeof window === "undefined") {
    const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (configured && !configured.startsWith("/")) {
      return configured.endsWith("/api") ? configured : `${configured}/api`;
    }
    return serverBase;
  }

  // Navigateur : toujours passer par le proxy Next (évite localhost + CORS sur mobile).
  return "/api/nest";
}

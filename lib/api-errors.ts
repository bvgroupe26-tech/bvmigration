export type ApiErrorContext = "login" | "session" | "default";

const HTTP_USER_MESSAGES: Record<number, string> = {
  400: "Les informations envoyées sont incorrectes. Vérifiez votre saisie.",
  401: "Accès refusé. Vérifiez vos identifiants ou reconnectez-vous.",
  403: "Vous n'avez pas l'autorisation d'effectuer cette action.",
  404: "Élément introuvable. Il a peut-être été supprimé.",
  409: "Cette action n'est pas possible : un conflit existe déjà.",
  422: "Certaines informations sont invalides. Corrigez le formulaire.",
  429: "Trop de tentatives. Attendez un moment avant de réessayer.",
  500: "Le serveur rencontre un problème. Réessayez dans quelques instants.",
  502: "Le service est temporairement indisponible.",
  503: "Le service est en maintenance. Réessayez plus tard.",
  504: "Le délai de réponse est dépassé. Vérifiez votre connexion.",
};

const TECHNICAL_PATTERNS: RegExp[] = [
  /^erreur\s*\d{3}$/i,
  /^error\s*\d{3}$/i,
  /^http\s*\d{3}$/i,
  /^\d{3}$/,
  /unauthorized/i,
  /forbidden/i,
  /not found/i,
  /internal server error/i,
  /bad request/i,
  /failed to fetch/i,
  /network error/i,
  /fetch failed/i,
  /networkrequestfailed/i,
  /statuscode/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
];

export function isTechnicalMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isAuthApiPath(path: string): boolean {
  return /^\/auth\/(login|register)/.test(path);
}

export function messageForHttpStatus(status: number, context: ApiErrorContext = "default"): string {
  if (status === 401) {
    if (context === "login") return "Email ou mot de passe incorrect.";
    if (context === "session") return "Votre session a expiré. Veuillez vous reconnecter.";
  }
  return (
    HTTP_USER_MESSAGES[status] ??
    "Une erreur est survenue. Réessayez ou contactez l'administrateur RH."
  );
}

function readJsonMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const candidates = [o.error, o.message];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
      return value.join(" · ");
    }
  }

  return null;
}

export function extractApiErrorMessage(
  json: unknown,
  status: number,
  context: ApiErrorContext = "default"
): string {
  const fromApi = readJsonMessage(json);
  if (fromApi && !isTechnicalMessage(fromApi)) return fromApi;
  return messageForHttpStatus(status, context);
}

export function resolveApiErrorContext(path: string): ApiErrorContext {
  if (isAuthApiPath(path)) return "login";
  return "session";
}

export function normalizeNetworkError(err: unknown): string {
  if (err instanceof TypeError) {
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  }
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg && !isTechnicalMessage(msg)) return msg;
  }
  return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
}

export function getUserErrorMessage(
  err: unknown,
  fallback = "Une erreur est survenue. Réessayez."
): string {
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg && !isTechnicalMessage(msg)) return msg;
  }
  if (typeof err === "string") {
    const msg = err.trim();
    if (msg && !isTechnicalMessage(msg)) return msg;
  }
  return fallback;
}

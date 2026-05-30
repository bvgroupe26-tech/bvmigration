/**
 * Désactive les contrôles de session au proxy (Edge) et permet une session
 * factice côté serveur Node (`requireSessionOrDev`).
 *
 * Modes :
 * 1. `next dev` → désactivé automatiquement (NODE_ENV=development).
 * 2. Variable d’environnement `BV_AUTH_DISABLED=1` (ex. `next start` local).
 * 3. Mettre `FORCE_OPEN_ACCESS_WITHOUT_AUTH` à `true` ci-dessous (démo / binaire sans login).
 *
 * Ne jamais livrer `FORCE_OPEN_ACCESS_WITHOUT_AUTH = true` sur un serveur public.
 */
export const FORCE_OPEN_ACCESS_WITHOUT_AUTH = false;

export const authVerificationDisabled =
  FORCE_OPEN_ACCESS_WITHOUT_AUTH ||
  process.env.NODE_ENV === "development" ||
  process.env.BV_AUTH_DISABLED === "1";

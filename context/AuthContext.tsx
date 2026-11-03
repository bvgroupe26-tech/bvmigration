"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserMePayload } from "@/lib/employee/types";
import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import {
  getAccessToken,
  isRefreshAuthRejected,
  loginRequest,
  logout as authLogout,
  readPersistedAccessTokenRaw,
  refreshAccessToken,
  resetAuthSessionState,
  setAccessToken,
  type LoginCredentials,
} from "@/lib/authClient";
import {
  getHomeRouteByRole,
  resolveAuthoritativeRole,
  shouldRefreshAccessToken,
} from "@/lib/session";
import AuthLoading from "@/components/auth/AuthLoading";
import {
  PROFILE_STORAGE_KEY,
  persistLastRoute,
  readCachedProfile as readStoredProfile,
} from "@/lib/session-storage";
import { BV_AUTH_READY_EVENT } from "@/lib/pwa-install";

const PUBLIC_PATHS = new Set(["/", "/login", "/offline"]);
const AUTH_FETCH_TIMEOUT_MS = 20_000;

type AuthContextValue = {
  user: UserMePayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReconnecting: boolean;
  login: (credentials: LoginCredentials) => Promise<UserMePayload | null>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Erreur bootstrap avec code HTTP connu (401/403) ou indéterminé (réseau, timeout, 5xx). */
class AuthBootstrapError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = "AuthBootstrapError";
    this.status = status;
  }
}

function isAuthRejected(err: unknown): boolean {
  return err instanceof AuthBootstrapError && (err.status === 401 || err.status === 403);
}

function readCachedProfile(): UserMePayload | null {
  const stored = readStoredProfile();
  if (!stored) return null;
  const profile = normalizeUserMe(stored);
  const token = readPersistedAccessTokenRaw();
  const role = resolveAuthoritativeRole(profile.role, token);
  return role ? { ...profile, role } : profile;
}

function persistCachedProfile(profile: UserMePayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* quota / mode privé */
  }
}

function clearCachedProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function unwrapUserMePayload(json: unknown): UserMePayload {
  const raw = json && typeof json === "object" && "data" in json ? (json as { data: unknown }).data : json;
  let user: unknown = raw;
  if (raw && typeof raw === "object" && "user" in raw && (raw as { user: unknown }).user) {
    user = (raw as { user: unknown }).user;
  }
  return normalizeUserMe(user);
}

/** Rôle compte utilisateur uniquement — jamais déduit de la fiche employé liée. */
function extractRoleField(o: Record<string, unknown>): string {
  if (o.role != null && String(o.role).trim() !== "") return String(o.role).trim();
  if (Array.isArray(o.roles) && o.roles.length > 0) return String(o.roles[0]).trim();
  return "";
}

function normalizeUserMe(raw: unknown): UserMePayload {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const employe =
    o.employe && typeof o.employe === "object" ? (o.employe as Record<string, unknown>) : null;
  const avatarRaw = o.avatar ?? o.avatarUrl ?? employe?.avatar ?? employe?.avatarUrl;
  const employeId =
    o.employeId != null
      ? Number(o.employeId)
      : o.employe_id != null
        ? Number(o.employe_id)
        : employe?.id != null
          ? Number(employe.id)
          : null;
  return {
    ...(raw as UserMePayload),
    id: Number(o.id ?? 0),
    email: String(o.email ?? ""),
    role: extractRoleField(o),
    nom: String(o.nom ?? ""),
    prenom: String(o.prenom ?? ""),
    employeId,
    hasEmployeProfile:
      typeof o.hasEmployeProfile === "boolean" ? o.hasEmployeProfile : employeId != null && employeId > 0,
    matricule: (o.matricule ?? employe?.matricule) as string | null | undefined,
    poste: (o.poste ?? employe?.poste) as string | null | undefined,
    departement: (o.departement ?? employe?.departement) as string | null | undefined,
    avatar: avatarRaw != null && avatarRaw !== "" ? String(avatarRaw) : null,
  };
}

function enrichUserProfile(profile: UserMePayload, accessToken?: string): UserMePayload {
  const role = resolveAuthoritativeRole(profile.role, accessToken);
  return role ? { ...profile, role } : profile;
}

async function authFetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AuthBootstrapError("Délai dépassé", null);
    }
    throw new AuthBootstrapError("Erreur réseau", null);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchCurrentUser(accessToken: string): Promise<UserMePayload> {
  let res: Response;
  try {
    res = await authFetchWithTimeout(`${resolveApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    if (error instanceof AuthBootstrapError) throw error;
    throw new AuthBootstrapError("Erreur réseau", null);
  }

  const json = await res.json().catch(() => null);

  if (res.status === 401 || res.status === 403) {
    throw new AuthBootstrapError("Session invalide", res.status);
  }
  if (!res.ok) {
    throw new AuthBootstrapError("Erreur serveur", res.status);
  }

  const profile = enrichUserProfile(unwrapUserMePayload(json), accessToken);
  persistCachedProfile(profile);
  return profile;
}

/** Passe par le chemin de refresh unique (dédupliqué + verrou inter-onglets) de authClient. */
async function refreshBootstrapToken(): Promise<string> {
  try {
    return await refreshAccessToken();
  } catch (error) {
    if (isRefreshAuthRejected(error)) {
      throw new AuthBootstrapError("Session expirée", 401);
    }
    throw new AuthBootstrapError(
      error instanceof Error ? error.message : "Impossible de renouveler la session",
      null
    );
  }
}

function ReconnectingBanner() {
  return (
    <div
      role="status"
      className="no-print fixed inset-x-0 top-0 z-[100] border-b border-amber-200/80 bg-amber-50/95 px-4 py-2 text-center text-xs font-medium text-amber-900 backdrop-blur-sm"
    >
      Reconnexion en cours…
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Profil en cache lu après hydratation (localStorage absent côté serveur → mismatch sinon).
  const [user, setUser] = useState<UserMePayload | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [suppressLoginRedirect, setSuppressLoginRedirect] = useState(false);
  const pathname = usePathname() || "/";
  const router = useRouter();

  const applyUser = useCallback((profile: UserMePayload) => {
    persistCachedProfile(profile);
    setUser(profile);
    setIsAuthenticated(true);
    setIsReconnecting(false);
    setSuppressLoginRedirect(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(BV_AUTH_READY_EVENT));
      void import("@/lib/push-notifications").then(({ resyncPushAfterAuth }) =>
        resyncPushAfterAuth()
      );
    }
  }, []);

  const clearUser = useCallback(() => {
    clearCachedProfile();
    setUser(null);
    setIsAuthenticated(false);
    setIsReconnecting(false);
    setSuppressLoginRedirect(false);
  }, []);

  const bootstrap = useCallback(async () => {
    let token = getAccessToken() ?? readPersistedAccessTokenRaw() ?? null;
    if (token) setAccessToken(token);

    const needsRefresh = !token || shouldRefreshAccessToken(token);
    if (needsRefresh) {
      token = await refreshBootstrapToken();
    }

    if (!token) return;

    try {
      const profile = await fetchCurrentUser(token);
      applyUser(profile);
      return profile;
    } catch (error) {
      if (!isAuthRejected(error)) throw error;
      token = await refreshBootstrapToken();
      const profile = await fetchCurrentUser(token);
      applyUser(profile);
      return profile;
    }
  }, [applyUser]);

  const refreshSession = useCallback(async () => {
    setIsReconnecting(false);
    try {
      await bootstrap();
    } catch (error) {
      if (isAuthRejected(error)) {
        clearUser();
        resetAuthSessionState();
        throw error;
      }
      const cached = readCachedProfile();
      if (cached) {
        setUser(cached);
        setIsAuthenticated(true);
        setIsReconnecting(true);
      } else {
        setIsReconnecting(true);
        setSuppressLoginRedirect(true);
      }
      throw error;
    }
  }, [bootstrap, clearUser]);

  useEffect(() => {
    let cancelled = false;

    const cached = readCachedProfile();
    if (cached) {
      setUser((current) => current ?? cached);
      setIsAuthenticated(true);
    }

    const run = async () => {
      try {
        await bootstrap();
      } catch (error) {
        if (cancelled) return;

        if (isAuthRejected(error)) {
          clearUser();
          resetAuthSessionState();
          return;
        }

        const cached = readCachedProfile();
        if (cached) {
          setUser(cached);
          setIsAuthenticated(true);
          setIsReconnecting(true);
        } else {
          setIsReconnecting(true);
          setSuppressLoginRedirect(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [bootstrap, clearUser]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (PUBLIC_PATHS.has(pathname) || pathname === "/offline") return;
    persistLastRoute(pathname);
  }, [isAuthenticated, isLoading, pathname]);

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_PATHS.has(pathname);

    if (!isAuthenticated && !isPublic && !suppressLoginRedirect) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isAuthenticated && user && pathname === "/login") {
      router.replace(getHomeRouteByRole(user.role));
    }
  }, [isAuthenticated, isLoading, pathname, router, user, suppressLoginRedirect]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const result = await loginRequest(credentials);

      let profile: UserMePayload;
      if (result.user) {
        profile = enrichUserProfile(normalizeUserMe(result.user), result.accessToken);
        persistCachedProfile(profile);
      } else {
        profile = await fetchCurrentUser(result.accessToken);
      }

      applyUser(profile);
      setIsLoading(false);
      return profile;
    },
    [applyUser]
  );

  const logout = useCallback(async () => {
    clearUser();
    setIsLoading(false);
    await authLogout();
  }, [clearUser]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      isReconnecting,
      login,
      logout,
      refreshSession,
    }),
    [user, isAuthenticated, isLoading, isReconnecting, login, logout, refreshSession]
  );

  if (isLoading && !PUBLIC_PATHS.has(pathname) && !user) {
    return (
      <AuthContext.Provider value={value}>
        <AuthLoading />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {isReconnecting ? <ReconnectingBanner /> : null}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider.");
  }
  return context;
}

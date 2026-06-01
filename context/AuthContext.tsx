"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserMePayload } from "@/lib/employee/types";
import { apiGet } from "@/lib/apiClient";
import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import {
  getAccessToken,
  loginRequest,
  logout as authLogout,
  refreshAccessToken,
  type LoginCredentials,
} from "@/lib/authClient";
import { decodeJwtPayload, getHomeRouteByRole, normalizeAppRole } from "@/lib/session";
import AuthLoading from "@/components/auth/AuthLoading";

const PUBLIC_PATHS = new Set(["/", "/login"]);

type AuthContextValue = {
  user: UserMePayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<UserMePayload | null>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function unwrapUserMePayload(json: unknown): UserMePayload {
  const raw = json && typeof json === "object" && "data" in json ? (json as { data: unknown }).data : json;
  let user: unknown = raw;
  if (raw && typeof raw === "object" && "user" in raw && (raw as { user: unknown }).user) {
    user = (raw as { user: unknown }).user;
  }
  return normalizeUserMe(user);
}

function normalizeUserMe(raw: unknown): UserMePayload {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const employe =
    o.employe && typeof o.employe === "object" ? (o.employe as Record<string, unknown>) : null;
  const avatarRaw = o.avatar ?? o.avatarUrl ?? employe?.avatar ?? employe?.avatarUrl;
  return {
    ...(raw as UserMePayload),
    id: Number(o.id ?? 0),
    email: String(o.email ?? ""),
    role: String(o.role ?? ""),
    nom: String(o.nom ?? ""),
    prenom: String(o.prenom ?? ""),
    employeId:
      o.employeId != null
        ? Number(o.employeId)
        : o.employe_id != null
          ? Number(o.employe_id)
          : employe?.id != null
            ? Number(employe.id)
            : null,
    matricule: (o.matricule ?? employe?.matricule) as string | null | undefined,
    poste: (o.poste ?? employe?.poste) as string | null | undefined,
    departement: (o.departement ?? employe?.departement) as string | null | undefined,
    avatar: avatarRaw != null && avatarRaw !== "" ? String(avatarRaw) : null,
  };
}

function enrichUserProfile(profile: UserMePayload, accessToken?: string): UserMePayload {
  const fromApi = normalizeAppRole(profile.role);
  if (fromApi) return { ...profile, role: fromApi };

  if (accessToken) {
    const fromJwt = normalizeAppRole(decodeJwtPayload(accessToken)?.role?.toString());
    if (fromJwt) return { ...profile, role: fromJwt };
  }

  return profile;
}

async function fetchCurrentUser(token?: string): Promise<UserMePayload> {
  if (token) {
    const res = await fetch(`${resolveApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error("Session invalide");
    return enrichUserProfile(unwrapUserMePayload(json), token);
  }
  const profile = await apiGet<UserMePayload>("/auth/me");
  return enrichUserProfile(unwrapUserMePayload(profile), getAccessToken() ?? undefined);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMePayload | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname() || "/";
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    const token = await refreshAccessToken();
    const profile = await fetchCurrentUser(token);
    setUser(enrichUserProfile(profile, token));
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      const isPublic = PUBLIC_PATHS.has(pathname);

      if (isPublic) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await refreshAccessToken();
        const profile = await fetchCurrentUser(token);
        setUser(profile);
        setIsAuthenticated(true);
        // #region agent log
        fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
          body: JSON.stringify({
            sessionId: "cd157f",
            runId: "admin-auth",
            hypothesisId: "A3",
            location: "AuthContext.tsx:init:ok",
            message: "session init ok",
            data: { pathname, role: profile.role },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      } catch (err) {
        // #region agent log
        fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
          body: JSON.stringify({
            sessionId: "cd157f",
            runId: "admin-auth",
            hypothesisId: "A1-A2",
            location: "AuthContext.tsx:init:fail",
            message: "session init failed",
            data: {
              pathname,
              error: err instanceof Error ? err.message : "unknown",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_PATHS.has(pathname);

    if (!isAuthenticated && !isPublic) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isAuthenticated && user && pathname === "/login") {
      router.replace(getHomeRouteByRole(user.role));
    }

    // Redirection depuis `/` gérée par WelcomeSplash (écran de bienvenue).
  }, [isAuthenticated, isLoading, pathname, router, user]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await loginRequest(credentials);

    if (result.user) {
      const user = enrichUserProfile(result.user, result.accessToken);
      setUser(user);
      setIsAuthenticated(true);
      setIsLoading(false);
      return user;
    }

    const profile = await fetchCurrentUser(result.accessToken);
    setUser(profile);
    setIsAuthenticated(true);
    setIsLoading(false);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setIsAuthenticated(false);
    await authLogout();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshSession,
    }),
    [user, isAuthenticated, isLoading, login, logout, refreshSession]
  );

  if (isLoading && pathname !== "/") {
    return (
      <AuthContext.Provider value={value}>
        <AuthLoading />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider.");
  }
  return context;
}

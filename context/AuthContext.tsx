"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserMePayload } from "@/lib/employee/types";
import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import {
  loginRequest,
  logout as authLogout,
  resetAuthSessionState,
  restoreSessionAccessToken,
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

async function fetchCurrentUser(accessToken: string): Promise<UserMePayload> {
  const res = await fetch(`${resolveApiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error("Session invalide");
  return enrichUserProfile(unwrapUserMePayload(json), accessToken);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMePayload | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname() || "/";
  const router = useRouter();

  const applyUser = useCallback((profile: UserMePayload) => {
    setUser(profile);
    setIsAuthenticated(true);
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const bootstrap = useCallback(async () => {
    const token = await restoreSessionAccessToken();
    const profile = await fetchCurrentUser(token);
    applyUser(profile);
    return profile;
  }, [applyUser]);

  const refreshSession = useCallback(async () => {
    await bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (PUBLIC_PATHS.has(pathname)) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        await bootstrap();
      } catch {
        if (!cancelled) {
          clearUser();
          resetAuthSessionState();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [pathname, bootstrap, clearUser]);

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
  }, [isAuthenticated, isLoading, pathname, router, user]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const result = await loginRequest(credentials);

      let profile: UserMePayload;
      if (result.user) {
        profile = enrichUserProfile(result.user, result.accessToken);
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
      login,
      logout,
      refreshSession,
    }),
    [user, isAuthenticated, isLoading, login, logout, refreshSession]
  );

  if (isLoading && !PUBLIC_PATHS.has(pathname)) {
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

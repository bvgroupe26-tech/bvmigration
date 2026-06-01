"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserMePayload } from "@/lib/employee/types";
import { apiGet } from "@/lib/apiClient";
import { resolveApiBaseUrl } from "@/lib/resolve-api-url";
import {
  loginRequest,
  logout as authLogout,
  refreshAccessToken,
  type LoginCredentials,
} from "@/lib/authClient";
import { getHomeRouteByRole } from "@/lib/session";
import AuthLoading from "@/components/auth/AuthLoading";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/register/employee"]);

type AuthContextValue = {
  user: UserMePayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<UserMePayload | null>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCurrentUser(token?: string): Promise<UserMePayload> {
  if (token) {
    const res = await fetch(`${resolveApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error("Session invalide");
    return (json?.data ?? json) as UserMePayload;
  }
  return apiGet<UserMePayload>("/auth/me");
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
    setUser(profile);
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
      } catch {
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

    if (isAuthenticated && user && pathname === "/") {
      router.replace(getHomeRouteByRole(user.role));
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await loginRequest(credentials);

    if (result.user) {
      setUser(result.user);
      setIsAuthenticated(true);
      setIsLoading(false);
      return result.user;
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

  if (isLoading) {
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

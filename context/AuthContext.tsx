"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserMePayload } from "@/lib/employee/types";
import { apiGet } from "@/lib/apiClient";
import {
  getAccessToken,
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

async function fetchCurrentUser(): Promise<UserMePayload> {
  return apiGet<UserMePayload>("/auth/me");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMePayload | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname() || "/";
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    await refreshAccessToken();
    const profile = await fetchCurrentUser();
    setUser(profile);
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await refreshAccessToken();
        const profile = await fetchCurrentUser();
        setUser(profile);
        setIsAuthenticated(true);
      } catch {
        // Pas de session (visiteur) ou refresh invalide — normal
        if (!getAccessToken()) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

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

    const profile = await fetchCurrentUser();
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

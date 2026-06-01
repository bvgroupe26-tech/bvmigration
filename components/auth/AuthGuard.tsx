"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getHomeRouteByRole, normalizeAppRole } from "@/lib/session";
import AuthLoading from "@/components/auth/AuthLoading";

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
};

function roleAllowed(userRole: string | undefined, allowedRoles?: string[]): boolean {
  if (!allowedRoles?.length) return true;
  const normalized = normalizeAppRole(userRole);
  if (!normalized) return false;
  return allowedRoles.includes(normalized);
}

export default function AuthGuard({ children, allowedRoles, redirectTo }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const redirectedRef = useRef(false);

  const hasAccess = roleAllowed(user?.role, allowedRoles);

  useEffect(() => {
    redirectedRef.current = false;
  }, [pathname, user?.role]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || hasAccess) return;

    const target = redirectTo || getHomeRouteByRole(user.role);
    if (pathname === target || pathname.startsWith(`${target}/`)) {
      // #region agent log
      fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
        body: JSON.stringify({
          sessionId: "cd157f",
          runId: "admin-auth",
          hypothesisId: "A1",
          location: "AuthGuard.tsx:redirectLoop",
          message: "role blocked on target route",
          data: {
            pathname,
            target,
            rawRole: user.role,
            normalizedRole: normalizeAppRole(user.role),
            allowedRoles,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return;
    }

    if (redirectedRef.current) return;
    redirectedRef.current = true;
    // #region agent log
    fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
      body: JSON.stringify({
        sessionId: "cd157f",
        runId: "admin-auth",
        hypothesisId: "A1",
        location: "AuthGuard.tsx:redirect",
        message: "redirecting wrong role",
        data: {
          pathname,
          target,
          rawRole: user.role,
          normalizedRole: normalizeAppRole(user.role),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    router.replace(target);
  }, [
    allowedRoles,
    hasAccess,
    isAuthenticated,
    isLoading,
    pathname,
    redirectTo,
    router,
    user,
  ]);

  if (isLoading || !isAuthenticated || !user) {
    return <AuthLoading />;
  }

  if (!hasAccess) {
    const target = redirectTo || getHomeRouteByRole(user.role);
    if (pathname === target || pathname.startsWith(`${target}/`)) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F7FB] p-6">
          <p className="max-w-md text-center text-sm text-slate-600">
            Votre profil ({user.role || "inconnu"}) n&apos;a pas accès à cette section. Contactez
            l&apos;administrateur RH.
          </p>
        </div>
      );
    }
    return <AuthLoading />;
  }

  return <>{children}</>;
}

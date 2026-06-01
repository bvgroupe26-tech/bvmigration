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
      return;
    }

    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace(target);
  }, [allowedRoles, hasAccess, isAuthenticated, isLoading, pathname, redirectTo, router, user]);

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated || !user) {
    return null;
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

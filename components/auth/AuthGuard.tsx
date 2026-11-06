"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getHomeRouteByRole, normalizeAppRole } from "@/lib/session";
import { canRoleAccessPath, hasEmployeePanelAccess, hasAdminPanelAccess } from "@/lib/roles";
import AccessDeniedHelp from "@/components/auth/AccessDeniedHelp";
import AuthLoading from "@/components/auth/AuthLoading";

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
};

function roleAllowed(
  userRole: string | undefined,
  allowedRoles: string[] | undefined,
  employeId?: number | null
): boolean {
  if (!allowedRoles?.length) return true;
  const normalized = normalizeAppRole(userRole);
  if (!normalized) return false;
  if (allowedRoles.includes(normalized)) return true;
  // RH / manager / admin rattaché à une fiche employé → espace /employee
  if (
    allowedRoles.includes("employee") &&
    hasEmployeePanelAccess(normalized, employeId) &&
    hasAdminPanelAccess(normalized)
  ) {
    return true;
  }
  return false;
}

function isPathMatch(pathname: string, target: string): boolean {
  return pathname === target || pathname.startsWith(`${target}/`);
}

/** Navigation complète : fiable sur mobile / PWA lors d'un changement de zone (admin ↔ employé). */
function hardNavigate(path: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(path);
}

export default function AuthGuard({ children, allowedRoles, redirectTo }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const redirectedRef = useRef(false);

  const hasAccess = roleAllowed(user?.role, allowedRoles, user?.employeId);
  const userHome = user ? getHomeRouteByRole(user.role) : "/login";
  const crossZoneTarget = redirectTo || userHome;

  useEffect(() => {
    redirectedRef.current = false;
  }, [pathname, user?.role]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || hasAccess) return;

    // Bonne route pour le rôle, mauvais layout encore monté (transition Next.js / PWA).
    if (canRoleAccessPath(user.role, pathname, user.employeId)) {
      hardNavigate(pathname);
      return;
    }

    // Cible de redirection atteinte sans accès : forcer l'accueil du rôle.
    if (isPathMatch(pathname, crossZoneTarget)) {
      if (!isPathMatch(pathname, userHome)) {
        hardNavigate(userHome);
        return;
      }
      hardNavigate(userHome);
      return;
    }

    if (redirectedRef.current) return;
    redirectedRef.current = true;

    // Changement de zone : navigation complète plutôt que router.replace (Safari / PWA).
    if (crossZoneTarget.startsWith("/employee") !== pathname.startsWith("/employee")) {
      hardNavigate(crossZoneTarget);
      return;
    }

    router.replace(crossZoneTarget);
  }, [
    crossZoneTarget,
    hasAccess,
    isAuthenticated,
    isLoading,
    pathname,
    redirectTo,
    router,
    user,
    userHome,
  ]);

  // Profil en cache : on affiche l'interface tout de suite et la session se revérifie en arrière-plan
  // (un serveur Render endormi peut mettre plus de 30 s à répondre). Sans profil, on attend.
  if (isLoading && !(isAuthenticated && user)) {
    return <AuthLoading />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!hasAccess) {
    if (normalizeAppRole(user.role) === "employee" && !pathname.startsWith("/employee")) {
      return <AccessDeniedHelp role={user.role} pathname={pathname} />;
    }
    return <AuthLoading />;
  }

  return <>{children}</>;
}

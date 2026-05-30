"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getHomeRouteByRole } from "@/lib/session";
import AuthLoading from "@/components/auth/AuthLoading";

type AuthGuardProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
};

export default function AuthGuard({ children, allowedRoles, redirectTo }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(redirectTo || getHomeRouteByRole(user.role));
    }
  }, [allowedRoles, isAuthenticated, isLoading, redirectTo, router, user]);

  if (isLoading || !isAuthenticated || !user) {
    return <AuthLoading />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AuthLoading />;
  }

  return <>{children}</>;
}

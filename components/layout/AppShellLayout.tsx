"use client";

import AdminAppShell from "@/components/layout/AdminAppShell";
import EmployeePanelGate from "@/components/layout/EmployeePanelGate";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";

export default function AppShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <AuthGuard allowedRoles={["admin", "manager", "rh"]} redirectTo="/employee/dashboard">
      <EmployeePanelGate>
        <AdminAppShell
          user={{
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role,
          }}
        >
          {children}
        </AdminAppShell>
      </EmployeePanelGate>
    </AuthGuard>
  );
}

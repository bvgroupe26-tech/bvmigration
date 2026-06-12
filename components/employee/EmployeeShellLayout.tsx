"use client";

import EmployeeMobileShell from "@/components/employee/EmployeeMobileShell";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";

export default function EmployeeShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <AuthGuard allowedRoles={["employee", "admin", "manager", "rh"]} redirectTo="/dashboard">
      <EmployeeMobileShell
        user={{
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
        }}
      >
        {children}
      </EmployeeMobileShell>
    </AuthGuard>
  );
}

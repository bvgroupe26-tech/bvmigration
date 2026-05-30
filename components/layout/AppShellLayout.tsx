import { redirect } from "next/navigation";
import AdminAppShell from "@/components/layout/AdminAppShell";
import EmployeePanelGate from "@/components/layout/EmployeePanelGate";
import { getSession } from "@/lib/auth";

export default async function AppShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "employee") redirect("/employee/dashboard");

  const user = {
    email: session.email,
    nom: session.nom,
    prenom: session.prenom,
    role: session.role,
  };

  return (
    <EmployeePanelGate>
      <AdminAppShell user={user}>{children}</AdminAppShell>
    </EmployeePanelGate>
  );
}

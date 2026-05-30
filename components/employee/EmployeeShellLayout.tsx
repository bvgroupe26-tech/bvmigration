import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import EmployeeMobileShell from "@/components/employee/EmployeeMobileShell";

export default async function EmployeeShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login?from=/employee/dashboard");
  if (session.role !== "employee") redirect("/dashboard");

  return (
    <EmployeeMobileShell
      user={{
        prenom: session.prenom,
        nom: session.nom,
        email: session.email,
      }}
    >
      {children}
    </EmployeeMobileShell>
  );
}

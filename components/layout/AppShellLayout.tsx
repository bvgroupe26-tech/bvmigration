import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import PageTransition from "@/components/layout/PageTransition";
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
      <div className="relative z-10 flex min-h-screen bg-[#F4F7FB]">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col bg-[#F8FAFC]">
          <Header />
          <main className="flex-1 px-6 py-6 sm:px-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </EmployeePanelGate>
  );
}

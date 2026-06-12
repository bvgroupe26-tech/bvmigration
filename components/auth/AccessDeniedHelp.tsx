"use client";

import { normalizeAppRole } from "@/lib/session";
import { isEmployeePath } from "@/lib/roles";

type AccessDeniedHelpProps = {
  role?: string | null;
  pathname: string;
};

export default function AccessDeniedHelp({ role, pathname }: AccessDeniedHelpProps) {
  const roleKey = normalizeAppRole(role);
  const onAdminPath = !isEmployeePath(pathname);

  if (roleKey === "employee" && onAdminPath) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F7FB] p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="font-display text-lg font-bold text-slate-900">Accès panneau RH refusé</h1>
          <p className="mt-3 text-sm text-slate-600">
            Votre compte est enregistré avec le rôle <strong>Employé</strong>. Ce rôle donne accès à
            l&apos;espace personnel (<code className="text-xs">/employee</code>), pas au panneau
            d&apos;administration.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Pour un membre du service RH : la <strong>fiche employé</strong> (salaire, masse salariale)
            et le <strong>rôle de connexion</strong> sont distincts. Il faut le rôle{" "}
            <strong>RH</strong>, tout en gardant la fiche employé pour la paie.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Demandez à un administrateur de passer votre rôle à « Ressources humaines » dans{" "}
            <strong>Administration → Comptes</strong>.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign("/employee/dashboard")}
            className="mt-5 rounded-xl bg-[#1B3A6B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2B5EA7]"
          >
            Aller à mon espace employé
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F7FB] p-6">
      <p className="max-w-md text-center text-sm text-slate-600">
        Votre profil ({role || "inconnu"}) n&apos;a pas accès à cette section. Contactez
        l&apos;administrateur RH.
      </p>
    </div>
  );
}

"use client";

import { Shield, UserCog, Users } from "lucide-react";
import StaffAccountForm from "@/components/admin/StaffAccountForm";
import AuthGuard from "@/components/auth/AuthGuard";
import GlassCard from "@/components/ui/GlassCard";
import { ADMIN_PANEL_ROLES, ROLE_LABELS } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import { normalizeAppRole } from "@/lib/session";

export default function AdministrationComptesPage() {
  const { user } = useAuth();
  const roleKey = normalizeAppRole(user?.role);

  return (
    <AuthGuard allowedRoles={["admin", "rh", "manager"]}>
      <div className="space-y-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2F5F9D]">Administration</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">
            Comptes Admin & RH
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Créez des accès au panneau de gestion RH (administrateur, responsable RH ou manager). Les
            employés disposent d&apos;un espace séparé créé depuis la fiche employé.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-[#2F5F9D]" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{ROLE_LABELS.admin}</p>
                <p className="mt-1 text-xs text-slate-500">Tous les modules + création de comptes admin.</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <UserCog className="h-5 w-5 text-[#2F5F9D]" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{ROLE_LABELS.rh}</p>
                <p className="mt-1 text-xs text-slate-500">Employés, paie, présences, budget, recrutement…</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-[#2F5F9D]" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{ROLE_LABELS.manager}</p>
                <p className="mt-1 text-xs text-slate-500">Pilotage et consultation (droits API).</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">Nouveau compte</h2>
          <p className="mt-1 text-sm text-slate-600">
            Connecté en tant que{" "}
            <span className="font-medium capitalize">
              {roleKey ? ROLE_LABELS[roleKey] : user?.role}
            </span>
            .
          </p>
          <div className="mt-6">
            <StaffAccountForm />
          </div>
        </GlassCard>

        <p className="text-xs text-slate-500">
          Panneau administration accessible aux rôles :{" "}
          {ADMIN_PANEL_ROLES.map((r) => ROLE_LABELS[r]).join(", ")}. Les comptes « Employé » utilisent
          l&apos;espace <code className="rounded bg-slate-100 px-1">/employee</code>.
        </p>
      </div>
    </AuthGuard>
  );
}

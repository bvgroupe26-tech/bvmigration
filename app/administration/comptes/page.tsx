"use client";

import { Shield, UserCog, Users } from "lucide-react";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import StaffAccountForm from "@/components/admin/StaffAccountForm";
import AuthGuard from "@/components/auth/AuthGuard";
import GlassCard from "@/components/ui/GlassCard";
import {
  ADMIN_PANEL_ROLES,
  canManageAdminUsers,
  canViewAdminUsers,
  ROLE_LABELS,
} from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import { normalizeAppRole } from "@/lib/session";

export default function AdministrationComptesPage() {
  const { user } = useAuth();
  const roleKey = normalizeAppRole(user?.role);
  const showUsersList = canViewAdminUsers(user?.role);
  const manageUsers = canManageAdminUsers(user?.role);

  return (
    <AuthGuard allowedRoles={["admin", "rh", "manager"]}>
      <div className="space-y-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2F5F9D]">Administration</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-slate-900">
            Comptes & utilisateurs
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Consultez tous les comptes (admin, RH, manager, employé), activez ou désactivez les accès,
            et créez de nouveaux comptes administration.
          </p>
        </div>

        {showUsersList ? (
          <GlassCard className="p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Tous les utilisateurs
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {manageUsers
                ? "Filtrez par rôle ou statut, modifiez les rôles et coupez l’accès sans supprimer le compte."
                : "Vue d’ensemble des comptes — modification réservée aux administrateurs."}
            </p>
            <div className="mt-6">
              <AdminUsersTable canManage={manageUsers} />
            </div>
          </GlassCard>
        ) : null}

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

        {(roleKey === "admin" || roleKey === "rh") && (
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
        )}

        <p className="text-xs text-slate-500">
          Panneau administration accessible aux rôles :{" "}
          {ADMIN_PANEL_ROLES.map((r) => ROLE_LABELS[r]).join(", ")}. Les comptes « Employé » utilisent
          l&apos;espace <code className="rounded bg-slate-100 px-1">/employee</code>.
        </p>
      </div>
    </AuthGuard>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShieldAlert, UserPen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import type { AdminUserRecord } from "@/lib/users-admin-api";
import { ROLE_LABELS, STAFF_ACCOUNT_ROLES } from "@/lib/roles";
import { normalizeAppRole, type AppRole } from "@/lib/session";
import { formatNotificationDate } from "@/lib/notifications";
import { getUserErrorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";
type RoleFilter = "all" | AppRole;

const ALL_ROLES: AppRole[] = ["admin", "rh", "manager", "employee"];

function roleBadgeClass(role: string): string {
  switch (role) {
    case "admin":
      return "bg-violet-100 text-violet-800";
    case "rh":
      return "bg-[#E8F0FA] text-[#1F3F73]";
    case "manager":
      return "bg-amber-100 text-amber-900";
    case "employee":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

type AdminUsersTableProps = {
  canManage: boolean;
};

export default function AdminUsersTable({ canManage }: AdminUsersTableProps) {
  const { user: currentUser } = useAuth();
  const { users, isLoading, error, setUserActive, setUserRole } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      if (roleFilter !== "all" && normalizeAppRole(u.role) !== roleFilter) return false;
      if (!q) return true;
      const hay = `${u.prenom} ${u.nom} ${u.email} ${u.role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, search, statusFilter, roleFilter]);

  async function handleToggleActive(target: AdminUserRecord, next: boolean) {
    if (!canManage) return;
    if (target.id === currentUser?.id && !next) {
      toast.error("Vous ne pouvez pas désactiver votre propre compte.");
      return;
    }
    setBusyId(target.id);
    try {
      await setUserActive(target.id, next);
      toast.success(next ? "Compte activé" : "Compte désactivé");
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Impossible de modifier le statut du compte."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(target: AdminUserRecord, role: string) {
    if (!canManage || role === target.role) return;
    if (target.id === currentUser?.id) {
      toast.error("Modifiez votre rôle depuis un autre compte administrateur.");
      return;
    }
    setBusyId(target.id);
    try {
      await setUserRole(target.id, role);
      const label = ROLE_LABELS[normalizeAppRole(role) ?? "employee"] ?? role;
      toast.success(`Rôle mis à jour : ${label}. La personne doit se déconnecter puis se reconnecter.`);
    } catch (err) {
      toast.error(getUserErrorMessage(err, "Impossible de modifier le rôle."));
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Chargement des utilisateurs…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Impossible de charger la liste des utilisateurs. Vérifiez vos droits administrateur.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, email…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2F5F9D] focus:ring-2 focus:ring-[#2F5F9D]/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "all" as const, label: "Tous" },
              { value: "active" as const, label: "Actifs" },
              { value: "inactive" as const, label: "Désactivés" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                statusFilter === opt.value
                  ? "border-[#2F5F9D] bg-[#2F5F9D] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#2F5F9D]"
        >
          <option value="all">Tous les rôles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {!canManage ? (
        <p className="text-xs text-slate-500">
          Consultation seule — seul un administrateur peut activer, désactiver ou modifier les rôles.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Dernière connexion</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Aucun utilisateur ne correspond à ces critères.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const roleKey = normalizeAppRole(u.role) ?? u.role;
                  const label =
                    ROLE_LABELS[roleKey as keyof typeof ROLE_LABELS] ?? u.role;
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        "transition hover:bg-slate-50/80",
                        !u.isActive && "bg-slate-50/50 opacity-80"
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {u.prenom} {u.nom}
                          {isSelf ? (
                            <span className="ml-2 text-[10px] font-medium text-[#2F5F9D]">
                              (vous)
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {canManage && !isSelf ? (
                          <select
                            value={roleKey}
                            disabled={busyId === u.id}
                            onChange={(e) => void handleRoleChange(u, e.target.value)}
                            className="max-w-[10rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium"
                          >
                            {STAFF_ACCOUNT_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                            <option value="employee">{ROLE_LABELS.employee}</option>
                          </select>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                              roleBadgeClass(roleKey)
                            )}
                          >
                            {label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            u.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {u.isActive ? "Actif" : "Désactivé"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u.lastLogin
                          ? formatNotificationDate(u.lastLogin)
                          : "Jamais connecté"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {u.employe_id ? (
                            <Link
                              href={`/employes/${u.employe_id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2F5F9D]/30 bg-[#E8F0FA] px-3 py-1.5 text-xs font-semibold text-[#1F3F73] transition hover:bg-[#2F5F9D] hover:text-white"
                              title="Modifier la fiche employé"
                            >
                              <UserPen className="h-3.5 w-3.5" />
                              Fiche
                            </Link>
                          ) : null}
                          {canManage ? (
                            <button
                              type="button"
                              disabled={busyId === u.id || (isSelf && u.isActive)}
                              onClick={() => void handleToggleActive(u, !u.isActive)}
                              className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
                                u.isActive
                                  ? "border border-red-200 text-red-700 hover:bg-red-50"
                                  : "border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                              )}
                            >
                              {busyId === u.id ? "…" : u.isActive ? "Désactiver" : "Activer"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          {filtered.length} utilisateur(s) affiché(s) sur {users.length}
        </p>
      </div>
    </div>
  );
}

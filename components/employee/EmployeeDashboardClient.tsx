"use client";

import Link from "next/link";
import { CalendarClock, Clock, FileText, Bell, ChevronRight, Wallet, Receipt } from "lucide-react";
import {
  useAbsenceBalance,
  useAuthMe,
  useEmployeMe,
  useMyNotifications,
  useMyPresences,
} from "@/hooks/employee";
import { getMonthBounds, PRESENCE_STATUT_LABELS } from "@/lib/presence-utils";
import { cn, getInitials, getAvatarGradient } from "@/lib/utils";
import { EmployeeError, EmployeeLoading } from "@/components/employee/EmployeeState";
import { localDateISO } from "@/lib/date-local";

const shortcuts = [
  {
    title: "Mes présences",
    description: "Pointages et historique du mois",
    href: "/employee/presence",
    icon: Clock,
    color: "bg-sky-50 text-sky-700",
  },
  {
    title: "Demander un congé",
    description: "Nouvelle demande ou suivi",
    href: "/employee/leaves",
    icon: CalendarClock,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Mes documents",
    description: "Contrats, attestations, bulletins",
    href: "/employee/documents",
    icon: FileText,
    color: "bg-[#E8F0FA] text-[#2F5F9D]",
  },
  {
    title: "Mes bulletins",
    description: "Bulletins de paie payés, en PDF",
    href: "/employee/paie",
    icon: Wallet,
    color: "bg-violet-50 text-violet-700",
  },
  {
    title: "Notes de frais",
    description: "Déclarer et suivre mes dépenses",
    href: "/employee/depenses",
    icon: Receipt,
    color: "bg-rose-50 text-rose-700",
  },
  {
    title: "Notifications",
    description: "Dernières mises à jour RH",
    href: "/employee/notifications",
    icon: Bell,
    color: "bg-amber-50 text-amber-700",
  },
];

export default function EmployeeDashboardClient() {
  const { user, isLoading: loadingUser, error: userError } = useAuthMe();
  const { employe } = useEmployeMe();
  const { balance, isLoading: loadingBalance, error: balanceError } = useAbsenceBalance();
  const { unreadCount } = useMyNotifications();
  const now = new Date();
  const monthBounds = getMonthBounds(now.getFullYear(), now.getMonth() + 1);
  const { presences, isLoading: loadingPresences } = useMyPresences({
    date_from: monthBounds.date_from,
    date_to: monthBounds.date_to,
    limit: 31,
  });
  const today = localDateISO(now);
  const todayPresence = presences.find((p) => p.date === today);

  if (loadingUser) return <EmployeeLoading />;

  const display = employe ?? user;
  const initials = getInitials(display?.nom ?? "", display?.prenom);
  const gradient = getAvatarGradient(`${display?.prenom ?? ""}${display?.nom ?? ""}`);

  return (
    <div className="space-y-5">
      {(userError || balanceError) && (
        <EmployeeError message="Certaines données n'ont pas pu être chargées." />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-lg font-bold text-white shadow-sm",
              gradient
            )}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Bonjour</p>
            <h1 className="truncate font-display text-xl font-bold text-slate-900">
              {display?.prenom} {display?.nom}
            </h1>
            <p className="truncate text-xs text-slate-500">
              {employe?.poste ?? user?.poste ?? "Collaborateur"}
              {employe?.matricule || user?.matricule
                ? ` · ${employe?.matricule ?? user?.matricule}`
                : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Congés restants
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1F3F73]">
            {loadingBalance ? "…" : (balance?.restant ?? balance?.soldeRestant ?? "—")}
          </p>
          {!loadingBalance && balance && (
            <p className="mt-1 text-[11px] text-slate-500">
              {balance.en_attente} j. en attente
            </p>
          )}
        </div>
        <Link
          href="/employee/presence"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#2F5F9D]/30"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Aujourd&apos;hui
          </p>
          <p className="mt-1 font-display text-lg font-bold text-[#1F3F73]">
            {loadingPresences
              ? "…"
              : todayPresence
                ? PRESENCE_STATUT_LABELS[todayPresence.statut] ?? todayPresence.statut
                : "Non pointé"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {presences.length} jour(s) ce mois
          </p>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Notifications
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1F3F73]">{unreadCount}</p>
          <p className="mt-1 text-[11px] text-slate-500">non lues</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Présences du mois
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-[#1F3F73]">
            {loadingPresences ? "…" : presences.filter((p) => p.statut === "present" || p.statut === "retard").length}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">jours présents / retard</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Accès rapide
        </h2>
        <div className="space-y-2">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99] hover:border-[#2F5F9D]/30"
              >
                <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", item.color)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import SectionHeader from "@/components/ui/SectionHeader";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/roles";
import { useAdminUsers } from "@/hooks/api";
import type { AdminUserRecord } from "@/lib/users-admin-api";

const ROLE_CONFIG: Record<string, { label: string; pill: string; dot: string; glow: string }> = {
  admin: {
    label: ROLE_LABELS.admin,
    pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
    glow: "shadow-[0_0_10px_rgba(99,102,241,0.25)]",
  },
  rh: {
    label: ROLE_LABELS.rh,
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_10px_rgba(16,185,129,0.25)]",
  },
  manager: {
    label: ROLE_LABELS.manager,
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    glow: "shadow-[0_0_10px_rgba(245,158,11,0.25)]",
  },
};

function formatLastLogin(lastLogin: string | null): string {
  if (!lastLogin) return "Jamais connecté";
  const ms = Date.now() - new Date(lastLogin).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Hier";
  if (d < 30) return `Il y a ${d} j`;
  return new Date(lastLogin).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function StaffCard({ user, index }: { user: AdminUserRecord; index: number }) {
  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.manager;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={cn(
        "group relative flex flex-col items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-5 text-center",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md",
        user.isActive && cfg.glow
      )}
    >
      {/* Avatar + statut en ligne */}
      <div className="relative">
        <Avatar nom={user.nom} prenom={user.prenom} size="lg" />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
            user.isActive
              ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
              : "bg-slate-300"
          )}
        />
      </div>

      {/* Nom */}
      <div className="min-w-0 w-full space-y-1.5">
        <p className="truncate font-semibold text-slate-900 text-sm leading-tight">
          {user.prenom} {user.nom}
        </p>

        {/* Badge rôle */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
            cfg.pill
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
          {cfg.label}
        </span>
      </div>

      {/* Dernière connexion */}
      <p className="text-[11px] text-slate-400 leading-none">{formatLastLogin(user.lastLogin)}</p>

      {/* Lien vers la fiche (admin seulement, visible au hover) */}
      <Link
        href="/administration/comptes"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-400 opacity-0 shadow-sm transition group-hover:opacity-100 hover:border-slate-200 hover:text-[#2F5F9D]"
        title="Gérer le compte"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}

export default function EquipeDirection() {
  const { users, isLoading, error } = useAdminUsers();

  const staff = users.filter((u) => ["admin", "rh", "manager"].includes(u.role));

  // Masquer silencieusement si l'utilisateur n'a pas accès (403) ou si vide
  if (!isLoading && (error || staff.length === 0)) return null;

  const subtitle = isLoading
    ? "Chargement…"
    : `${staff.length} membre${staff.length > 1 ? "s" : ""} de l'équipe administrative`;

  return (
    <GlassCard className="p-6 bg-gradient-to-br from-slate-50/80 to-white">
      <SectionHeader
        title="Équipe de direction"
        subtitle={subtitle}
        actions={
          <Link href="/administration/comptes">
            <Button variant="ghost" size="sm">
              Gérer →
            </Button>
          </Link>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))
          : staff.map((user, i) => <StaffCard key={user.id} user={user} index={i} />)}
      </div>
    </GlassCard>
  );
}

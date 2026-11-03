"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Briefcase, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasDualRole, isEmployeePath, rememberWorkspace, type Workspace } from "@/lib/roles";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  /** `light` : en-tête blanc ; `dark` : sidebar bleue ; `drawer` : ligne du menu mobile. */
  variant?: "light" | "dark" | "drawer";
  className?: string;
};

const TARGET: Record<Workspace, { href: string; label: string; short: string }> = {
  rh: { href: "/dashboard", label: "Espace RH", short: "Espace RH" },
  employee: { href: "/employee/dashboard", label: "Mon espace employé", short: "Mon espace" },
};

/** Bascule Espace RH ↔ Mon espace employé, affichée seulement pour un staff qui a une fiche employé. */
export default function WorkspaceSwitcher({ variant = "light", className }: WorkspaceSwitcherProps) {
  const { user } = useAuth();
  const pathname = usePathname() || "/";
  const current: Workspace = isEmployeePath(pathname) ? "employee" : "rh";
  const dual = hasDualRole(user?.role, user?.employeId);

  useEffect(() => {
    if (dual) rememberWorkspace(current);
  }, [dual, current]);

  if (!dual) return null;

  const target: Workspace = current === "rh" ? "employee" : "rh";
  const Icon = target === "employee" ? UserRound : Briefcase;
  const { href, label, short } = TARGET[target];

  function go() {
    rememberWorkspace(target);
    // Navigation complète : changement de layout fiable sur mobile / PWA (comme AuthGuard).
    window.location.assign(href);
  }

  return (
    <button
      type="button"
      onClick={go}
      title={`Basculer vers : ${label}`}
      aria-label={`Basculer vers : ${label}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl text-xs font-semibold transition",
        variant === "light" &&
          "h-10 border border-slate-200 px-3 text-[#2F5F9D] hover:bg-[#E8F0FA]",
        variant === "dark" &&
          "w-full px-3 py-2 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/10 hover:text-white",
        variant === "drawer" &&
          "w-full px-4 py-3 text-sm text-[#1F3F73] ring-1 ring-slate-200 hover:bg-[#E8F0FA]",
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {variant === "light" ? (
        <>
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{short}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

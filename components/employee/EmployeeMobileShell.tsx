"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import BottomNavBar from "@/components/layout/BottomNavBar";
import NotificationsBell from "@/components/notifications/NotificationsBell";
import { EMPLOYEE_MOBILE_TABS, EMPLOYEE_NAV, getEmployeePageTitle, isNavActive } from "@/lib/nav-config";
import { useAuth } from "@/context/AuthContext";
import { cn, getAvatarGradient, getInitials } from "@/lib/utils";

type EmployeeMobileShellProps = {
  user: {
    prenom: string;
    nom: string;
    email: string;
  };
  children: React.ReactNode;
};

export default function EmployeeMobileShell({ user, children }: EmployeeMobileShellProps) {
  const pathname = usePathname() || "/employee/dashboard";
  const router = useRouter();
  const { logout } = useAuth();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const title = getEmployeePageTitle(pathname);

  useEffect(() => {
    const logLayout = () => {
      const el = mainContentRef.current;
      const rect = el?.getBoundingClientRect();
      // #region agent log
      fetch("http://127.0.0.1:7884/ingest/82698950-066a-4e8e-9d55-0959df3d765c", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cd157f" },
        body: JSON.stringify({
          sessionId: "cd157f",
          runId: "pre-fix",
          hypothesisId: "R1-R3",
          location: "EmployeeMobileShell.tsx:layout",
          message: "viewport vs content width",
          data: {
            innerWidth: window.innerWidth,
            contentWidth: rect?.width ?? null,
            contentLeft: rect?.left ?? null,
            lgBreakpoint: window.matchMedia("(min-width: 1024px)").matches,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };
    logLayout();
    window.addEventListener("resize", logLayout);
    return () => window.removeEventListener("resize", logLayout);
  }, [pathname]);
  const initials = getInitials(user.nom, user.prenom);
  const gradient = getAvatarGradient(`${user.prenom}${user.nom}`);

  async function handleLogout() {
    try {
      await logout();
      toast.success("À bientôt");
      router.refresh();
    } catch {
      await logout();
    }
  }

  return (
    <div className="flex min-h-[100dvh] bg-[#F8FAFC] lg:h-[100dvh] lg:overflow-hidden">
      {/* Sidebar desktop — fixe, seul le contenu défile */}
      <aside className="shell-sidebar hidden w-[260px] shrink-0 flex-col overflow-hidden bg-[#1F3F73] text-white shadow-[4px_0_24px_rgba(15,23,42,0.12)] lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:h-[100dvh]">
        <div className="border-b border-white/10 px-6 py-6">
          <Link href="/employee/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
              <Image src="/logo.png" alt="BV Group" width={30} height={30} className="rounded-md bg-white p-0.5" />
            </div>
            <div>
              <p className="font-display text-base font-bold leading-tight">BV Groupe</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">Espace employé</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="space-y-0.5">
            {EMPLOYEE_NAV.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active ? "bg-white/12 text-white ring-1 ring-white/10" : "text-white/65 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="employee-sidebar-bar"
                        className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-[#F2C94C]"
                      />
                    )}
                    <Icon className={cn("h-[18px] w-[18px]", active ? "text-[#F2C94C]" : "text-white/45")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/employee/profile"
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  pathname.startsWith("/employee/profile")
                    ? "bg-white/12 text-white ring-1 ring-white/10"
                    : "text-white/65 hover:bg-white/8 hover:text-white"
                )}
              >
                <User className={cn("h-[18px] w-[18px]", pathname.startsWith("/employee/profile") ? "text-[#F2C94C]" : "text-white/45")} />
                Mon profil
              </Link>
            </li>
          </ul>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display text-sm font-bold text-white",
                gradient
              )}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user.prenom} {user.nom}
              </p>
              <p className="truncate text-xs text-white/50">Employé</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Colonne principale — scroll indépendant sur desktop */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-[260px] lg:h-[100dvh] lg:overflow-hidden">
        <header className="no-print shrink-0 border-b border-slate-200/90 bg-white/95 pt-safe backdrop-blur-md lg:static">
          <div className="shell-content mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:h-16">
            <div className="flex min-w-0 items-center gap-2.5 lg:gap-3">
              <Image
                src="/logo.png"
                alt="BV Group"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-xl shadow-sm ring-1 ring-slate-200 lg:hidden"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold text-[#1F3F73] sm:text-lg">{title}</p>
                <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                  {user.prenom} {user.nom} · BV Groupe
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationsBell context="employee" />
              <Link
                href="/employee/profile"
                className={cn(
                  "hidden h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br font-display text-sm font-bold text-white shadow-sm ring-2 ring-white sm:inline-flex lg:hidden",
                  gradient
                )}
                aria-label="Mon profil"
              >
                {initials}
              </Link>
              <Link
                href="/employee/profile"
                className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-[#2F5F9D] transition hover:bg-[#E8F0FA] lg:inline-flex"
              >
                Mon profil
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:h-10 sm:w-10"
                aria-label="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="shell-main min-h-0 flex-1 overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain">
          <div
            ref={mainContentRef}
            className="shell-content mx-auto w-full max-w-lg lg:max-w-4xl xl:max-w-5xl"
          >
            {children}
          </div>
        </main>
      </div>

      <BottomNavBar
        className="lg:hidden"
        items={EMPLOYEE_MOBILE_TABS}
        pathname={pathname}
      />
    </div>
  );
}

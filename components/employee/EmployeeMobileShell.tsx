"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, CalendarClock, Clock, FileText, Bell, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { clearAuthToken } from "@/lib/api-client";
import { apiClient } from "@/lib/fetcher";

type EmployeeMobileShellProps = {
  user: {
    prenom: string;
    nom: string;
    email: string;
  };
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/employee/dashboard", label: "Accueil", icon: Home },
  { href: "/employee/presence", label: "Présence", icon: Clock },
  { href: "/employee/leaves", label: "Congés", icon: CalendarClock },
  { href: "/employee/documents", label: "Docs", icon: FileText },
  { href: "/employee/notifications", label: "Alertes", icon: Bell },
  { href: "/employee/profile", label: "Profil", icon: User },
] as const;

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/employee/presence")) return "Mes présences";
  if (pathname.startsWith("/employee/leaves")) return "Mes congés";
  if (pathname.startsWith("/employee/documents")) return "Mes documents";
  if (pathname.startsWith("/employee/paie")) return "Bulletin de paie";
  if (pathname.startsWith("/employee/notifications")) return "Notifications";
  if (pathname.startsWith("/employee/profile")) return "Mon profil";
  return "Accueil";
}

export default function EmployeeMobileShell({ user, children }: EmployeeMobileShellProps) {
  const pathname = usePathname() || "/employee/dashboard";
  const router = useRouter();
  const title = getPageTitle(pathname);

  async function handleLogout() {
    try {
      await apiClient.post("/auth/logout");
      await clearAuthToken();
      toast.success("À bientôt");
      router.push("/login");
      router.refresh();
    } catch {
      await clearAuthToken();
      router.push("/login");
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F8FAFC]">
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="BV Group"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-xl shadow-sm ring-1 ring-slate-200"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold text-[#1F3F73]">{title}</p>
              <p className="truncate text-[11px] text-slate-500">{user.prenom} · BV Group</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 py-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] print:max-w-none print:px-0 print:pb-0">
        {children}
      </main>

      <nav
        className="no-print fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navigation principale"
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/employee/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[9px] font-semibold transition",
                  isActive ? "text-[#2F5F9D]" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-xl transition",
                    isActive ? "bg-[#E8F0FA] text-[#2F5F9D]" : "bg-transparent"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

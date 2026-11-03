"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { ADMIN_NAV, isNavActive } from "@/lib/nav-config";
import { filterNavForRole } from "@/lib/roles";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";
import { cn, getInitials, getAvatarGradient } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useProfilePhoto } from "@/hooks/useProfilePhoto";
import { getUserErrorMessage } from "@/lib/fetcher";

type NavItem = {
  href: string;
  label: string;
  icon: (typeof ADMIN_NAV)[number]["icon"];
  isSubItem?: boolean;
};

type SidebarProps = {
  user?: {
    email: string;
    nom: string;
    prenom: string;
    role: string;
  };
  /** Layout bureau (web large ou PWA desktop) — affiche la sidebar fixe */
  desktop?: boolean;
  className?: string;
};

export default function Sidebar({ user, desktop = false, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { photoUrl } = useProfilePhoto();
  const navItems: NavItem[] = filterNavForRole(ADMIN_NAV, user?.role);

  async function handleLogout() {
    try {
      await logout();
      toast.success("À bientôt");
      router.refresh();
    } catch (err) {
      toast.error(getUserErrorMessage(err));
    }
  }

  const initials = user ? getInitials(user.nom, user.prenom) : "RH";
  const gradient = user
    ? getAvatarGradient(`${user.prenom}${user.nom}`)
    : "from-[#2F5F9D] to-[#1F3F73]";

  return (
    <aside
      className={cn(
        "shell-sidebar z-30 w-[260px] shrink-0 overflow-hidden bg-[#1F3F73] text-white shadow-[4px_0_24px_rgba(15,23,42,0.12)]",
        desktop
          ? "fixed inset-y-0 left-0 flex h-[100dvh] flex-col"
          : "hidden",
        className
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="px-6 pt-7 pb-5">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
              <Image
                src="/logo.png"
                alt="BV Group"
                width={30}
                height={30}
                className="h-[30px] w-[30px] rounded-md bg-white p-0.5"
              />
            </div>
            <div className="flex min-h-[34px] flex-col justify-center gap-1">
              <span className="font-display text-[17px] leading-tight font-bold tracking-tight text-white">
                BV GROUPE
              </span>
              <span className="text-[11px] leading-tight font-semibold uppercase tracking-[0.14em] text-white/55">
                Gestion RH
              </span>
            </div>
          </Link>
        </div>

        <div className="px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-[#F2C94C]/50 to-transparent" />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Navigation
          </p>
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(pathname ?? "", item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      item.isSubItem && "ml-4 text-[13px]",
                      isActive
                        ? "bg-white/12 text-white ring-1 ring-white/10"
                        : "text-white/65 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-bar"
                        className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-[#F2C94C]"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        isActive ? "text-[#F2C94C]" : "text-white/45 group-hover:text-white/75"
                      )}
                      strokeWidth={2}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <WorkspaceSwitcher variant="dark" className="mb-3" />
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/8",
                pathname.startsWith("/profile") && "bg-white/10 ring-1 ring-white/10"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-display text-sm font-bold text-white ring-2 ring-white/20",
                  !photoUrl && gradient
                )}
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user ? `${user.prenom} ${user.nom}` : "Admin RH"}
                </p>
                <p className="truncate text-xs capitalize text-white/50">{user?.role ?? "admin"}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-lg p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

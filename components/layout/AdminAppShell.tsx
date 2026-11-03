"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BottomNavBar from "@/components/layout/BottomNavBar";
import MobileNavDrawer from "@/components/layout/MobileNavDrawer";
import PageTransition from "@/components/layout/PageTransition";
import { ADMIN_MOBILE_DRAWER, ADMIN_MOBILE_TABS } from "@/lib/nav-config";
import { useDesktopAdminShell } from "@/hooks/useDesktopAdminShell";
import { filterNavForRole } from "@/lib/roles";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type AdminAppShellProps = {
  user: {
    email: string;
    nom: string;
    prenom: string;
    role: string;
  };
  children: React.ReactNode;
};

export default function AdminAppShell({ user, children }: AdminAppShellProps) {
  const pathname = usePathname() || "/dashboard";
  const [menuOpen, setMenuOpen] = useState(false);
  const desktop = useDesktopAdminShell();

  const bottomItems = filterNavForRole(ADMIN_MOBILE_TABS, user.role).map((item) =>
    item.href === "#menu" ? { ...item, onClick: () => setMenuOpen(true) } : item
  );

  return (
    <div
      className={cn(
        "relative z-10 flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F4F7FB]",
        desktop && "min-h-0"
      )}
    >
      <Sidebar user={user} desktop={desktop} />

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F8FAFC] print:ml-0",
          desktop && "ml-[260px]"
        )}
      >
        <main className="shell-scroll min-h-0 flex-1 overflow-x-hidden">
          <Header desktop={desktop} />
          <div className="shell-main shell-content mx-auto w-full max-w-7xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {!desktop && (
        <>
          <BottomNavBar items={bottomItems} pathname={pathname} ariaLabel="Navigation admin" />
          <MobileNavDrawer
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={filterNavForRole(ADMIN_MOBILE_DRAWER, user.role)}
            title="Modules RH"
          />
        </>
      )}
    </div>
  );
}

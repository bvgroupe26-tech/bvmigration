"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BottomNavBar from "@/components/layout/BottomNavBar";
import MobileNavDrawer from "@/components/layout/MobileNavDrawer";
import PageTransition from "@/components/layout/PageTransition";
import { ADMIN_MOBILE_DRAWER, ADMIN_MOBILE_TABS } from "@/lib/nav-config";
import { usePathname } from "next/navigation";

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

  const bottomItems = ADMIN_MOBILE_TABS.map((item) =>
    item.href === "#menu" ? { ...item, onClick: () => setMenuOpen(true) } : item
  );

  return (
    <div className="relative z-10 flex min-h-[100dvh] bg-[#F4F7FB] lg:h-[100dvh] lg:overflow-hidden">
      <Sidebar user={user} className="hidden lg:flex" />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F8FAFC] lg:ml-[260px] lg:h-[100dvh] lg:overflow-hidden">
        <Header />
        <main className="shell-main min-h-0 flex-1 overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain">
          <div className="shell-content mx-auto w-full max-w-7xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      <BottomNavBar
        className="lg:hidden"
        items={bottomItems}
        pathname={pathname}
        ariaLabel="Navigation admin"
      />

      <MobileNavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={ADMIN_MOBILE_DRAWER}
        title="Modules RH"
      />
    </div>
  );
}

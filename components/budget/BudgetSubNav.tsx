"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Tags, FolderOpen, Receipt, Building2, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { normalizeAppRole } from "@/lib/session";

const LINKS = [
  { href: "/budget", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/budget/depenses", label: "Dépenses", icon: Receipt },
  { href: "/budget/enveloppes", label: "Enveloppes", icon: FolderOpen },
  { href: "/budget/categories", label: "Catégories", icon: Tags },
  { href: "/budget/fournisseurs", label: "Fournisseurs", icon: Building2 },
];

export default function BudgetSubNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = normalizeAppRole(user?.role) === "admin";
  const links = isAdmin
    ? [...LINKS, { href: "/parametres/finance", label: "Paramètres", icon: Settings }]
    : LINKS;

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/budget" && pathname?.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bv-tab-active" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

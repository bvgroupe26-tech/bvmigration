"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  isSubItem?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "🏠 Dashboard" },
  { href: "/employes", label: "👥 Employés" },
  { href: "/presence", label: "⏱️ Présence" },
  { href: "/presence/absences", label: "↳ Absences", isSubItem: true },
  { href: "/paie", label: "💰 Paie" },
  { href: "/recrutement", label: "📋 Recrutement" },
  { href: "/competences", label: "🎓 Compétences" },
  { href: "/competences/evaluations", label: "↳ Évaluations", isSubItem: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] bg-[#1B3A6B] text-white fixed left-0 top-0 h-screen overflow-hidden">
      <div className="p-6">
        <h1 className="text-[20px] font-bold text-white">BV GROUPE</h1>
        <p className="text-[#4A90D9] text-sm mt-1">Gestion RH</p>

        <div className="h-px bg-white/20 my-6" />

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 transition-colors ${
                  item.isSubItem ? "ml-4 text-sm" : ""
                } ${
                  isActive
                    ? "bg-[#2563C7] text-white"
                    : "text-white hover:bg-[rgba(255,255,255,0.1)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

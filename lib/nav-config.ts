import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarOff,
  Wallet,
  Briefcase,
  GraduationCap,
  ChartLine,
  BarChart3,
  Landmark,
  Home,
  CalendarClock,
  FileText,
  Bell,
  User,
  Menu,
  Shield,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  isSubItem?: boolean;
};

export const EMPLOYEE_NAV: NavItem[] = [
  { href: "/employee/dashboard", label: "Accueil", shortLabel: "Accueil", icon: Home },
  { href: "/employee/presence", label: "Présence", shortLabel: "Présence", icon: Clock },
  { href: "/employee/leaves", label: "Congés", shortLabel: "Congés", icon: CalendarClock },
  { href: "/employee/documents", label: "Documents", shortLabel: "Docs", icon: FileText },
  { href: "/employee/notifications", label: "Notifications", shortLabel: "Alertes", icon: Bell },
];

/** Barre du bas PWA employé (mobile) — alertes accessibles en un tap */
export const EMPLOYEE_MOBILE_TABS: NavItem[] = [
  { href: "/employee/dashboard", label: "Accueil", shortLabel: "Accueil", icon: Home },
  { href: "/employee/presence", label: "Présence", shortLabel: "Présence", icon: Clock },
  { href: "/employee/leaves", label: "Congés", shortLabel: "Congés", icon: CalendarClock },
  { href: "/employee/documents", label: "Documents", shortLabel: "Docs", icon: FileText },
  { href: "/employee/notifications", label: "Notifications", shortLabel: "Alertes", icon: Bell },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/employes", label: "Employés", icon: Users },
  { href: "/administration/comptes", label: "Comptes Admin & RH", icon: Shield, isSubItem: true },
  { href: "/employes/postes", label: "Postes", icon: Briefcase, isSubItem: true },
  { href: "/presence", label: "Présence", icon: Clock },
  { href: "/presence/absences", label: "Absences", icon: CalendarOff, isSubItem: true },
  { href: "/paie", label: "Paie", icon: Wallet },
  { href: "/budget", label: "Budget", icon: Landmark },
  { href: "/recrutement", label: "Recrutement", icon: Briefcase },
  { href: "/competences", label: "Compétences", icon: GraduationCap },
  { href: "/competences/evaluations", label: "Évaluations", icon: ChartLine, isSubItem: true },
  { href: "/profile", label: "Mon profil", icon: User },
];

/** Onglets barre du bas admin (mobile / PWA) */
export const ADMIN_MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Accueil", icon: LayoutDashboard },
  { href: "/employes", label: "Employés", shortLabel: "Employés", icon: Users },
  { href: "/presence", label: "Présence", shortLabel: "Présence", icon: Clock },
  { href: "/paie", label: "Paie", shortLabel: "Paie", icon: Wallet },
  { href: "#menu", label: "Menu", shortLabel: "Menu", icon: Menu },
];

/** Entrées du tiroir « Menu » admin mobile */
export const ADMIN_MOBILE_DRAWER: NavItem[] = [
  { href: "/profile", label: "Mon profil", icon: User },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/employes/postes", label: "Postes", icon: Briefcase },
  { href: "/administration/comptes", label: "Comptes Admin & RH", icon: Shield },
  { href: "/presence/absences", label: "Absences", icon: CalendarOff },
  { href: "/budget", label: "Budget", icon: Landmark },
  { href: "/recrutement", label: "Recrutement", icon: Briefcase },
  { href: "/competences", label: "Compétences", icon: GraduationCap },
  { href: "/competences/evaluations", label: "Évaluations", icon: ChartLine },
];

export function getEmployeePageTitle(pathname: string): string {
  if (pathname.startsWith("/employee/presence")) return "Mes présences";
  if (pathname.startsWith("/employee/leaves")) return "Mes congés";
  if (pathname.startsWith("/employee/documents")) return "Mes documents";
  if (pathname.startsWith("/employee/paie")) return "Bulletin de paie";
  if (pathname.startsWith("/employee/notifications")) return "Notifications";
  if (pathname.startsWith("/employee/profile")) return "Mon profil";
  return "Accueil";
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "#menu") return false;
  if (href === "/dashboard" || href === "/employee/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

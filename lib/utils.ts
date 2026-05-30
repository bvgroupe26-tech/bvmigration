import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export { getUserErrorMessage } from "@/lib/api-errors";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFCFA(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} FCFA`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function getInitials(nom: string, prenom?: string | null): string {
  const first = (prenom ?? "").trim().charAt(0).toUpperCase();
  const last = (nom ?? "").trim().charAt(0).toUpperCase();
  return `${first}${last}` || "?";
}

const AVATAR_GRADIENTS = [
  "from-[#2F5F9D] to-[#1F3F73]",
  "from-[#1F3F73] to-[#2F5F9D]",
  "from-[#2F5F9D] to-[#3d7ab8]",
  "from-[#1F3F73] to-[#152d52]",
  "from-emerald-600 to-emerald-700",
  "from-amber-600 to-[#92710C]",
  "from-slate-600 to-slate-700",
  "from-[#2F5F9D] to-emerald-700",
];

export function getAvatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

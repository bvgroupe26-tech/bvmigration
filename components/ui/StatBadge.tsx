"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant =
  | "actif"
  | "inactif"
  | "suspendu"
  | "present"
  | "absent"
  | "retard"
  | "conge"
  | "mission"
  | "en_attente"
  | "approuve"
  | "refuse"
  | "paye"
  | "annule"
  | "ouverte"
  | "fermee"
  | "clos"
  | "brouillon"
  | "pourvue"
  | "recu"
  | "en_cours"
  | "retenu"
  | "rejete"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

type VariantStyle = {
  text: string;
  bg: string;
  glow: string;
  dot?: string;
  pulse?: boolean;
};

const VARIANTS: Record<Variant, VariantStyle> = {
  actif: {
    text: "text-emerald-800",
    bg: "bg-emerald-50 border-emerald-200",
    glow: "shadow-sm",
    dot: "bg-emerald-500",
    pulse: true,
  },
  present: {
    text: "text-emerald-800",
    bg: "bg-emerald-50 border-emerald-200",
    glow: "shadow-sm",
    dot: "bg-emerald-500",
    pulse: true,
  },
  approuve: {
    text: "text-emerald-800",
    bg: "bg-emerald-50 border-emerald-200",
    glow: "shadow-sm",
    dot: "bg-emerald-500",
  },
  paye: {
    text: "text-emerald-800",
    bg: "bg-emerald-50 border-emerald-200",
    glow: "shadow-sm",
    dot: "bg-emerald-500",
  },
  pourvue: {
    text: "text-emerald-800",
    bg: "bg-emerald-50 border-emerald-200",
    glow: "shadow-sm",
    dot: "bg-emerald-500",
  },
  retenu: {
    text: "text-emerald-800",
    bg: "bg-emerald-50 border-emerald-200",
    glow: "shadow-sm",
    dot: "bg-emerald-500",
  },
  success: {
    text: "text-emerald-800",
    bg: "bg-emerald-50 border-emerald-200",
    glow: "shadow-sm",
    dot: "bg-emerald-500",
  },
  inactif: {
    text: "text-slate-700",
    bg: "bg-slate-100 border-slate-200",
    glow: "",
    dot: "bg-slate-400",
  },
  fermee: {
    text: "text-slate-700",
    bg: "bg-slate-100 border-slate-200",
    glow: "",
    dot: "bg-slate-400",
  },
  clos: {
    text: "text-slate-700",
    bg: "bg-slate-100 border-slate-200",
    glow: "",
    dot: "bg-slate-500",
  },
  brouillon: {
    text: "text-slate-600",
    bg: "bg-slate-50 border-slate-200 border-dashed",
    glow: "",
    dot: "bg-slate-400",
  },
  neutral: {
    text: "text-slate-700",
    bg: "bg-slate-100 border-slate-200",
    glow: "",
    dot: "bg-slate-400",
  },
  suspendu: {
    text: "text-amber-900",
    bg: "bg-amber-50 border-amber-200",
    glow: "shadow-sm",
    dot: "bg-amber-500",
  },
  retard: {
    text: "text-amber-900",
    bg: "bg-amber-50 border-amber-200",
    glow: "shadow-sm",
    dot: "bg-amber-500",
  },
  en_attente: {
    text: "text-amber-900",
    bg: "bg-amber-50 border-amber-200",
    glow: "shadow-sm",
    dot: "bg-amber-500",
    pulse: true,
  },
  en_cours: {
    text: "text-amber-900",
    bg: "bg-amber-50 border-amber-200",
    glow: "shadow-sm",
    dot: "bg-amber-500",
  },
  warning: {
    text: "text-amber-900",
    bg: "bg-amber-50 border-amber-200",
    glow: "shadow-sm",
    dot: "bg-amber-500",
  },
  absent: {
    text: "text-red-800",
    bg: "bg-red-50 border-red-200",
    glow: "shadow-sm",
    dot: "bg-red-500",
  },
  refuse: {
    text: "text-red-800",
    bg: "bg-red-50 border-red-200",
    glow: "shadow-sm",
    dot: "bg-red-500",
  },
  annule: {
    text: "text-red-800",
    bg: "bg-red-50 border-red-200",
    glow: "shadow-sm",
    dot: "bg-red-500",
  },
  rejete: {
    text: "text-red-800",
    bg: "bg-red-50 border-red-200",
    glow: "shadow-sm",
    dot: "bg-red-500",
  },
  danger: {
    text: "text-red-800",
    bg: "bg-red-50 border-red-200",
    glow: "shadow-sm",
    dot: "bg-red-500",
  },
  conge: {
    text: "text-[#1F3F73]",
    bg: "bg-[#E8F0FA] border-[#2F5F9D]/20",
    glow: "shadow-sm",
    dot: "bg-[#2F5F9D]",
  },
  mission: {
    text: "text-[#1F3F73]",
    bg: "bg-[#E8F0FA] border-[#2F5F9D]/20",
    glow: "shadow-sm",
    dot: "bg-[#1F3F73]",
  },
  ouverte: {
    text: "text-[#1F3F73]",
    bg: "bg-[#E8F0FA] border-[#2F5F9D]/20",
    glow: "shadow-sm",
    dot: "bg-[#2F5F9D]",
    pulse: true,
  },
  recu: {
    text: "text-[#1F3F73]",
    bg: "bg-[#E8F0FA] border-[#2F5F9D]/20",
    glow: "shadow-sm",
    dot: "bg-[#2F5F9D]",
  },
  info: {
    text: "text-[#1F3F73]",
    bg: "bg-[#E8F0FA] border-[#2F5F9D]/20",
    glow: "shadow-sm",
    dot: "bg-[#2F5F9D]",
  },
};

type StatBadgeProps = {
  variant?: Variant;
  children: ReactNode;
  showDot?: boolean;
  className?: string;
  size?: "sm" | "md";
};

export default function StatBadge({
  variant = "neutral",
  children,
  showDot = true,
  className,
  size = "sm",
}: StatBadgeProps) {
  const style = VARIANTS[variant] ?? VARIANTS.neutral;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium capitalize",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        style.text,
        style.bg,
        style.glow,
        className
      )}
    >
      {showDot && style.dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            style.dot,
            style.pulse && "status-dot-pulse"
          )}
          style={style.pulse ? { color: "currentColor" } : undefined}
        />
      )}
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
}

"use client";

import { cn, getAvatarGradient, getInitials } from "@/lib/utils";

type AvatarProps = {
  nom: string;
  prenom?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
  status?: "online" | "offline" | "busy";
};

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

const STATUS: Record<NonNullable<AvatarProps["status"]>, string> = {
  online: "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]",
  offline: "bg-slate-400",
  busy: "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]",
};

export default function Avatar({
  nom,
  prenom,
  size = "md",
  className,
  showStatus = false,
  status = "online",
}: AvatarProps) {
  const initials = getInitials(nom, prenom);
  const gradient = getAvatarGradient(`${prenom ?? ""}${nom}`);

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white ring-1 ring-white/10 shadow-sm",
          gradient,
          SIZES[size]
        )}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0A0F1E]",
            STATUS[status]
          )}
        />
      )}
    </div>
  );
}

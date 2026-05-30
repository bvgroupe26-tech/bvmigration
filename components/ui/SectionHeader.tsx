"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  icon?: ReactNode;
};

export default function SectionHeader({
  title,
  subtitle,
  actions,
  className,
  icon,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-[#1F3F73]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

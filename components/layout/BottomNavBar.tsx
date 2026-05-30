"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/nav-config";

export type BottomNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  onClick?: () => void;
};

type BottomNavBarProps = {
  items: BottomNavItem[];
  pathname: string;
  className?: string;
  ariaLabel?: string;
  badgeByHref?: Record<string, number>;
};

export default function BottomNavBar({
  items,
  pathname,
  className,
  ariaLabel = "Navigation principale",
  badgeByHref,
}: BottomNavBarProps) {
  return (
    <nav
      className={cn(
        "no-print fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-safe",
        className
      )}
      aria-label={ariaLabel}
    >
      <div className="mx-auto flex h-[var(--shell-bottom-nav-height)] max-w-lg items-stretch justify-around px-1 sm:max-w-xl lg:max-w-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.onClick ? false : isNavActive(pathname, item.href);
          const label = item.shortLabel ?? item.label;
          const badge = badgeByHref?.[item.href] ?? 0;

          const inner = (
            <>
              <span
                className={cn(
                  "relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition sm:h-10 sm:w-10",
                  isActive ? "bg-[#E8F0FA] text-[#2F5F9D]" : "bg-transparent text-slate-400"
                )}
              >
                <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={isActive ? 2.4 : 2} />
                {badge > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="max-w-[4.5rem] truncate text-[10px] font-semibold leading-tight sm:text-[11px]">
                {label}
              </span>
            </>
          );

          const classNames = cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 transition",
            isActive ? "text-[#2F5F9D]" : "text-slate-500 hover:text-slate-700"
          );

          if (item.onClick) {
            return (
              <button key={item.href} type="button" onClick={item.onClick} className={classNames}>
                {inner}
              </button>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={classNames}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import type { NotificationType } from "@/lib/notifications";
import {
  NOTIFICATION_PERIOD_OPTIONS,
  NOTIFICATION_TYPE_FILTER_OPTIONS,
  type NotificationFilterCounts,
  type NotificationFiltersState,
  type NotificationPeriodFilter,
  type NotificationReadFilter,
  type NotificationTypeFilter,
} from "@/lib/notification-filters";
import { cn } from "@/lib/utils";

type NotificationFiltersProps = {
  filters: NotificationFiltersState;
  counts: NotificationFilterCounts;
  onChange: (patch: Partial<NotificationFiltersState>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  compact?: boolean;
};

function FilterChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-[#2F5F9D] bg-[#2F5F9D] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-[#2F5F9D]/30 hover:bg-[#E8F0FA] hover:text-[#1F3F73]",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function NotificationFilters({
  filters,
  counts,
  onChange,
  onReset,
  hasActiveFilters,
  compact = false,
}: NotificationFiltersProps) {
  const readOptions: { value: NotificationReadFilter; label: string; count: number }[] = [
    { value: "all", label: "Toutes", count: counts.total },
    { value: "unread", label: "Non lues", count: counts.unread },
    { value: "read", label: "Lues", count: counts.read },
  ];

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4",
        compact && "rounded-xl p-2.5"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filtrer</p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#2F5F9D] hover:bg-[#E8F0FA]"
          >
            <RotateCcw className="h-3 w-3" />
            Réinitialiser
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {readOptions.map((opt) => (
          <FilterChip
            key={opt.value}
            active={filters.read === opt.value}
            onClick={() => onChange({ read: opt.value })}
          >
            {opt.label}
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                filters.read === opt.value ? "text-white/80" : "text-slate-400"
              )}
            >
              {opt.count}
            </span>
          </FilterChip>
        ))}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-thin">
        {NOTIFICATION_TYPE_FILTER_OPTIONS.map((opt) => {
          const count =
            opt.value === "all" ? counts.total : counts.byType[opt.value as NotificationType] ?? 0;
          return (
            <FilterChip
              key={opt.value}
              active={filters.type === opt.value}
              onClick={() => onChange({ type: opt.value as NotificationTypeFilter })}
            >
              {opt.label}
              <span
                className={cn(
                  "ml-1 tabular-nums",
                  filters.type === opt.value ? "text-white/80" : "text-slate-400"
                )}
              >
                {count}
              </span>
            </FilterChip>
          );
        })}
      </div>

      {!compact ? (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {NOTIFICATION_PERIOD_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={filters.period === opt.value}
              onClick={() => onChange({ period: opt.value as NotificationPeriodFilter })}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

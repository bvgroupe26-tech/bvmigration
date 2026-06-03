"use client";

import { SlidersHorizontal } from "lucide-react";
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

const READ_OPTIONS: { value: NotificationReadFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "unread", label: "Non lues" },
  { value: "read", label: "Lues" },
];

function ReadSegment({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg px-2 py-2 text-center text-xs font-semibold transition sm:px-3",
        active
          ? "bg-white text-[#1F3F73] shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      {label}
      <span className={cn("ml-1 tabular-nums", active ? "text-[#2F5F9D]" : "text-slate-400")}>
        {count}
      </span>
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
  const readCounts = {
    all: counts.total,
    unread: counts.unread,
    read: counts.read,
  };

  if (compact) {
    return (
      <div className="space-y-2 px-1">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {READ_OPTIONS.map((opt) => (
            <ReadSegment
              key={opt.value}
              active={filters.read === opt.value}
              label={opt.label}
              count={readCounts[opt.value]}
              onClick={() => onChange({ read: opt.value })}
            />
          ))}
        </div>
        <select
          value={filters.type}
          onChange={(e) => onChange({ type: e.target.value as NotificationTypeFilter })}
          className="w-full rounded-lg border-0 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#2F5F9D]/25"
          aria-label="Filtrer par type"
        >
          {NOTIFICATION_TYPE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Filtres
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onReset}
              className="text-[#2F5F9D] hover:underline"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {READ_OPTIONS.map((opt) => (
            <ReadSegment
              key={opt.value}
              active={filters.read === opt.value}
              label={opt.label}
              count={readCounts[opt.value]}
              onClick={() => onChange({ read: opt.value })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:shrink-0">
        <label className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:flex-initial">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Type
          </span>
          <select
            value={filters.type}
            onChange={(e) => onChange({ type: e.target.value as NotificationTypeFilter })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-[#2F5F9D] focus:ring-2 focus:ring-[#2F5F9D]/15"
          >
            {NOTIFICATION_TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
                {opt.value !== "all"
                  ? ` (${counts.byType[opt.value as keyof typeof counts.byType] ?? 0})`
                  : ` (${counts.total})`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[9rem] flex-1 flex-col gap-1 sm:flex-initial">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Période
          </span>
          <select
            value={filters.period}
            onChange={(e) => onChange({ period: e.target.value as NotificationPeriodFilter })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-[#2F5F9D] focus:ring-2 focus:ring-[#2F5F9D]/15"
          >
            {NOTIFICATION_PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

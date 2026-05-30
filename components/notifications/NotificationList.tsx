"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatNotificationDate,
  getNotificationLink,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
  type Notification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

type NotificationListProps = {
  notifications: Notification[];
  context: "admin" | "employee";
  onMarkRead: (id: number) => Promise<void>;
  compact?: boolean;
  emptyMessage?: string;
};

export default function NotificationList({
  notifications,
  context,
  onMarkRead,
  compact = false,
  emptyMessage = "Aucune notification pour le moment.",
}: NotificationListProps) {
  const router = useRouter();

  if (notifications.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">{emptyMessage}</p>
    );
  }

  async function handleClick(n: Notification) {
    if (!n.lu) {
      await onMarkRead(n.id);
    }
    const href = getNotificationLink(n, context);
    if (href) router.push(href);
  }

  return (
    <ul className={cn("divide-y divide-slate-100", compact ? "" : "space-y-0")}>
      {notifications.map((n) => {
        const Icon = NOTIFICATION_TYPE_ICONS[n.type] ?? NOTIFICATION_TYPE_ICONS.info;
        const href = getNotificationLink(n, context);

        const content = (
          <>
            <span
              className={cn(
                "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                n.lu ? "bg-slate-100 text-slate-500" : "bg-[#E8F0FA] text-[#2F5F9D]"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-sm leading-snug", n.lu ? "font-medium text-slate-700" : "font-semibold text-slate-900")}>
                  {n.titre}
                </p>
                {!n.lu && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2F5F9D]" aria-hidden />}
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.message}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                <span>{NOTIFICATION_TYPE_LABELS[n.type]}</span>
                <span>·</span>
                <span>{formatNotificationDate(n.created_at)}</span>
              </div>
            </div>
          </>
        );

        const className = cn(
          "flex w-full gap-3 px-4 py-3 text-left transition",
          n.lu ? "bg-white hover:bg-slate-50" : "bg-[#F8FAFC] hover:bg-[#EEF4FB]"
        );

        if (href) {
          return (
            <li key={n.id}>
              <button type="button" onClick={() => void handleClick(n)} className={className}>
                {content}
              </button>
            </li>
          );
        }

        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => !n.lu && void onMarkRead(n.id)}
              className={className}
            >
              {content}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationListLink({
  context,
  className,
}: {
  context: "admin" | "employee";
  className?: string;
}) {
  const href = context === "employee" ? "/employee/notifications" : "/notifications";
  return (
    <Link
      href={href}
      className={cn(
        "block border-t border-slate-100 px-4 py-3 text-center text-xs font-semibold text-[#2F5F9D] hover:bg-slate-50",
        className
      )}
    >
      Voir toutes les notifications
    </Link>
  );
}

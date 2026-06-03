import type { Notification, NotificationType } from "@/lib/notifications";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notifications";

export type NotificationReadFilter = "all" | "unread" | "read";
export type NotificationPeriodFilter = "all" | "7d" | "30d";
export type NotificationTypeFilter = "all" | NotificationType;

export type NotificationFiltersState = {
  read: NotificationReadFilter;
  type: NotificationTypeFilter;
  period: NotificationPeriodFilter;
};

export const DEFAULT_NOTIFICATION_FILTERS: NotificationFiltersState = {
  read: "all",
  type: "all",
  period: "all",
};

export const NOTIFICATION_FILTERS_STORAGE_KEY = "bv-notification-filters";

const NOTIFICATION_TYPES: NotificationType[] = [
  "info",
  "conge",
  "paie",
  "document",
  "systeme",
];

export function readStoredNotificationFilters(): NotificationFiltersState {
  if (typeof localStorage === "undefined") return DEFAULT_NOTIFICATION_FILTERS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_FILTERS;
    const parsed = JSON.parse(raw) as Partial<NotificationFiltersState>;
    return {
      read:
        parsed.read === "unread" || parsed.read === "read" || parsed.read === "all"
          ? parsed.read
          : "all",
      type:
        parsed.type === "all" || NOTIFICATION_TYPES.includes(parsed.type as NotificationType)
          ? (parsed.type as NotificationTypeFilter)
          : "all",
      period:
        parsed.period === "7d" || parsed.period === "30d" || parsed.period === "all"
          ? parsed.period
          : "all",
    };
  } catch {
    return DEFAULT_NOTIFICATION_FILTERS;
  }
}

export function persistNotificationFilters(filters: NotificationFiltersState): void {
  try {
    localStorage.setItem(NOTIFICATION_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

function notificationTimestamp(n: Notification): number {
  const t = new Date(n.created_at).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function filterNotifications(
  notifications: Notification[],
  filters: NotificationFiltersState
): Notification[] {
  const periodMs =
    filters.period === "7d"
      ? 7 * 86400000
      : filters.period === "30d"
        ? 30 * 86400000
        : null;
  const cutoff = periodMs != null ? Date.now() - periodMs : null;

  return notifications
    .filter((n) => {
      if (filters.read === "unread" && n.lu) return false;
      if (filters.read === "read" && !n.lu) return false;
      if (filters.type !== "all" && n.type !== filters.type) return false;
      if (cutoff != null && notificationTimestamp(n) < cutoff) return false;
      return true;
    })
    .sort((a, b) => notificationTimestamp(b) - notificationTimestamp(a));
}

export function hasActiveNotificationFilters(filters: NotificationFiltersState): boolean {
  return (
    filters.read !== "all" || filters.type !== "all" || filters.period !== "all"
  );
}

export type NotificationFilterCounts = {
  total: number;
  unread: number;
  read: number;
  byType: Record<NotificationType, number>;
};

export function getNotificationFilterCounts(
  notifications: Notification[]
): NotificationFilterCounts {
  const byType = Object.fromEntries(
    NOTIFICATION_TYPES.map((t) => [t, 0])
  ) as Record<NotificationType, number>;

  let unread = 0;
  for (const n of notifications) {
    if (!n.lu) unread += 1;
    if (n.type in byType) byType[n.type] += 1;
  }

  return {
    total: notifications.length,
    unread,
    read: notifications.length - unread,
    byType,
  };
}

export const NOTIFICATION_TYPE_FILTER_OPTIONS: {
  value: NotificationTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "Tous types" },
  ...NOTIFICATION_TYPES.map((type) => ({
    value: type as NotificationTypeFilter,
    label: NOTIFICATION_TYPE_LABELS[type],
  })),
];

export const NOTIFICATION_PERIOD_OPTIONS: {
  value: NotificationPeriodFilter;
  label: string;
}[] = [
  { value: "all", label: "Toute la période" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
];

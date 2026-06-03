"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Notification } from "@/lib/notifications";
import {
  DEFAULT_NOTIFICATION_FILTERS,
  filterNotifications,
  getNotificationFilterCounts,
  hasActiveNotificationFilters,
  persistNotificationFilters,
  readStoredNotificationFilters,
  type NotificationFiltersState,
} from "@/lib/notification-filters";

export function useNotificationFilters(notifications: Notification[]) {
  const [filters, setFilters] = useState<NotificationFiltersState>(DEFAULT_NOTIFICATION_FILTERS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFilters(readStoredNotificationFilters());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistNotificationFilters(filters);
  }, [filters, hydrated]);

  const filtered = useMemo(
    () => filterNotifications(notifications, filters),
    [notifications, filters]
  );

  const counts = useMemo(
    () => getNotificationFilterCounts(notifications),
    [notifications]
  );

  const updateFilters = useCallback((patch: Partial<NotificationFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_NOTIFICATION_FILTERS);
  }, []);

  return {
    filters,
    filtered,
    counts,
    updateFilters,
    resetFilters,
    hasActiveFilters: hasActiveNotificationFilters(filters),
    hydrated,
  };
}

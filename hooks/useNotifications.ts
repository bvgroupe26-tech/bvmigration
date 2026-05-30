"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  normalizeNotificationList,
  normalizeUnreadCount,
  notificationsService,
  type Notification,
} from "@/lib/notifications";

const LIST_KEY = "/notifications/me";
const COUNT_KEY = "/notifications/me/unread-count";

const LIST_OPTS = { refreshInterval: 0, revalidateOnFocus: true } as const;
const COUNT_OPTS = { refreshInterval: 30_000, revalidateOnFocus: true } as const;

export function refreshNotificationsCache() {
  return globalMutate(
    (key) => typeof key === "string" && key.startsWith("/notifications"),
    undefined,
    { revalidate: true }
  );
}

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    LIST_KEY,
    async () => normalizeNotificationList(await fetcher<unknown>(LIST_KEY)),
    LIST_OPTS
  );

  return {
    notifications: data ?? [],
    isLoading,
    error,
    mutate,
    refresh: () => mutate(),
  };
}

export function useUnreadNotificationsCount() {
  const { data, error, isLoading, mutate } = useSWR<number>(
    COUNT_KEY,
    async () => normalizeUnreadCount(await fetcher<unknown>(COUNT_KEY)),
    COUNT_OPTS
  );

  return {
    count: data ?? 0,
    isLoading,
    error,
    mutate,
    refresh: () => mutate(),
  };
}

export function useNotificationsFeed() {
  const list = useNotifications();
  const unread = useUnreadNotificationsCount();

  async function markAsRead(id: number) {
    await notificationsService.markAsRead(id);
    await Promise.all([list.mutate(), unread.mutate()]);
  }

  async function markAllAsRead() {
    await notificationsService.markAllAsRead();
    await Promise.all([list.mutate(), unread.mutate()]);
  }

  return {
    notifications: list.notifications,
    unreadCount: unread.count,
    isLoading: list.isLoading || unread.isLoading,
    error: list.error ?? unread.error,
    markAsRead,
    markAllAsRead,
    refresh: refreshNotificationsCache,
  };
}

export async function markNotificationRead(id: number) {
  await notificationsService.markAsRead(id);
  await refreshNotificationsCache();
}

export async function markAllNotificationsRead() {
  await notificationsService.markAllAsRead();
  await refreshNotificationsCache();
}

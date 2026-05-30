"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { refreshAccessToken } from "@/lib/authClient";
import {
  apiDelete,
  apiDownload,
  apiGet,
  apiPost,
  apiPut,
  apiUpload,
} from "@/lib/apiClient";
import { normalizeEmployeMe } from "@/lib/employe-utils";
import {
  normalizeAbsenceBalance,
  normalizeEmployeeAbsences,
  normalizeEmployeeDocuments,
} from "@/lib/employee-api-utils";
import {
  useNotificationsFeed,
  markNotificationRead,
  refreshNotificationsCache,
} from "@/hooks/useNotifications";
import type {
  AbsenceBalance,
  CreateAbsenceInput,
  EmployeeAbsence,
  EmployeeDocument,
  EmployeMe,
  UserMePayload,
} from "@/lib/employee/types";
import { normalizePaieList } from "@/lib/paie-utils";
import { normalizePresenceList } from "@/lib/presence-utils";
import type { Paie, Presence } from "@/lib/types";

const SHORT = { refreshInterval: 0, revalidateOnFocus: true } as const;

export function useAuthMe() {
  const { data, error, isLoading, mutate } = useSWR<UserMePayload>("/auth/me", fetcher, SHORT);
  return { user: data, isLoading, error, mutate };
}

export function useEmployeMe() {
  const { data, error, isLoading, mutate } = useSWR<EmployeMe>(
    "/employes/me",
    async () => normalizeEmployeMe(await fetcher<unknown>("/employes/me")),
    SHORT
  );
  return { employe: data, isLoading, error, mutate };
}

export function useAbsenceBalance() {
  const { data, error, isLoading, mutate } = useSWR<AbsenceBalance>(
    "/absences/balance/me",
    async () => normalizeAbsenceBalance(await fetcher<unknown>("/absences/balance/me")),
    SHORT
  );
  return { balance: data, isLoading, error, mutate };
}

export function useMyAbsences() {
  const { data, error, isLoading, mutate } = useSWR<EmployeeAbsence[]>(
    "/absences/me",
    async () => normalizeEmployeeAbsences(await fetcher<unknown>("/absences/me")),
    SHORT
  );
  return { absences: data ?? [], isLoading, error, mutate };
}

export function useMyPayslips() {
  const { data, error, isLoading, mutate } = useSWR<Paie[]>(
    "/paie/me",
    async () => normalizePaieList(await fetcher<unknown>("/paie/me")),
    SHORT
  );
  return { payslips: data ?? [], isLoading, error, mutate };
}

export function useMyPresences(filters?: {
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  const { user, isLoading: loadingUser } = useAuthMe();
  const { employe, isLoading: loadingEmploye } = useEmployeMe();

  const employeId = employe?.id ?? user?.employeId ?? null;
  const qs = new URLSearchParams();
  if (employeId) qs.set("employe_id", String(employeId));
  if (filters?.date_from) qs.set("date_from", filters.date_from);
  if (filters?.date_to) qs.set("date_to", filters.date_to);
  if (filters?.limit) qs.set("limit", String(filters.limit));

  const url = employeId ? `/presences?${qs.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR<Presence[]>(
    url,
    async (key: string) => normalizePresenceList(await fetcher<unknown>(key)),
    SHORT
  );

  return {
    presences: data ?? [],
    employeId,
    isLoading: isLoading || loadingUser || loadingEmploye,
    error,
    mutate,
  };
}

export function useMyDocuments() {
  const { data, error, isLoading, mutate } = useSWR<EmployeeDocument[]>(
    "/documents/me",
    async () => normalizeEmployeeDocuments(await fetcher<unknown>("/documents/me")),
    SHORT
  );
  return { documents: data ?? [], isLoading, error, mutate };
}

export function useMyNotifications() {
  const feed = useNotificationsFeed();
  return {
    notifications: feed.notifications,
    unreadCount: feed.unreadCount,
    isLoading: feed.isLoading,
    error: feed.error,
    mutate: feed.refresh,
  };
}

export { markNotificationRead, refreshNotificationsCache };
export type { Notification as EmployeeNotification } from "@/lib/notifications";

export async function updateEmployeMe(body: Partial<EmployeMe>) {
  const result = await apiPut<unknown>("/employes/me", body);
  return normalizeEmployeMe(result);
}

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("avatar", file);
  const result = await apiUpload<unknown>("/employes/me/avatar", form);
  return normalizeEmployeMe(result);
}

export async function createAbsence(body: CreateAbsenceInput) {
  return apiPost<EmployeeAbsence>("/absences", body);
}

export async function cancelAbsence(id: number) {
  return apiDelete<void>(`/absences/${id}`);
}

export function openPayslipPrint(id: number) {
  window.open(`/employee/paie/${id}?print=1`, "_blank", "noopener,noreferrer");
}

export async function downloadDocument(id: number, name?: string) {
  return apiDownload(`/documents/${id}/download`, name ?? `document-${id}`);
}

export async function refreshAuthToken() {
  await refreshAccessToken();
  return apiGet<UserMePayload>("/auth/me");
}

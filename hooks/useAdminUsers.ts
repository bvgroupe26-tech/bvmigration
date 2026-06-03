"use client";

import useSWR from "swr";
import {
  fetchAdminUsers,
  updateAdminUser,
  type AdminUserRecord,
} from "@/lib/users-admin-api";

const USERS_KEY = "/users";

export function useAdminUsers() {
  const { data, error, isLoading, mutate } = useSWR<AdminUserRecord[]>(
    USERS_KEY,
    fetchAdminUsers,
    { revalidateOnFocus: true }
  );

  async function setUserActive(id: number, isActive: boolean) {
    await updateAdminUser(id, { isActive });
    await mutate();
  }

  async function setUserRole(id: number, role: string) {
    await updateAdminUser(id, { role });
    await mutate();
  }

  return {
    users: data ?? [],
    isLoading,
    error,
    mutate,
    setUserActive,
    setUserRole,
  };
}

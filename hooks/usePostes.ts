"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { apiClient, fetcher } from "@/lib/fetcher";
import { getUserErrorMessage } from "@/lib/apiClient";

function normalizePostes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length >= 2)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

export function usePostes() {
  const { data, error, isLoading, mutate } = useSWR<string[]>(
    "/employes/postes/referentiel",
    async (url: string) => normalizePostes(await fetcher<unknown>(url)),
    { revalidateOnFocus: true }
  );

  const addPoste = useCallback(
    async (label: string) => {
      const next = await apiClient.post<string[]>("/employes/postes/referentiel", { label });
      await mutate(normalizePostes(next), { revalidate: false });
      return normalizePostes(next);
    },
    [mutate]
  );

  const removePoste = useCallback(
    async (label: string) => {
      const next = await apiClient.post<string[]>("/employes/postes/referentiel/remove", { label });
      await mutate(normalizePostes(next), { revalidate: false });
      return normalizePostes(next);
    },
    [mutate]
  );

  return {
    postes: data ?? [],
    isLoading,
    error: error ? getUserErrorMessage(error) : null,
    addPoste,
    removePoste,
    refresh: mutate,
  };
}

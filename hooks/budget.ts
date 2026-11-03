"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  normalizeCategorieFinanceList,
  normalizeDepenseFinance,
  normalizeDepensePage,
  normalizeEnveloppeFinanceList,
  normalizeFournisseurList,
  normalizeParametresFinance,
  normalizeSyntheseFinance,
} from "@/lib/budget-normalizers";
import type {
  CategorieFinance,
  DepenseFilters,
  DepenseFinance,
  EnveloppeFinance,
  Fournisseur,
  Paginated,
  ParametresFinance,
  SyntheseFinance,
} from "@/lib/types-finance";

const SHORT = { refreshInterval: 0, revalidateOnFocus: false } as const;

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function useFinanceSynthese(annee: number) {
  const url = `/budget/synthese${qs({ annee })}`;
  const { data, error, isLoading, mutate } = useSWR<SyntheseFinance>(
    url,
    async (u: string) => normalizeSyntheseFinance(await fetcher<unknown>(u), annee),
    SHORT
  );
  return { synthese: data, isLoading, error, mutate };
}

export function useFinanceDepenses(filters: DepenseFilters, enabled = true) {
  const limit = filters.limit ?? 20;
  const url = enabled ? `/budget/depenses${qs({ ...filters, limit })}` : null;
  const { data, error, isLoading, mutate } = useSWR<Paginated<DepenseFinance>>(
    url,
    async (u: string) => normalizeDepensePage(await fetcher<unknown>(u), limit),
    { ...SHORT, keepPreviousData: true }
  );
  return {
    depenses: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? filters.page ?? 1,
    limit,
    isLoading,
    error,
    mutate,
  };
}

export function useFinanceDepense(id: number | string | null) {
  const { data, error, isLoading, mutate } = useSWR<DepenseFinance>(
    id ? `/budget/depenses/${id}` : null,
    async (u: string) => normalizeDepenseFinance(await fetcher<unknown>(u)),
    SHORT
  );
  return { depense: data, isLoading, error, mutate };
}

export function useFinanceEnveloppes(filters?: { annee?: number; statut?: string }, enabled = true) {
  const url = enabled ? `/budget/enveloppes${qs(filters ?? {})}` : null;
  const { data, error, isLoading, mutate } = useSWR<EnveloppeFinance[]>(
    url,
    async (u: string) => normalizeEnveloppeFinanceList(await fetcher<unknown>(u)),
    SHORT
  );
  return { enveloppes: data ?? [], isLoading, error, mutate };
}

export function useFinanceCategories(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<CategorieFinance[]>(
    enabled ? "/budget/categories" : null,
    async (u: string) => normalizeCategorieFinanceList(await fetcher<unknown>(u)),
    SHORT
  );
  return { categories: data ?? [], isLoading, error, mutate };
}

export function useFournisseurs(q?: string, enabled = true) {
  const url = enabled ? `/fournisseurs${qs({ q: q?.trim() || undefined })}` : null;
  const { data, error, isLoading, mutate } = useSWR<Fournisseur[]>(
    url,
    async (u: string) => normalizeFournisseurList(await fetcher<unknown>(u)),
    { ...SHORT, keepPreviousData: true }
  );
  return { fournisseurs: data ?? [], isLoading, error, mutate };
}

export function useParametresFinance() {
  const { data, error, isLoading, mutate } = useSWR<ParametresFinance>(
    "/budget/parametres",
    async (u: string) => normalizeParametresFinance(await fetcher<unknown>(u)),
    { ...SHORT, shouldRetryOnError: false }
  );
  return { parametres: data, isLoading, error, mutate };
}

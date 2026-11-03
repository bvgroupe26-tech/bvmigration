"use client";

import useSWR from "swr";
import { fetcher, apiClient } from "@/lib/fetcher";
import { apiDownload } from "@/lib/apiClient";
import {
  normalizeBulletinDetail,
  normalizeEmployeeRubrique,
  normalizeEmployeur,
  normalizeList,
  normalizePayParameter,
  normalizePayRule,
  normalizePeriod,
  normalizeSettingsStatut,
  normalizeTaxBracket,
  normalizeVariable,
  normalizeVerify,
  type BulletinDetail,
  type EmployeeRubrique,
  type EmployeurSettings,
  type PaieSettingsStatut,
  type PayParameter,
  type PayRule,
  type PayrollPeriod,
  type PayrollVariableRow,
  type TaxBracket,
  type VerifyBulletinResult,
} from "@/lib/types-paie";

const SHORT = { refreshInterval: 0, revalidateOnFocus: false } as const;

export function usePaieSettingsStatut() {
  const { data, error, isLoading, mutate } = useSWR<PaieSettingsStatut>(
    "/paie-settings/statut",
    async (k: string) => normalizeSettingsStatut(await fetcher<unknown>(k)),
    { ...SHORT, shouldRetryOnError: false }
  );
  return { statut: data, isLoading, error, mutate };
}

export function usePayrollPeriods() {
  const { data, error, isLoading, mutate } = useSWR<PayrollPeriod[]>(
    "/paie/periodes",
    async (k: string) => normalizeList(await fetcher<unknown>(k), normalizePeriod),
    { ...SHORT, shouldRetryOnError: false }
  );
  return { periodes: data ?? [], isLoading, error, mutate };
}

export function usePayrollPeriod(id: number | null) {
  const { data, error, isLoading, mutate } = useSWR<PayrollPeriod>(
    id ? `/paie/periodes/${id}` : null,
    async (k: string) => normalizePeriod(await fetcher<unknown>(k)),
    SHORT
  );
  return { periode: data, isLoading, error, mutate };
}

export function usePeriodVariables(periodId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<PayrollVariableRow[]>(
    periodId ? `/paie/periodes/${periodId}/variables` : null,
    async (k: string) => normalizeList(await fetcher<unknown>(k), normalizeVariable),
    SHORT
  );
  return { variables: data ?? [], isLoading, error, mutate };
}

export function useBulletin(id: number | string | null) {
  const { data, error, isLoading, mutate } = useSWR<BulletinDetail>(
    id ? `/paie/${id}` : null,
    async (k: string) => normalizeBulletinDetail(await fetcher<unknown>(k)),
    SHORT
  );
  return { bulletin: data, isLoading, error, mutate };
}

export function useMyBulletins() {
  const { data, error, isLoading, mutate } = useSWR<BulletinDetail[]>(
    "/paie/me",
    async (k: string) =>
      normalizeList(await fetcher<unknown>(k), normalizeBulletinDetail)
        .filter((b) => b.statut === "paye")
        .sort((a, b) => b.annee - a.annee || Number(b.mois) - Number(a.mois) || b.id - a.id),
    SHORT
  );
  return { bulletins: data ?? [], isLoading, error, mutate };
}

export function useEmployeurSettings() {
  const { data, error, isLoading, mutate } = useSWR<EmployeurSettings | null>(
    "/paie-settings/employeur",
    async (k: string) => normalizeEmployeur(await fetcher<unknown>(k)),
    SHORT
  );
  return { employeur: data ?? null, isLoading, error, mutate };
}

export function usePayRules() {
  const { data, error, isLoading, mutate } = useSWR<PayRule[]>(
    "/paie-settings/rubriques",
    async (k: string) =>
      normalizeList(await fetcher<unknown>(k), normalizePayRule).sort((a, b) => a.ordre - b.ordre),
    SHORT
  );
  return { rubriques: data ?? [], isLoading, error, mutate };
}

export function usePayParameters() {
  const { data, error, isLoading, mutate } = useSWR<PayParameter[]>(
    "/paie-settings/parametres",
    async (k: string) => normalizeList(await fetcher<unknown>(k), normalizePayParameter),
    SHORT
  );
  return { parametres: data ?? [], isLoading, error, mutate };
}

export function useTaxBrackets() {
  const { data, error, isLoading, mutate } = useSWR<TaxBracket[]>(
    "/paie-settings/baremes",
    async (k: string) => normalizeList(await fetcher<unknown>(k), normalizeTaxBracket),
    SHORT
  );
  return { baremes: data ?? [], isLoading, error, mutate };
}

export function useEmployeeRubriques(employeId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<EmployeeRubrique[]>(
    employeId ? `/paie-settings/employes/${employeId}/rubriques` : null,
    async (k: string) => normalizeList(await fetcher<unknown>(k), normalizeEmployeeRubrique),
    SHORT
  );
  return { elements: data ?? [], isLoading, error, mutate };
}

export function useVerifyBulletin(numero: string | null) {
  const { data, error, isLoading } = useSWR<VerifyBulletinResult>(
    numero ? `/paie/verify/${encodeURIComponent(numero)}` : null,
    async (k: string) => normalizeVerify(await fetcher<unknown>(k)),
    { ...SHORT, shouldRetryOnError: false }
  );
  return { result: data, isLoading, error };
}

export function downloadBulletinPdf(id: number, numero?: string | null): Promise<void> {
  return apiDownload(`/paie/${id}/pdf`, `bulletin-${numero ?? id}.pdf`);
}

export const paieActions = {
  createPeriode: (annee: number, mois: number) => apiClient.post<unknown>("/paie/periodes", { annee, mois }),
  periodeAction: (id: number, action: "calculer" | "valider" | "payer" | "cloturer", body?: unknown) =>
    apiClient.post<unknown>(`/paie/periodes/${id}/${action}`, body),
  saveVariables: (id: number, variables: unknown[]) =>
    apiClient.put<unknown>(`/paie/periodes/${id}/variables`, { variables }),
  importVariables: (id: number) => apiClient.post<unknown>(`/paie/periodes/${id}/variables/importer`),
  contreBulletin: (id: number) => apiClient.post<unknown>(`/paie/${id}/contre-bulletin`),
};

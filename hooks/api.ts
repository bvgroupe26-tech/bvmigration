"use client";

import useSWR from "swr";
import { fetcher, apiClient } from "@/lib/fetcher";
import {
  normalizeActiviteLogs,
  normalizeDashboardRecrutements,
  normalizeDashboardStats,
  normalizeDepartements,
  normalizePresencesChart,
} from "@/lib/dashboard-utils";
import {
  normalizePaie,
  normalizePaieEvolution,
  normalizePaieList,
  normalizePaieStats,
  type PaieStatsPayload,
} from "@/lib/paie-utils";
import { normalizeEmploye, normalizeEmployeList } from "@/lib/employe-utils";
import { normalizePresence, normalizePresenceList } from "@/lib/presence-utils";
import {
  enrichAbsencesWithEmployes,
  normalizeAbsenceList,
  unwrapAbsenceListPayload,
} from "@/lib/absence-utils";
import { normalizeBudgetSynthese } from "@/lib/budget-utils";
import { normalizeStatistiquesSynthese } from "@/lib/statistiques-utils";
import type {
  Employe,
  Presence,
  Absence,
  Paie,
  Offre,
  Candidature,
  Competence,
  Formation,
  Evaluation,
  ActiviteLog,
  DashboardStats,
  PresenceChartPoint,
  DepartementsRepartition,
  PaieEvolutionPoint,
  StatistiquesSynthese,
  BudgetCategorie,
  BudgetEnveloppe,
  BudgetDepense,
  BudgetSynthese,
} from "@/lib/types";

const SHORT = { refreshInterval: 0, revalidateOnFocus: false } as const;
const AUTO = { refreshInterval: 30_000, revalidateOnFocus: true } as const;

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const str = sp.toString();
  return str ? `?${str}` : "";
}

// ============ Employés ============
async function fetchEmployes(url: string): Promise<Employe[]> {
  const raw = await fetcher<unknown>(url);
  return normalizeEmployeList(raw);
}

async function fetchEmploye(url: string): Promise<Employe> {
  const raw = await fetcher<unknown>(url);
  return normalizeEmploye(raw);
}

export function useEmployes(filters?: {
  search?: string;
  departement?: string;
  type_contrat?: string;
  statut?: string;
  sort?: string;
  limit?: number;
}) {
  const url = `/employes${qs(filters ?? {})}`;
  const { data, error, isLoading, mutate } = useSWR<Employe[]>(url, fetchEmployes, SHORT);
  return { employes: data ?? [], isLoading, error, mutate };
}

export function useEmploye(id: number | string | null) {
  const { data, error, isLoading, mutate } = useSWR<Employe>(
    id ? `/employes/${id}` : null,
    fetchEmploye,
    SHORT
  );
  return { employe: data, isLoading, error, mutate };
}

// ============ Présences ============
async function fetchPresences(url: string): Promise<Presence[]> {
  const raw = await fetcher<unknown>(url);
  return normalizePresenceList(raw);
}

export function usePresences(filters?: {
  date?: string;
  employe_id?: number;
  statut?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  const url = `/presences${qs(filters ?? {})}`;
  const { data, error, isLoading, mutate } = useSWR<Presence[]>(url, fetchPresences, SHORT);
  return { presences: data ?? [], isLoading, error, mutate };
}

type PresencesTodayCounts = {
  present: number;
  absent: number;
  retard: number;
  conge: number;
  mission: number;
  total: number;
};

type PresencesTodayPayload = {
  date: string;
  counts: PresencesTodayCounts;
};

const EMPTY_TODAY_COUNTS: PresencesTodayCounts = {
  present: 0,
  absent: 0,
  retard: 0,
  conge: 0,
  mission: 0,
  total: 0,
};

function normalizePresencesToday(raw: unknown): PresencesTodayPayload | undefined {
  if (raw == null) return undefined;

  const today = new Date().toISOString().slice(0, 10);

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;

    if (o.counts && typeof o.counts === "object") {
      const c = o.counts as Record<string, unknown>;
      const counts: PresencesTodayCounts = {
        present: Number(c.present) || 0,
        absent: Number(c.absent) || 0,
        retard: Number(c.retard) || 0,
        conge: Number(c.conge) || 0,
        mission: Number(c.mission) || 0,
        total: Number(c.total) || 0,
      };
      if (!counts.total) {
        counts.total =
          counts.present + counts.absent + counts.retard + counts.conge + counts.mission;
      }
      return { date: String(o.date ?? today), counts };
    }

    if ("present" in o || "absent" in o || "retard" in o) {
      const counts: PresencesTodayCounts = {
        present: Number(o.present) || 0,
        absent: Number(o.absent) || 0,
        retard: Number(o.retard) || 0,
        conge: Number(o.conge) || 0,
        mission: Number(o.mission) || 0,
        total: Number(o.total) || 0,
      };
      if (!counts.total) {
        counts.total =
          counts.present + counts.absent + counts.retard + counts.conge + counts.mission;
      }
      return { date: String(o.date ?? today), counts };
    }

    if (Array.isArray(o.presences)) {
      return normalizePresencesToday(o.presences);
    }
  }

  if (Array.isArray(raw)) {
    const counts = { ...EMPTY_TODAY_COUNTS };
    const items = normalizePresenceList(raw);
    for (const item of items) {
      const statut = String(item.statut ?? "");
      if (statut === "present") counts.present++;
      else if (statut === "absent") counts.absent++;
      else if (statut === "retard") counts.retard++;
      else if (statut === "conge") counts.conge++;
      else if (statut === "mission") counts.mission++;
    }
    counts.total = items.length;
    const firstDate = items[0]?.date;
    return { date: firstDate ?? today, counts };
  }

  return { date: today, counts: { ...EMPTY_TODAY_COUNTS } };
}

export function usePresencesToday() {
  const { data, error, isLoading, mutate } = useSWR<unknown>("/presences/today", fetcher, AUTO);
  return {
    data: normalizePresencesToday(data),
    isLoading,
    error,
    mutate,
  };
}

// ============ Absences ============
async function fetchAbsences(url: string): Promise<Absence[]> {
  const raw = await fetcher<unknown>(url);
  let list = normalizeAbsenceList(raw);

  try {
    const empsRaw = await fetcher<unknown>("/employes?limit=500");
    const employes = normalizeEmployeList(empsRaw);
    list = enrichAbsencesWithEmployes(list, employes);
  } catch {
    /* liste employés optionnelle */
  }

  if (process.env.NODE_ENV === "development" && list.length > 0) {
    const sample = unwrapAbsenceListPayload(raw)[0];
    const first = list[0];
    const sampleKeys =
      sample && typeof sample === "object" && !Array.isArray(sample)
        ? Object.keys(sample as Record<string, unknown>)
        : [];
    console.info("[absences] clés API 1er enregistrement:", sampleKeys);
    console.info("[absences] après normalisation:", {
      employe_id: first.employe_id,
      nom: first.employe_nom,
      date_debut: first.date_debut,
      date_fin: first.date_fin,
      type: first.type_absence,
    });
  }

  return list;
}

export function useAbsences(filters?: {
  employe_id?: number;
  statut?: string;
  type_absence?: string;
}) {
  const url = `/absences${qs(filters ?? {})}`;
  const { data, error, isLoading, mutate } = useSWR<Absence[]>(url, fetchAbsences, SHORT);
  return { absences: data ?? [], isLoading, error, mutate };
}

// ============ Paie ============
async function fetchPaieList(url: string): Promise<Paie[]> {
  const raw = await fetcher<unknown>(url);
  return normalizePaieList(raw);
}

async function fetchPaieDetail(url: string): Promise<Paie> {
  const raw = await fetcher<unknown>(url);
  return normalizePaie(raw);
}

async function fetchPaieStats(url: string): Promise<PaieStatsPayload> {
  const raw = await fetcher<unknown>(url);
  return normalizePaieStats(raw);
}

async function fetchPaieEvolution(): Promise<PaieEvolutionPoint[]> {
  const raw = await fetcher<unknown>("/paie/evolution");
  return normalizePaieEvolution(raw);
}

export function usePaie(mois?: string, annee?: number, statut?: string) {
  const url = `/paie${qs({ mois, annee, statut })}`;
  const { data, error, isLoading, mutate } = useSWR<Paie[]>(url, fetchPaieList, SHORT);
  return { bulletins: data ?? [], isLoading, error, mutate };
}

export function usePaieStats(mois?: string, annee?: number) {
  const url = `/paie/stats${qs({ mois, annee })}`;
  const { data, error, isLoading, mutate } = useSWR<PaieStatsPayload>(url, fetchPaieStats, SHORT);
  return { stats: data, isLoading, error, mutate };
}

export function usePaieEvolution() {
  const { data, error, isLoading, mutate } = useSWR<PaieEvolutionPoint[]>(
    "/paie/evolution",
    fetchPaieEvolution,
    SHORT
  );
  return { evolution: data ?? [], isLoading, error, mutate };
}

export function usePaieDetail(id: number | string | null) {
  const { data, error, isLoading, mutate } = useSWR<Paie>(
    id ? `/paie/${id}` : null,
    fetchPaieDetail,
    SHORT
  );
  return { bulletin: data, isLoading, error, mutate };
}

// ============ Recrutement ============
export function useOffres(filters?: { statut?: string }) {
  const url = `/offres${qs(filters ?? {})}`;
  const { data, error, isLoading, mutate } = useSWR<Offre[]>(url, fetcher, SHORT);
  return { offres: data ?? [], isLoading, error, mutate };
}

export function useOffre(id: number | string | null) {
  const { data, error, isLoading, mutate } = useSWR<Offre & { candidatures: Candidature[] }>(
    id ? `/offres/${id}` : null,
    fetcher,
    SHORT
  );
  return { offre: data, isLoading, error, mutate };
}

export function useOffresStats() {
  const { data, error, isLoading, mutate } = useSWR<{
    ouvertes: number;
    fermees: number;
    pourvues: number;
    total: number;
    total_candidats: number;
  }>("/offres/stats", fetcher, SHORT);
  return { stats: data, isLoading, error, mutate };
}

// ============ Compétences ============
export function useCompetences(employe_id?: number) {
  const url = `/competences${qs({ employe_id })}`;
  const { data, error, isLoading, mutate } = useSWR<Competence[]>(url, fetcher, SHORT);
  return { competences: data ?? [], isLoading, error, mutate };
}

export function useFormations(employe_id?: number) {
  const url = `/formations${qs({ employe_id })}`;
  const { data, error, isLoading, mutate } = useSWR<Formation[]>(url, fetcher, SHORT);
  return { formations: data ?? [], isLoading, error, mutate };
}

export function useEvaluations(filters?: { employe_id?: number; periode?: string }) {
  const url = `/evaluations${qs(filters ?? {})}`;
  const { data, error, isLoading, mutate } = useSWR<Evaluation[]>(url, fetcher, SHORT);
  return { evaluations: data ?? [], isLoading, error, mutate };
}

export function useStatistiquesSynthese() {
  const { data, error, isLoading, mutate } = useSWR<StatistiquesSynthese>(
    "/statistiques/synthese",
    async () => normalizeStatistiquesSynthese(await fetcher<unknown>("/statistiques/synthese")),
    AUTO
  );
  return { synthese: data, isLoading, error, mutate };
}

export function useBudgetSynthese(annee?: number) {
  const url = `/budget/synthese${qs({ annee })}`;
  const { data, error, isLoading, mutate } = useSWR<BudgetSynthese>(
    url,
    async () => normalizeBudgetSynthese(await fetcher<unknown>(url), annee),
    SHORT
  );
  return { synthese: data, isLoading, error, mutate };
}

export function useBudgetCategories() {
  const { data, error, isLoading, mutate } = useSWR<BudgetCategorie[]>("/budget/categories", fetcher, SHORT);
  return { categories: data ?? [], isLoading, error, mutate };
}

export function useBudgetEnveloppes(filters?: { annee?: number; statut?: string }) {
  const url = `/budget/enveloppes${qs(filters ?? {})}`;
  const { data, error, isLoading, mutate } = useSWR<BudgetEnveloppe[]>(url, fetcher, SHORT);
  return { enveloppes: data ?? [], isLoading, error, mutate };
}

export function useBudgetDepenses(filters?: {
  enveloppe_id?: number;
  categorie_id?: number;
  statut?: string;
  date_from?: string;
  date_to?: string;
}) {
  const url = `/budget/depenses${qs(filters ?? {})}`;
  const { data, error, isLoading, mutate } = useSWR<BudgetDepense[]>(url, fetcher, SHORT);
  return { depenses: data ?? [], isLoading, error, mutate };
}

// ============ Dashboard ============
async function fetchDashboardStats(): Promise<DashboardStats> {
  const raw = await fetcher<unknown>("/dashboard/stats");
  return normalizeDashboardStats(raw);
}

async function fetchDashboardPresencesChart(): Promise<PresenceChartPoint[]> {
  const raw = await fetcher<unknown>("/dashboard/presences-chart");
  return normalizePresencesChart(raw);
}

async function fetchDashboardDepartements(): Promise<DepartementsRepartition[]> {
  const raw = await fetcher<unknown>("/dashboard/departements");
  return normalizeDepartements(raw);
}

async function fetchDashboardActivite(): Promise<ActiviteLog[]> {
  const raw = await fetcher<unknown>("/dashboard/activite?limit=10");
  return normalizeActiviteLogs(raw);
}

async function fetchDashboardRecrutementsList() {
  const raw = await fetcher<unknown>("/dashboard/recrutements");
  const fromDashboard = normalizeDashboardRecrutements(raw);
  if (fromDashboard.length > 0) return fromDashboard;

  try {
    const offres = await apiClient.get<Array<Record<string, unknown>>>("/offres?statut=ouverte");
    return offres.map((o) => ({
      id: Number(o.id) || 0,
      titre: String(o.titre ?? "Offre"),
      departement: String(o.departement ?? "—"),
      cible_candidats: Number(o.cible_candidats ?? o.cibleCandidats) || 1,
      statut: String(o.statut ?? "ouverte"),
      candidats_count: Number(o.candidats_count ?? o.candidatsCount) || 0,
    }));
  } catch {
    return [];
  }
}

export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    "/dashboard/stats",
    fetchDashboardStats,
    AUTO
  );
  return { stats: data, isLoading, error, mutate };
}

export function useDashboardPresences() {
  const { data, error, isLoading } = useSWR<PresenceChartPoint[]>(
    "/dashboard/presences-chart",
    fetchDashboardPresencesChart,
    AUTO
  );
  return { chart: data ?? [], isLoading, error };
}

export function useDashboardDepartements() {
  const { data, error, isLoading } = useSWR<DepartementsRepartition[]>(
    "/dashboard/departements",
    fetchDashboardDepartements,
    AUTO
  );
  return { repartition: data ?? [], isLoading, error };
}

export function useDashboardActivite() {
  const { data, error, isLoading, mutate } = useSWR<ActiviteLog[]>(
    "/dashboard/activite?limit=10",
    fetchDashboardActivite,
    AUTO
  );
  return { activites: data ?? [], isLoading, error, mutate };
}

export function useDashboardRecrutements() {
  const { data, error, isLoading } = useSWR<
    Array<{
      id: number;
      titre: string;
      departement: string;
      cible_candidats: number;
      statut: string;
      candidats_count: number;
    }>
  >("/dashboard/recrutements", fetchDashboardRecrutementsList, AUTO);

  return { recrutements: data ?? [], isLoading, error };
}

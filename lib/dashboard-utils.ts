import type {
  ActiviteLog,
  DashboardStats,
  DepartementsRepartition,
  PresenceChartPoint,
} from "@/lib/types";

const DEPT_COLORS = ["#2F5F9D", "#1F3F73", "#3B82F6", "#0D9488", "#F2C94C", "#6366F1", "#64748B"];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function record(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function sparkline(value: number, length = 8): number[] {
  return Array.from({ length }, () => value);
}

export function normalizeDashboardStats(raw: unknown): DashboardStats {
  const o = record(raw);

  if ("total_employes" in o || "totalEmployes" in o) {
    const tendances = record(o.tendances);
    const sparklines = record(o.sparklines);
    return {
      total_employes: num(o.total_employes ?? o.totalEmployes),
      presents_aujourd_hui: num(o.presents_aujourd_hui ?? o.presentsAujourdHui),
      masse_salariale: num(o.masse_salariale ?? o.masseSalariale),
      recrutements_ouverts: num(o.recrutements_ouverts ?? o.recrutementsOuverts),
      tendances: {
        employes: num(tendances.employes),
        presents: num(tendances.presents),
        masse_salariale: num(tendances.masse_salariale ?? tendances.masseSalariale),
        recrutements: num(tendances.recrutements),
      },
      sparklines: {
        employes: Array.isArray(sparklines.employes) ? (sparklines.employes as number[]) : sparkline(num(o.total_employes)),
        presents: Array.isArray(sparklines.presents) ? (sparklines.presents as number[]) : sparkline(num(o.presents_aujourd_hui)),
        masse_salariale: Array.isArray(sparklines.masse_salariale ?? sparklines.masseSalariale)
          ? ((sparklines.masse_salariale ?? sparklines.masseSalariale) as number[])
          : sparkline(num(o.masse_salariale)),
        recrutements: Array.isArray(sparklines.recrutements)
          ? (sparklines.recrutements as number[])
          : sparkline(num(o.recrutements_ouverts)),
      },
    };
  }

  const employes = record(o.employes);
  const presences = record(o.presences);
  const paie = record(o.paie);
  const recrutement = record(o.recrutement);

  const totalEmployes = num(employes.total);
  const presents = num(presences.presents);
  const masse = num(paie.masseSalarialeTotal ?? paie.masse_salariale);
  const offresOuvertes = num(recrutement.offresOuvertes ?? recrutement.offres_ouvertes);
  const nouveauxCeMois = num(employes.nouveauxCeMois ?? employes.nouveaux_ce_mois);
  const tauxPresence = num(presences.tauxAujourdhui ?? presences.taux_aujourdhui);

  return {
    total_employes: totalEmployes,
    presents_aujourd_hui: presents,
    masse_salariale: masse,
    recrutements_ouverts: offresOuvertes,
    tendances: {
      employes: nouveauxCeMois,
      presents: tauxPresence,
      masse_salariale: 0,
      recrutements: num(recrutement.candidaturesEnCours ?? recrutement.candidatures_en_cours),
    },
    sparklines: {
      employes: sparkline(totalEmployes),
      presents: sparkline(presents),
      masse_salariale: sparkline(masse),
      recrutements: sparkline(offresOuvertes),
    },
  };
}

export function normalizePresencesChart(raw: unknown): PresenceChartPoint[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((row) => {
    const r = record(row);
    const dateStr = String(r.date ?? r.mois ?? "");
    const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
    const mois = Number.isNaN(d.getTime())
      ? String(r.mois ?? dateStr)
      : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    return {
      mois,
      presents: num(r.presents),
      absents: num(r.absents),
      retards: num(r.retards),
    };
  });
}

export function isDailyPresencesChart(points: PresenceChartPoint[]): boolean {
  return points.length > 14;
}

export function normalizeDepartements(raw: unknown): DepartementsRepartition[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((row, index) => {
    const r = record(row);
    return {
      name: String(r.departement ?? r.name ?? `Département ${index + 1}`),
      value: num(r.effectif ?? r.value),
      color: String(r.color ?? DEPT_COLORS[index % DEPT_COLORS.length]),
    };
  });
}

export function normalizeActiviteLogs(raw: unknown): ActiviteLog[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((row) => {
    const r = record(row);
    const emp = record(r.employe);
    return {
      id: num(r.id),
      type: String(r.type ?? "activite"),
      description: String(r.description ?? ""),
      employe_id: num(r.employe_id ?? r.employeId) || null,
      meta: (r.meta as string | null) ?? null,
      created_at: String(r.created_at ?? r.createdAt ?? ""),
      employe_nom: (emp.nom as string | undefined) ?? (r.employe_nom as string | undefined) ?? null,
      employe_prenom:
        (emp.prenom as string | undefined) ?? (r.employe_prenom as string | undefined) ?? null,
    };
  });
}

export type DashboardRecrutementItem = {
  id: number;
  titre: string;
  departement: string;
  cible_candidats: number;
  statut: string;
  candidats_count: number;
};

export function normalizeDashboardRecrutements(raw: unknown): DashboardRecrutementItem[] {
  if (Array.isArray(raw)) {
    return raw.map((row) => {
      const r = record(row);
      return {
        id: num(r.id),
        titre: String(r.titre ?? "Offre"),
        departement: String(r.departement ?? "—"),
        cible_candidats: num(r.cible_candidats ?? r.cibleCandidats) || 1,
        statut: String(r.statut ?? "ouverte"),
        candidats_count: num(r.candidats_count ?? r.candidatsCount),
      };
    });
  }
  return [];
}

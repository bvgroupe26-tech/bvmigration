export type PublicStatsPayload = {
  total_employes: number;
  presents_aujourd_hui: number;
  masse_salariale: number;
  recrutements_ouverts: number;
  total_candidats: number;
  satisfaction: number;
};

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizePublicStats(raw: unknown): PublicStatsPayload {
  const o = rec(raw);
  const employes = rec(o.employes);
  const presences = rec(o.presences);
  const recrutement = rec(o.recrutement);
  const paie = rec(o.paie);

  return {
    total_employes: num(employes.total ?? o.total_employes ?? o.totalEmployes),
    presents_aujourd_hui: num(
      presences.presents ?? presences.presents_aujourd_hui ?? o.presents_aujourd_hui
    ),
    masse_salariale: num(
      paie.masseSalarialeTotal ??
        paie.masse_salariale ??
        o.masse_salariale ??
        o.masseSalariale
    ),
    recrutements_ouverts: num(
      recrutement.offresOuvertes ?? recrutement.offres_ouvertes ?? o.recrutements_ouverts
    ),
    total_candidats: num(
      recrutement.candidaturesEnCours ?? recrutement.candidatures_en_cours ?? o.total_candidats
    ),
    satisfaction: num(o.satisfaction ?? employes.satisfaction),
  };
}

import type { Paie } from "@/lib/types";
import type { PaieBulletin } from "@/lib/employee/types";

export type PaieSkipReason =
  | "deja_existant"
  | "statut_inactif"
  | "statut_suspendu"
  | "non_embauche"
  | "depart_avant_periode"
  | "salaire_zero";

export type PaieSkipSummary = {
  deja_existant: number;
  statut_inactif: number;
  statut_suspendu: number;
  non_embauche: number;
  depart_avant_periode: number;
  salaire_zero: number;
};

export type PaieSkippedEntry = {
  employeId: number;
  nom: string;
  prenom: string;
  reason: PaieSkipReason;
  message: string;
};

export type GeneratePaieResult = {
  generated: number;
  skipped: number;
  summary?: PaieSkipSummary;
  skippedDetails?: PaieSkippedEntry[];
  bulletins?: Paie[];
};

export const PAIE_SKIP_REASON_LABELS: Record<PaieSkipReason, string> = {
  deja_existant: "Bulletin déjà existant",
  statut_inactif: "Inactif / archivé",
  statut_suspendu: "Suspendu",
  non_embauche: "Pas encore embauché sur la période",
  depart_avant_periode: "Départ avant le mois cible",
  salaire_zero: "Salaire de base nul",
};

type ProrataSource = Paie | PaieBulletin | Record<string, unknown>;

export function getJoursTravailles(source: ProrataSource): number | null {
  const o = source as Record<string, unknown>;
  const v = o.jours_travailles ?? o.joursTravailles;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function getJoursPeriode(source: ProrataSource): number | null {
  const o = source as Record<string, unknown>;
  const v = o.jours_periode ?? o.joursPeriode;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function formatProrata(source: ProrataSource): string | null {
  const joursTravailles = getJoursTravailles(source);
  const joursPeriode = getJoursPeriode(source);
  if (
    joursTravailles != null &&
    joursPeriode != null &&
    joursTravailles < joursPeriode
  ) {
    return `Prorata : ${joursTravailles}/${joursPeriode} jours`;
  }
  return null;
}

export function normalizeGeneratePaieResult(raw: unknown): GeneratePaieResult {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const summaryRaw = o.summary as Record<string, unknown> | undefined;
  const summary: PaieSkipSummary | undefined = summaryRaw
    ? {
        deja_existant: Number(summaryRaw.deja_existant ?? summaryRaw.dejaExistant) || 0,
        statut_inactif: Number(summaryRaw.statut_inactif ?? summaryRaw.statutInactif) || 0,
        statut_suspendu: Number(summaryRaw.statut_suspendu ?? summaryRaw.statutSuspendu) || 0,
        non_embauche: Number(summaryRaw.non_embauche ?? summaryRaw.nonEmbauche) || 0,
        depart_avant_periode:
          Number(summaryRaw.depart_avant_periode ?? summaryRaw.departAvantPeriode) || 0,
        salaire_zero: Number(summaryRaw.salaire_zero ?? summaryRaw.salaireZero) || 0,
      }
    : undefined;

  const skippedDetails = Array.isArray(o.skippedDetails)
    ? (o.skippedDetails as PaieSkippedEntry[])
    : undefined;

  return {
    generated: Number(o.generated) || 0,
    skipped: Number(o.skipped) || 0,
    summary,
    skippedDetails,
    bulletins: Array.isArray(o.bulletins) ? normalizePaieList(o.bulletins) : undefined,
  };
}

function paieNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function paieRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function paiePick(o: Record<string, unknown>, snake: string, camel: string): unknown {
  return o[snake] ?? o[camel];
}

function paieStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function paieOptionalNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizePaie(raw: unknown): Paie {
  const o = paieRecord(raw);
  const emp = paieRecord(o.employe);
  const jt = paiePick(o, "jours_travailles", "joursTravailles");
  const jp = paiePick(o, "jours_periode", "joursPeriode");

  return {
    id: paieNum(o.id),
    employe_id: paieNum(paiePick(o, "employe_id", "employeId")),
    mois: String(o.mois ?? ""),
    annee: paieNum(o.annee),
    salaire_base: paieNum(paiePick(o, "salaire_base", "salaireBase")),
    prime_transport: paieNum(paiePick(o, "prime_transport", "primeTransport")),
    prime_logement: paieNum(paiePick(o, "prime_logement", "primeLogement")),
    prime_performance: paieNum(paiePick(o, "prime_performance", "primePerformance")),
    autres_primes: paieNum(paiePick(o, "autres_primes", "autresPrimes")),
    cnss: paieNum(o.cnss),
    impot: paieNum(o.impot),
    autres_retenues: paieNum(paiePick(o, "autres_retenues", "autresRetenues")),
    salaire_net: paieNum(paiePick(o, "salaire_net", "salaireNet")),
    statut: String(o.statut ?? "en_attente") as Paie["statut"],
    date_paiement: paieStr(paiePick(o, "date_paiement", "datePaiement")),
    jours_travailles: paieOptionalNum(jt),
    jours_periode: paieOptionalNum(jp),
    created_at: String(paiePick(o, "created_at", "createdAt") ?? ""),
    employe_nom: paieStr(emp.nom ?? paiePick(o, "employe_nom", "employeNom")) ?? undefined,
    employe_prenom: paieStr(emp.prenom ?? paiePick(o, "employe_prenom", "employePrenom")) ?? undefined,
    employe_poste: paieStr(emp.poste ?? paiePick(o, "employe_poste", "employePoste")),
  };
}

export function normalizePaieList(raw: unknown): Paie[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizePaie);
}

export type PaieStatsPayload = {
  total: number;
  payes: number;
  en_attente: number;
  annules: number;
  masse_salariale: number;
  masse_payee: number;
};

export function normalizePaieStats(raw: unknown): PaieStatsPayload {
  const o = paieRecord(raw);
  return {
    total: paieNum(o.total),
    payes: paieNum(o.payes ?? o.paye),
    en_attente: paieNum(o.en_attente ?? o.enAttente),
    annules: paieNum(o.annules ?? o.annule),
    masse_salariale: paieNum(
      o.masse_salariale ?? o.masseSalarialeNet ?? o.masseSalariale ?? o.masse_salariale_net
    ),
    masse_payee: paieNum(o.masse_payee ?? o.massePayee ?? o.masseSalarialePayee),
  };
}

export function normalizePaieEvolution(
  raw: unknown
): Array<{ mois: string; masse: number }> {
  if (!Array.isArray(raw)) return [];
  const MOIS = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc",
  ];
  return raw.map((row) => {
    const r = paieRecord(row);
    const m = paieNum(r.mois);
    const annee = paieNum(r.annee);
    const label =
      m >= 1 && m <= 12
        ? `${MOIS[m - 1]} ${annee || ""}`.trim()
        : String(r.mois ?? "—");
    return {
      mois: label,
      masse: paieNum(r.masse ?? r.masseSalariale ?? r.masse_salariale),
    };
  });
}

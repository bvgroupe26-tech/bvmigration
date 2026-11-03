import type {
  BudgetCategorie,
  BudgetDepense,
  BudgetDepenseStatut,
  BudgetEnveloppe,
  BudgetEnveloppeStatut,
  Candidature,
  CandidatureStatut,
  Competence,
  CompetenceNiveau,
  Evaluation,
  Formation,
  FormationType,
  Offre,
  OffreStatut,
  TypeContrat,
} from "@/lib/types";

type Rec = Record<string, unknown>;

function rec(v: unknown): Rec {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
}

function list(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const o = rec(raw);
  if (Array.isArray(o.data)) return o.data;
  if (Array.isArray(o.items)) return o.items;
  return [];
}

/** Première valeur définie parmi la clé snake_case et son équivalent camelCase. */
function pick(o: Rec, snake: string): unknown {
  if (o[snake] !== undefined) return o[snake];
  const camel = snake.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return o[camel];
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function strOrNull(v: unknown): string | null {
  return v == null || v === "" ? null : String(v);
}

const LEGACY_DEPENSE_STATUT: Record<string, BudgetDepenseStatut> = {
  en_attente: "soumise",
  approuve: "validee",
  refuse: "refusee",
  paye: "payee",
};

const DEPENSE_STATUTS: BudgetDepenseStatut[] = [
  "brouillon",
  "soumise",
  "validee_n1",
  "validee",
  "refusee",
  "payee",
  "annulee",
];

function normalizeDepenseStatut(s: string): BudgetDepenseStatut {
  if ((DEPENSE_STATUTS as string[]).includes(s)) return s as BudgetDepenseStatut;
  return LEGACY_DEPENSE_STATUT[s] ?? "soumise";
}

/** Date ISO / Date / "YYYY-MM-DD HH:mm" → "YYYY-MM-DD" (jour civil tel que stocké). */
function dateOnly(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = v instanceof Date ? v.toISOString() : String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** Date-heure normalisée en ISO (remplace l'espace SQLite par "T"). */
function dateTime(v: unknown): string {
  if (v == null || v === "") return "";
  return v instanceof Date ? v.toISOString() : String(v).replace(" ", "T");
}

function employeFields(o: Rec) {
  const emp = rec(o.employe);
  return {
    employe_nom: str(pick(o, "employe_nom") ?? emp.nom) || undefined,
    employe_prenom: str(pick(o, "employe_prenom") ?? emp.prenom) || undefined,
    employe_poste: strOrNull(pick(o, "employe_poste") ?? emp.poste),
  };
}

// ============ Recrutement ============

export function normalizeOffre(raw: unknown): Offre {
  const o = rec(raw);
  const count = rec(o._count);
  return {
    id: num(o.id),
    titre: str(o.titre),
    departement: strOrNull(o.departement),
    type_contrat: (strOrNull(pick(o, "type_contrat")) as TypeContrat | null) ?? null,
    description: strOrNull(o.description),
    competences_requises: strOrNull(pick(o, "competences_requises")),
    cible_candidats: num(pick(o, "cible_candidats")) || 10,
    date_publication: dateTime(pick(o, "date_publication")),
    date_cloture: dateOnly(pick(o, "date_cloture")),
    statut: (str(o.statut) || "ouverte") as OffreStatut,
    candidats_count: num(pick(o, "candidats_count") ?? count.candidatures),
  };
}

export function normalizeOffreList(raw: unknown): Offre[] {
  return list(raw).map(normalizeOffre);
}

export function normalizeCandidature(raw: unknown): Candidature {
  const o = rec(raw);
  return {
    id: num(o.id),
    offre_id: num(pick(o, "offre_id")),
    nom: str(o.nom),
    prenom: str(o.prenom),
    email: strOrNull(o.email),
    telephone: strOrNull(o.telephone),
    cv_path: strOrNull(pick(o, "cv_path")),
    lettre_motivation: strOrNull(pick(o, "lettre_motivation")),
    statut: (str(o.statut) || "recu") as CandidatureStatut,
    date_candidature: dateTime(pick(o, "date_candidature")),
  };
}

export function normalizeCandidatureList(raw: unknown): Candidature[] {
  return list(raw).map(normalizeCandidature);
}

export type OffresStats = {
  ouvertes: number;
  fermees: number;
  pourvues: number;
  total: number;
  total_candidats: number;
};

export function normalizeOffresStats(raw: unknown): OffresStats {
  const o = rec(raw);
  return {
    ouvertes: num(o.ouvertes),
    fermees: num(o.fermees),
    pourvues: num(o.pourvues),
    total: num(o.totalOffres ?? o.total_offres ?? o.total),
    total_candidats: num(o.totalCandidatures ?? o.total_candidatures ?? o.total_candidats),
  };
}

// ============ Développement RH ============

export function normalizeCompetence(raw: unknown): Competence {
  const o = rec(raw);
  return {
    id: num(o.id),
    employe_id: num(pick(o, "employe_id")),
    nom_competence: str(pick(o, "nom_competence")),
    niveau: (str(o.niveau) || "debutant") as CompetenceNiveau,
    categorie: strOrNull(o.categorie),
    ...employeFields(o),
  };
}

export function normalizeCompetenceList(raw: unknown): Competence[] {
  return list(raw).map(normalizeCompetence);
}

export function normalizeFormation(raw: unknown): Formation {
  const o = rec(raw);
  const { employe_nom, employe_prenom } = employeFields(o);
  return {
    id: num(o.id),
    employe_id: num(pick(o, "employe_id")),
    titre: str(o.titre),
    type: (str(o.type) || "formation") as FormationType,
    organisme: strOrNull(o.organisme),
    date_obtention: dateOnly(pick(o, "date_obtention")),
    date_expiration: dateOnly(pick(o, "date_expiration")),
    fichier_path: strOrNull(pick(o, "fichier_path")),
    employe_nom,
    employe_prenom,
  };
}

export function normalizeFormationList(raw: unknown): Formation[] {
  return list(raw).map(normalizeFormation);
}

export function normalizeEvaluation(raw: unknown): Evaluation {
  const o = rec(raw);
  return {
    id: num(o.id),
    employe_id: num(pick(o, "employe_id")),
    periode: str(o.periode),
    note_globale: num(pick(o, "note_globale")),
    ponctualite: num(o.ponctualite),
    qualite_travail: num(pick(o, "qualite_travail")),
    travail_equipe: num(pick(o, "travail_equipe")),
    initiative: num(o.initiative),
    commentaire: strOrNull(o.commentaire),
    evaluateur: strOrNull(o.evaluateur),
    date_evaluation: dateOnly(pick(o, "date_evaluation")) ?? "",
    ...employeFields(o),
  };
}

export function normalizeEvaluationList(raw: unknown): Evaluation[] {
  return list(raw).map(normalizeEvaluation);
}

// ============ Budget ============

export function normalizeBudgetCategorie(raw: unknown): BudgetCategorie {
  const o = rec(raw);
  return {
    id: num(o.id),
    code: str(o.code),
    libelle: str(o.libelle),
    description: strOrNull(o.description),
    created_at: dateTime(pick(o, "created_at")),
  };
}

export function normalizeBudgetCategorieList(raw: unknown): BudgetCategorie[] {
  return list(raw).map(normalizeBudgetCategorie);
}

export function normalizeBudgetEnveloppe(raw: unknown): BudgetEnveloppe {
  const o = rec(raw);
  const prevu = num(pick(o, "montant_prevu"));
  const realise = num(pick(o, "montant_realise"));
  const ecartRaw = o.ecart;
  return {
    id: num(o.id),
    libelle: str(o.libelle),
    departement: strOrNull(o.departement),
    annee: num(o.annee),
    montant_prevu: prevu,
    statut: (str(o.statut) || "actif") as BudgetEnveloppeStatut,
    notes: strOrNull(o.notes),
    created_at: dateTime(pick(o, "created_at")),
    updated_at: dateTime(pick(o, "updated_at")),
    montant_realise: realise,
    montant_en_attente: num(pick(o, "montant_en_attente")),
    ecart: ecartRaw == null ? prevu - realise : num(ecartRaw),
  };
}

export function normalizeBudgetEnveloppeList(raw: unknown): BudgetEnveloppe[] {
  return list(raw).map(normalizeBudgetEnveloppe);
}

export function normalizeBudgetDepense(raw: unknown): BudgetDepense {
  const o = rec(raw);
  const enveloppe = rec(o.enveloppe);
  const categorie = rec(o.categorie);
  const categorieId = pick(o, "categorie_id");
  return {
    id: num(o.id),
    enveloppe_id: num(pick(o, "enveloppe_id")),
    categorie_id: categorieId == null ? null : num(categorieId),
    libelle: str(o.libelle),
    montant: num(pick(o, "montant_ttc") ?? o.montant),
    date_depense: dateOnly(pick(o, "date_depense")) ?? "",
    fournisseur: strOrNull(o.fournisseur),
    reference_piece: strOrNull(pick(o, "reference_piece")),
    statut: normalizeDepenseStatut(str(o.statut)),
    commentaire: strOrNull(o.commentaire),
    created_at: dateTime(pick(o, "created_at")),
    enveloppe_libelle: str(pick(o, "enveloppe_libelle") ?? enveloppe.libelle) || undefined,
    categorie_libelle: strOrNull(pick(o, "categorie_libelle") ?? categorie.libelle),
  };
}

export function normalizeBudgetDepenseList(raw: unknown): BudgetDepense[] {
  return list(raw).map(normalizeBudgetDepense);
}

// ============ Payloads ============

/** Retire les champs vides ("" / null / undefined) avant envoi : les DTO Nest refusent "" sur les champs optionnels typés. */
export function stripEmpty<T extends Record<string, unknown>>(data: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === "" || v === null || v === undefined) continue;
    (out as Rec)[k] = v;
  }
  return out;
}

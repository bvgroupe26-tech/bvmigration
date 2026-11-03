import type { Paie } from "@/lib/types";
import { normalizePaie } from "@/lib/paie-utils";

export type PeriodeStatut = "ouverte" | "calculee" | "validee" | "payee" | "cloturee";
export type BulletinStatut = "brouillon" | "calcule" | "valide" | "paye" | "annule" | "en_attente";
export type BulletinType = "normal" | "rappel" | "contre_bulletin";
export type MoteurPaie = "legacy" | "v2";
export type TypeRubrique = "gain" | "retenue" | "cotisation" | "impot" | "info";
export type ModeCalculRubrique = "fixe" | "base_x_taux" | "bareme" | "variable";
export type SourceVariable = "manuel" | "presence" | "absence";
export type ModePaiement = "especes" | "virement" | "cheque" | "mobile_money" | "carte";

export const PERIODE_ETAPES: PeriodeStatut[] = ["ouverte", "calculee", "validee", "payee", "cloturee"];

export const PERIODE_STATUT_LABELS: Record<PeriodeStatut, string> = {
  ouverte: "Ouverte",
  calculee: "Calculée",
  validee: "Validée",
  payee: "Payée",
  cloturee: "Clôturée",
};

export const BULLETIN_STATUT_LABELS: Record<BulletinStatut, string> = {
  brouillon: "Brouillon",
  calcule: "Calculé",
  valide: "Validé",
  paye: "Payé",
  annule: "Annulé",
  en_attente: "En attente",
};

export const BULLETIN_TYPE_LABELS: Record<BulletinType, string> = {
  normal: "Normal",
  rappel: "Rappel",
  contre_bulletin: "Contre-bulletin",
};

export const TYPE_RUBRIQUE_LABELS: Record<TypeRubrique, string> = {
  gain: "Gain",
  retenue: "Retenue",
  cotisation: "Cotisation",
  impot: "Impôt",
  info: "Information",
};

export const MODE_CALCUL_LABELS: Record<ModeCalculRubrique, string> = {
  fixe: "Montant fixe",
  base_x_taux: "Base × taux",
  bareme: "Barème",
  variable: "Variable de période",
};

export const SOURCE_VARIABLE_LABELS: Record<SourceVariable, string> = {
  manuel: "Saisie",
  presence: "Présences",
  absence: "Absences",
};

export const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  mobile_money: "Mobile Money",
  carte: "Carte",
};

export const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function periodeLabel(mois: number | string, annee: number): string {
  const m = Number(mois);
  return m >= 1 && m <= 12 ? `${MOIS_NOMS[m - 1]} ${annee}` : `${mois}/${annee}`;
}

export function formatFcfa(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Math.round(v).toLocaleString("fr-FR")} F`;
}

export function formatMontant(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "";
  return Math.round(v).toLocaleString("fr-FR");
}

export function formatTaux(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "";
  return `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %`;
}

export type PeriodBulletinRow = {
  id: number;
  numero: string | null;
  employeId: number;
  employeNom: string;
  employePrenom: string;
  employePoste: string | null;
  statut: BulletinStatut;
  type: BulletinType;
  moteur: MoteurPaie;
  brut: number | null;
  netAPayer: number | null;
};

export type PeriodCompteurs = {
  total: number;
  brouillon: number;
  calcule: number;
  valide: number;
  paye: number;
  annule: number;
  masseBrute: number;
  masseNette: number;
  chargesPatronales: number;
};

export type PayrollPeriod = {
  id: number;
  annee: number;
  mois: number;
  statut: PeriodeStatut;
  clotureAt: string | null;
  createdAt: string | null;
  nbBulletins: number;
  bulletins: PeriodBulletinRow[];
  compteurs: PeriodCompteurs | null;
};

export type PayrollVariableRow = {
  id: number | null;
  employeId: number;
  employeNom: string;
  payRuleId: number;
  payRuleCode: string;
  payRuleLibelle: string;
  quantite: number | null;
  montant: number | null;
  source: SourceVariable;
  commentaire: string;
};

export type PayslipLine = {
  code: string;
  libelle: string;
  type: TypeRubrique;
  ordre: number;
  base: number | null;
  taux: number | null;
  quantite: number | null;
  montantSalarial: number;
  montantPatronal: number;
  imposable: boolean;
};

export type BulletinTotaux = {
  brut: number | null;
  brutImposable: number | null;
  netImposable: number | null;
  totalCotisSal: number | null;
  totalCotisPat: number | null;
  netAPayer: number | null;
};

export type EmployeSnapshot = {
  nom: string;
  prenom: string;
  matricule: string | null;
  poste: string | null;
  departement: string | null;
  numeroCnss: string | null;
  niu: string | null;
  categorie: string | null;
  echelon: string | null;
  dateEmbauche: string | null;
  modePaiement: string | null;
  banque: string | null;
  rib: string | null;
  mobileMoney: string | null;
};

export type EmployeurSnapshot = {
  raisonSociale: string | null;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  niu: string | null;
  rccm: string | null;
  numeroCnssEmployeur: string | null;
  logoUrl: string | null;
  conventionCollective: string | null;
};

export type BulletinDetail = {
  id: number;
  numero: string | null;
  type: BulletinType;
  statut: BulletinStatut;
  moteur: MoteurPaie;
  mois: string;
  annee: number;
  periodId: number | null;
  employeId: number;
  datePaiement: string | null;
  validatedAt: string | null;
  annuleBulletinId: number | null;
  lignes: PayslipLine[];
  totaux: BulletinTotaux;
  cumuls: Record<string, number>;
  employe: EmployeSnapshot;
  employeur: EmployeurSnapshot | null;
  legacy: Paie;
};

export type EmployeurSettings = EmployeurSnapshot;

export type PayRule = {
  id: number;
  code: string;
  libelle: string;
  type: TypeRubrique;
  ordre: number;
  imposable: boolean;
  soumisCnss: boolean;
  mode: ModeCalculRubrique;
  baseCode: string | null;
  tauxSalarialCode: string | null;
  tauxPatronalCode: string | null;
  plafondCode: string | null;
  baremeCode: string | null;
  actif: boolean;
  description: string | null;
};

export type PayParameter = {
  id: number;
  code: string;
  valeur: number;
  dateDebut: string;
  dateFin: string | null;
  description: string | null;
};

export type TaxBracket = {
  id: number;
  bareme: string;
  borneMin: number;
  borneMax: number | null;
  taux: number;
  dateDebut: string;
  dateFin: string | null;
};

export type EmployeeRubrique = {
  id: number;
  employeId: number;
  payRuleId: number;
  payRuleCode: string;
  payRuleLibelle: string;
  montant: number | null;
  taux: number | null;
  dateDebut: string;
  dateFin: string | null;
};

export type PaieSettingsStatut = {
  pret: boolean;
  parametresManquants: string[];
  employeurIncomplet: string[];
};

export type VerifyBulletinResult = {
  valide: boolean;
  periode: string | null;
  employe: string | null;
  netAPayer: number | null;
  hashOk: boolean;
  numero: string | null;
};

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function pick(o: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null) return o[k];
  }
  return undefined;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function optNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function bool(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

function dateStr(v: unknown): string | null {
  const s = str(v);
  return s ? s.slice(0, 10) : null;
}

function asArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const o = rec(raw);
  for (const k of ["items", "data", "rows", "results"]) {
    if (Array.isArray(o[k])) return o[k] as unknown[];
  }
  return [];
}

export function normalizeList<T>(raw: unknown, fn: (row: unknown) => T): T[] {
  return asArray(raw).map(fn);
}

function employeNames(o: Record<string, unknown>) {
  const emp = rec(o.employe);
  return {
    nom: String(pick(emp, "nom") ?? pick(o, "employeNom", "employe_nom") ?? ""),
    prenom: String(pick(emp, "prenom") ?? pick(o, "employePrenom", "employe_prenom") ?? ""),
    poste: str(pick(emp, "poste") ?? pick(o, "employePoste", "employe_poste")),
  };
}

export function normalizePeriodBulletin(raw: unknown): PeriodBulletinRow {
  const o = rec(raw);
  const n = employeNames(o);
  return {
    id: num(o.id),
    numero: str(o.numero),
    employeId: num(pick(o, "employeId", "employe_id")),
    employeNom: n.nom,
    employePrenom: n.prenom,
    employePoste: n.poste,
    statut: (str(o.statut) ?? "brouillon") as BulletinStatut,
    type: (str(o.type) ?? "normal") as BulletinType,
    moteur: (str(o.moteur) ?? "v2") as MoteurPaie,
    brut: optNum(o.brut),
    netAPayer: optNum(pick(o, "netAPayer", "net_a_payer", "salaireNet", "salaire_net")),
  };
}

function normalizeCompteurs(raw: unknown): PeriodCompteurs | null {
  const o = rec(raw);
  if (Object.keys(o).length === 0) return null;
  return {
    total: num(o.total),
    brouillon: num(o.brouillon),
    calcule: num(o.calcule),
    valide: num(o.valide),
    paye: num(o.paye),
    annule: num(o.annule),
    masseBrute: num(pick(o, "masseBrute", "masse_brute", "brut")),
    masseNette: num(pick(o, "masseNette", "masse_nette", "netAPayer", "net")),
    chargesPatronales: num(pick(o, "chargesPatronales", "charges_patronales", "totalCotisPat")),
  };
}

export function normalizePeriod(raw: unknown): PayrollPeriod {
  const o = rec(raw);
  const bulletins = Array.isArray(o.bulletins) ? o.bulletins.map(normalizePeriodBulletin) : [];
  const count = rec(o._count);
  return {
    id: num(o.id),
    annee: num(o.annee),
    mois: num(o.mois),
    statut: (str(o.statut) ?? "ouverte") as PeriodeStatut,
    clotureAt: str(pick(o, "clotureAt", "cloture_at")),
    createdAt: str(pick(o, "createdAt", "created_at")),
    nbBulletins: num(pick(o, "nbBulletins", "nb_bulletins") ?? count.bulletins ?? bulletins.length),
    bulletins,
    compteurs: normalizeCompteurs(o.compteurs),
  };
}

export function normalizeVariable(raw: unknown): PayrollVariableRow {
  const o = rec(raw);
  const rule = rec(o.payRule);
  const n = employeNames(o);
  return {
    id: optNum(o.id),
    employeId: num(pick(o, "employeId", "employe_id")),
    employeNom: `${n.prenom} ${n.nom}`.trim(),
    payRuleId: num(pick(o, "payRuleId", "pay_rule_id") ?? rule.id),
    payRuleCode: String(pick(rule, "code") ?? pick(o, "payRuleCode", "code") ?? ""),
    payRuleLibelle: String(pick(rule, "libelle") ?? pick(o, "payRuleLibelle", "libelle") ?? ""),
    quantite: optNum(o.quantite),
    montant: optNum(o.montant),
    source: (str(o.source) ?? "manuel") as SourceVariable,
    commentaire: String(o.commentaire ?? ""),
  };
}

function normalizeLine(raw: unknown): PayslipLine {
  const o = rec(raw);
  return {
    code: String(o.code ?? ""),
    libelle: String(o.libelle ?? ""),
    type: (str(o.type) ?? "info") as TypeRubrique,
    ordre: num(o.ordre),
    base: optNum(o.base),
    taux: optNum(o.taux),
    quantite: optNum(o.quantite),
    montantSalarial: num(pick(o, "montantSalarial", "montant_salarial")),
    montantPatronal: num(pick(o, "montantPatronal", "montant_patronal")),
    imposable: bool(o.imposable),
  };
}

function normalizeEmployeSnapshot(raw: unknown, fallback: Record<string, unknown>): EmployeSnapshot {
  const s = rec(raw);
  const e = rec(fallback.employe);
  const get = (k: string) => str(pick(s, k) ?? pick(e, k));
  return {
    nom: String(pick(s, "nom") ?? pick(e, "nom") ?? ""),
    prenom: String(pick(s, "prenom") ?? pick(e, "prenom") ?? ""),
    matricule: get("matricule"),
    poste: get("poste"),
    departement: get("departement"),
    numeroCnss: get("numeroCnss"),
    niu: get("niu"),
    categorie: get("categorie"),
    echelon: get("echelon"),
    dateEmbauche: dateStr(pick(s, "dateEmbauche") ?? pick(e, "dateEmbauche")),
    modePaiement: get("modePaiement"),
    banque: get("banque"),
    rib: get("rib"),
    mobileMoney: get("mobileMoney"),
  };
}

export function normalizeEmployeur(raw: unknown): EmployeurSnapshot | null {
  const s = rec(raw);
  if (Object.keys(s).length === 0) return null;
  return {
    raisonSociale: str(s.raisonSociale),
    adresse: str(s.adresse),
    ville: str(s.ville),
    telephone: str(s.telephone),
    email: str(s.email),
    niu: str(s.niu),
    rccm: str(s.rccm),
    numeroCnssEmployeur: str(s.numeroCnssEmployeur),
    logoUrl: str(s.logoUrl),
    conventionCollective: str(s.conventionCollective),
  };
}

function normalizeCumuls(raw: unknown): Record<string, number> {
  const o = rec(raw);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(o)) {
    const n = optNum(v);
    if (n != null) out[k] = n;
  }
  return out;
}

export function normalizeBulletinDetail(raw: unknown): BulletinDetail {
  const o = rec(raw);
  const lignes = Array.isArray(o.lignes)
    ? o.lignes.map(normalizeLine).sort((a, b) => a.ordre - b.ordre)
    : [];
  const legacy = normalizePaie(raw);
  const employe = normalizeEmployeSnapshot(o.employeSnapshot, o);
  if (!legacy.employe_nom && employe.nom) legacy.employe_nom = employe.nom;
  if (!legacy.employe_prenom && employe.prenom) legacy.employe_prenom = employe.prenom;
  if (!legacy.employe_poste && employe.poste) legacy.employe_poste = employe.poste;
  return {
    id: num(o.id),
    numero: str(o.numero),
    type: (str(o.type) ?? "normal") as BulletinType,
    statut: (str(o.statut) ?? "en_attente") as BulletinStatut,
    moteur: (str(o.moteur) ?? (lignes.length > 0 ? "v2" : "legacy")) as MoteurPaie,
    mois: String(o.mois ?? ""),
    annee: num(o.annee),
    periodId: optNum(pick(o, "periodId", "period_id")),
    employeId: num(pick(o, "employeId", "employe_id")),
    datePaiement: str(pick(o, "datePaiement", "date_paiement")),
    validatedAt: str(pick(o, "validatedAt", "validated_at")),
    annuleBulletinId: optNum(pick(o, "annuleBulletinId", "annule_bulletin_id")),
    lignes,
    totaux: {
      brut: optNum(o.brut),
      brutImposable: optNum(o.brutImposable),
      netImposable: optNum(o.netImposable),
      totalCotisSal: optNum(o.totalCotisSal),
      totalCotisPat: optNum(o.totalCotisPat),
      netAPayer: optNum(pick(o, "netAPayer", "salaireNet")),
    },
    cumuls: normalizeCumuls(o.cumuls),
    employe,
    employeur: normalizeEmployeur(o.employeurSnapshot),
    legacy,
  };
}

export function normalizePayRule(raw: unknown): PayRule {
  const o = rec(raw);
  return {
    id: num(o.id),
    code: String(o.code ?? ""),
    libelle: String(o.libelle ?? ""),
    type: (str(o.type) ?? "gain") as TypeRubrique,
    ordre: num(o.ordre),
    imposable: bool(o.imposable),
    soumisCnss: bool(o.soumisCnss),
    mode: (str(o.mode) ?? "fixe") as ModeCalculRubrique,
    baseCode: str(o.baseCode),
    tauxSalarialCode: str(o.tauxSalarialCode),
    tauxPatronalCode: str(o.tauxPatronalCode),
    plafondCode: str(o.plafondCode),
    baremeCode: str(o.baremeCode),
    actif: o.actif === undefined ? true : bool(o.actif),
    description: str(o.description),
  };
}

export function normalizePayParameter(raw: unknown): PayParameter {
  const o = rec(raw);
  return {
    id: num(o.id),
    code: String(o.code ?? ""),
    valeur: num(o.valeur),
    dateDebut: dateStr(o.dateDebut) ?? "",
    dateFin: dateStr(o.dateFin),
    description: str(o.description),
  };
}

export function normalizeTaxBracket(raw: unknown): TaxBracket {
  const o = rec(raw);
  return {
    id: num(o.id),
    bareme: String(o.bareme ?? ""),
    borneMin: num(o.borneMin),
    borneMax: optNum(o.borneMax),
    taux: num(o.taux),
    dateDebut: dateStr(o.dateDebut) ?? "",
    dateFin: dateStr(o.dateFin),
  };
}

export function normalizeEmployeeRubrique(raw: unknown): EmployeeRubrique {
  const o = rec(raw);
  const rule = rec(o.payRule);
  return {
    id: num(o.id),
    employeId: num(o.employeId),
    payRuleId: num(o.payRuleId ?? rule.id),
    payRuleCode: String(rule.code ?? ""),
    payRuleLibelle: String(rule.libelle ?? ""),
    montant: optNum(o.montant),
    taux: optNum(o.taux),
    dateDebut: dateStr(o.dateDebut) ?? "",
    dateFin: dateStr(o.dateFin),
  };
}

export function normalizeSettingsStatut(raw: unknown): PaieSettingsStatut {
  const o = rec(raw);
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  return {
    pret: bool(o.pret),
    parametresManquants: list(o.parametresManquants),
    employeurIncomplet: list(o.employeurIncomplet),
  };
}

export function normalizeVerify(raw: unknown): VerifyBulletinResult {
  const o = rec(raw);
  return {
    valide: bool(o.valide),
    periode: str(o.periode),
    employe: str(o.employe),
    netAPayer: optNum(o.netAPayer),
    hashOk: bool(o.hashOk),
    numero: str(o.numero),
  };
}

export function isAConfirmer(p: Pick<PayParameter, "description" | "valeur">): boolean {
  return (p.description ?? "").toUpperCase().includes("À CONFIRMER") || p.valeur === 0;
}

export function bulletinStatutBadge(s: BulletinStatut): "brouillon" | "info" | "warning" | "paye" | "annule" | "en_attente" {
  switch (s) {
    case "brouillon":
      return "brouillon";
    case "calcule":
      return "info";
    case "valide":
      return "warning";
    case "paye":
      return "paye";
    case "annule":
      return "annule";
    default:
      return "en_attente";
  }
}

export function periodeStatutBadge(s: PeriodeStatut): "ouverte" | "info" | "warning" | "paye" | "clos" {
  switch (s) {
    case "ouverte":
      return "ouverte";
    case "calculee":
      return "info";
    case "validee":
      return "warning";
    case "payee":
      return "paye";
    default:
      return "clos";
  }
}

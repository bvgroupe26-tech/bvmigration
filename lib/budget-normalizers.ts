import type {
  AlerteBudget,
  BudgetDepenseStatut,
  BudgetEnveloppeStatut,
  CategorieFinance,
  DepenseFinance,
  EnveloppeFinance,
  Fournisseur,
  HistoriqueDepense,
  ModePaiement,
  Paginated,
  ParametresFinance,
  PieceJointe,
  SyntheseFinance,
} from "@/lib/types-finance";

type Rec = Record<string, unknown>;

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const STATUTS: BudgetDepenseStatut[] = [
  "brouillon",
  "soumise",
  "validee_n1",
  "validee",
  "refusee",
  "payee",
  "annulee",
];

const LEGACY_STATUTS: Record<string, BudgetDepenseStatut> = {
  en_attente: "soumise",
  approuve: "validee",
  refuse: "refusee",
  paye: "payee",
};

const MODES: ModePaiement[] = ["especes", "virement", "cheque", "mobile_money", "carte"];

function rec(v: unknown): Rec {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Clé snake_case, ou son équivalent camelCase. */
function pick(o: Rec, snake: string): unknown {
  if (o[snake] !== undefined) return o[snake];
  const camel = snake.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return o[camel];
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function strOrNull(v: unknown): string | null {
  return v == null || v === "" ? null : String(v);
}

function dateOnly(v: unknown): string | null {
  if (v == null || v === "") return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function personName(v: unknown): string | null {
  const o = rec(v);
  const full = [str(o.prenom), str(o.nom)].filter(Boolean).join(" ").trim();
  return full || strOrNull(o.email) || null;
}

export function normalizeStatut(s: unknown): BudgetDepenseStatut {
  const v = str(s);
  if ((STATUTS as string[]).includes(v)) return v as BudgetDepenseStatut;
  return LEGACY_STATUTS[v] ?? "brouillon";
}

function normalizeMode(v: unknown): ModePaiement | null {
  const s = str(v);
  return (MODES as string[]).includes(s) ? (s as ModePaiement) : null;
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const o = rec(raw);
  if (Array.isArray(o.items)) return o.items;
  if (Array.isArray(o.data)) return o.data;
  return [];
}

export function normalizeFournisseur(raw: unknown): Fournisseur {
  const o = rec(raw);
  return {
    id: num(o.id),
    nom: str(o.nom),
    niu: strOrNull(o.niu),
    rccm: strOrNull(o.rccm),
    telephone: strOrNull(o.telephone),
    email: strOrNull(o.email),
    adresse: strOrNull(o.adresse),
    actif: o.actif === undefined ? true : Boolean(o.actif),
  };
}

export function normalizeFournisseurList(raw: unknown): Fournisseur[] {
  return unwrapList(raw).map(normalizeFournisseur);
}

function normalizePiece(raw: unknown): PieceJointe {
  const o = rec(raw);
  return {
    id: num(o.id),
    nom: str(o.nom) || "Pièce jointe",
    url: str(o.url),
    mime: strOrNull(o.mime),
    taille: num(o.taille),
    created_at: str(pick(o, "created_at")),
  };
}

function normalizeHistorique(raw: unknown): HistoriqueDepense {
  const o = rec(raw);
  const de = pick(o, "de_statut");
  return {
    id: num(o.id),
    de_statut: de == null || de === "" ? null : normalizeStatut(de),
    vers_statut: normalizeStatut(pick(o, "vers_statut")),
    commentaire: strOrNull(o.commentaire),
    user_nom: personName(o.user) ?? str(pick(o, "user_nom")) ?? "",
    created_at: str(pick(o, "created_at")),
  };
}

export function normalizeDepenseFinance(raw: unknown): DepenseFinance {
  const o = rec(raw);
  const enveloppe = rec(o.enveloppe);
  const categorie = rec(o.categorie);
  const fournisseurObj = rec(o.fournisseur);
  const fournisseurTexte = typeof o.fournisseur === "string" ? o.fournisseur : null;
  const ttc = num(pick(o, "montant_ttc") ?? o.montant);
  const ht = numOrNull(pick(o, "montant_ht")) ?? ttc;
  const categorieId = pick(o, "categorie_id");
  const fournisseurId = pick(o, "fournisseur_id");
  const demandeurId = pick(o, "demandeur_id");
  const id = num(o.id);
  return {
    id,
    numero: str(o.numero) || `DEP-${String(id).padStart(5, "0")}`,
    libelle: str(o.libelle),
    enveloppe_id: num(pick(o, "enveloppe_id") ?? enveloppe.id),
    enveloppe_libelle: strOrNull(pick(o, "enveloppe_libelle") ?? enveloppe.libelle),
    enveloppe_annee: numOrNull(enveloppe.annee),
    categorie_id: categorieId == null ? null : num(categorieId),
    categorie_libelle: strOrNull(pick(o, "categorie_libelle") ?? categorie.libelle),
    compte_syscohada: strOrNull(pick(categorie, "compte_syscohada") ?? pick(o, "compte_syscohada")),
    fournisseur_id: fournisseurId == null ? null : num(fournisseurId),
    fournisseur_nom: strOrNull(fournisseurObj.nom ?? pick(o, "fournisseur_nom") ?? fournisseurTexte),
    montant_ht: ht,
    taux_tva: num(pick(o, "taux_tva")),
    montant_tva: num(pick(o, "montant_tva")),
    montant_ttc: ttc,
    date_depense: dateOnly(pick(o, "date_depense")) ?? "",
    reference_piece: strOrNull(pick(o, "reference_piece")),
    commentaire: strOrNull(o.commentaire),
    statut: normalizeStatut(o.statut),
    mode_paiement: normalizeMode(pick(o, "mode_paiement")),
    reference_paiement: strOrNull(pick(o, "reference_paiement")),
    date_paiement: dateOnly(pick(o, "date_paiement")),
    motif_refus: strOrNull(pick(o, "motif_refus")),
    demandeur_id: demandeurId == null ? null : num(demandeurId),
    demandeur_nom: personName(o.demandeur),
    valide_le: strOrNull(pick(o, "valide_le")),
    created_at: str(pick(o, "created_at")),
    pieces: arr(pick(o, "pieces_jointes") ?? o.pieces).map(normalizePiece),
    historique: arr(o.historique)
      .map(normalizeHistorique)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

export function normalizeDepensePage(raw: unknown, fallbackLimit: number): Paginated<DepenseFinance> {
  const o = rec(raw);
  const items = unwrapList(raw).map(normalizeDepenseFinance);
  return {
    items,
    total: numOrNull(o.total) ?? items.length,
    page: numOrNull(o.page) ?? 1,
    limit: numOrNull(o.limit) ?? fallbackLimit,
  };
}

export function normalizeEnveloppeFinance(raw: unknown): EnveloppeFinance {
  const o = rec(raw);
  return {
    id: num(o.id),
    libelle: str(o.libelle),
    departement: strOrNull(o.departement),
    annee: num(o.annee),
    montant_prevu: num(pick(o, "montant_prevu")),
    statut: (str(o.statut) || "actif") as BudgetEnveloppeStatut,
    notes: strOrNull(o.notes),
    seuil_alerte_pct: numOrNull(pick(o, "seuil_alerte_pct")) ?? 80,
    bloquer_depassement: Boolean(pick(o, "bloquer_depassement")),
  };
}

export function normalizeEnveloppeFinanceList(raw: unknown): EnveloppeFinance[] {
  return unwrapList(raw).map(normalizeEnveloppeFinance);
}

export function normalizeCategorieFinance(raw: unknown): CategorieFinance {
  const o = rec(raw);
  return {
    id: num(o.id),
    code: str(o.code),
    libelle: str(o.libelle),
    description: strOrNull(o.description),
    compte_syscohada: strOrNull(pick(o, "compte_syscohada")),
  };
}

export function normalizeCategorieFinanceList(raw: unknown): CategorieFinance[] {
  return unwrapList(raw).map(normalizeCategorieFinance);
}

export function normalizeParametresFinance(raw: unknown): ParametresFinance {
  const o = rec(raw);
  return {
    taux_tva_defaut: numOrNull(pick(o, "taux_tva_defaut")) ?? 18,
    seuil_justificatif: num(pick(o, "seuil_justificatif")),
    seuil_validation_n2: num(pick(o, "seuil_validation_n2")),
    periode_close_jusquau: dateOnly(pick(o, "periode_close_jusquau")),
  };
}

function normalizeAlerte(v: unknown, taux: number, seuil: number): AlerteBudget {
  const s = str(v);
  if (s === "ok" || s === "seuil" || s === "depasse") return s;
  if (taux > 100) return "depasse";
  if (taux >= seuil) return "seuil";
  return "ok";
}

export function normalizeSyntheseFinance(raw: unknown, anneeFallback: number): SyntheseFinance {
  const o = rec(raw);
  const t = rec(o.totaux);
  const prevu = num(t.prevu);
  const engage = num(t.engage);
  const realise = num(t.realise);
  const tauxTotal = numOrNull(t.taux) ?? (prevu > 0 ? ((engage + realise) / prevu) * 100 : 0);

  const parMoisRaw = arr(pick(o, "depenses_par_mois"));
  const byMois = new Map<string, Rec>();
  parMoisRaw.forEach((row) => {
    const r = rec(row);
    const mois = str(r.mois).slice(-2).padStart(2, "0");
    byMois.set(mois, r);
  });

  return {
    annee: num(o.annee) || anneeFallback,
    totaux: {
      prevu,
      engage,
      realise,
      disponible: numOrNull(t.disponible) ?? prevu - engage - realise,
      en_attente: num(pick(t, "en_attente")),
      taux: Math.round(tauxTotal * 10) / 10,
    },
    par_enveloppe: arr(pick(o, "par_enveloppe")).map((row) => {
      const r = rec(row);
      const p = num(r.prevu ?? pick(r, "montant_prevu"));
      const e = num(r.engage);
      const re = num(r.realise);
      const seuil = numOrNull(pick(r, "seuil_alerte_pct")) ?? 80;
      const taux = numOrNull(r.taux) ?? (p > 0 ? ((e + re) / p) * 100 : 0);
      return {
        id: num(r.id),
        libelle: str(r.libelle),
        departement: strOrNull(r.departement),
        statut: (str(r.statut) || "actif") as BudgetEnveloppeStatut,
        annee: num(r.annee),
        prevu: p,
        engage: e,
        realise: re,
        en_attente: num(pick(r, "en_attente")),
        disponible: numOrNull(r.disponible) ?? p - e - re,
        taux: Math.round(taux * 10) / 10,
        seuil_alerte_pct: seuil,
        bloquer_depassement: Boolean(pick(r, "bloquer_depassement")),
        alerte: normalizeAlerte(r.alerte, taux, seuil),
      };
    }),
    par_categorie: arr(pick(o, "par_categorie")).map((row) => {
      const r = rec(row);
      return {
        id: num(r.id),
        code: str(r.code),
        libelle: str(r.libelle) || "Sans catégorie",
        compte_syscohada: strOrNull(pick(r, "compte_syscohada")),
        realise: num(r.realise),
        engage: num(r.engage),
      };
    }),
    depenses_par_mois: MOIS_COURTS.map((label, i) => {
      const mois = String(i + 1).padStart(2, "0");
      const r = byMois.get(mois) ?? {};
      return { mois, label, realise: num(r.realise ?? r.montant), engage: num(r.engage) };
    }),
    top_fournisseurs: arr(pick(o, "top_fournisseurs")).map((row) => {
      const r = rec(row);
      return { id: num(r.id), nom: str(r.nom) || "—", total: num(r.total) };
    }),
  };
}

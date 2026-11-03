import type { BudgetDepenseStatut, BudgetEnveloppeStatut } from "@/lib/types";

export type { BudgetDepenseStatut, BudgetEnveloppeStatut };

export type ModePaiement = "especes" | "virement" | "cheque" | "mobile_money" | "carte";

export type AlerteBudget = "ok" | "seuil" | "depasse";

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type PersonneRef = {
  id: number;
  nom: string;
} | null;

export type Fournisseur = {
  id: number;
  nom: string;
  niu: string | null;
  rccm: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  actif: boolean;
};

export type PieceJointe = {
  id: number;
  nom: string;
  url: string;
  mime: string | null;
  taille: number;
  created_at: string;
};

export type HistoriqueDepense = {
  id: number;
  de_statut: BudgetDepenseStatut | null;
  vers_statut: BudgetDepenseStatut;
  commentaire: string | null;
  user_nom: string;
  created_at: string;
};

export type DepenseFinance = {
  id: number;
  numero: string;
  libelle: string;
  enveloppe_id: number;
  enveloppe_libelle: string | null;
  enveloppe_annee: number | null;
  categorie_id: number | null;
  categorie_libelle: string | null;
  compte_syscohada: string | null;
  fournisseur_id: number | null;
  fournisseur_nom: string | null;
  montant_ht: number;
  taux_tva: number;
  montant_tva: number;
  montant_ttc: number;
  date_depense: string;
  reference_piece: string | null;
  commentaire: string | null;
  statut: BudgetDepenseStatut;
  mode_paiement: ModePaiement | null;
  reference_paiement: string | null;
  date_paiement: string | null;
  motif_refus: string | null;
  demandeur_id: number | null;
  demandeur_nom: string | null;
  valide_le: string | null;
  created_at: string;
  pieces: PieceJointe[];
  historique: HistoriqueDepense[];
};

export type EnveloppeFinance = {
  id: number;
  libelle: string;
  departement: string | null;
  annee: number;
  montant_prevu: number;
  statut: BudgetEnveloppeStatut;
  notes: string | null;
  seuil_alerte_pct: number;
  bloquer_depassement: boolean;
};

export type CategorieFinance = {
  id: number;
  code: string;
  libelle: string;
  description: string | null;
  compte_syscohada: string | null;
};

export type ParametresFinance = {
  taux_tva_defaut: number;
  seuil_justificatif: number;
  seuil_validation_n2: number;
  periode_close_jusquau: string | null;
};

export type SyntheseEnveloppe = {
  id: number;
  libelle: string;
  departement: string | null;
  statut: BudgetEnveloppeStatut;
  annee: number;
  prevu: number;
  engage: number;
  realise: number;
  en_attente: number;
  disponible: number;
  taux: number;
  seuil_alerte_pct: number;
  bloquer_depassement: boolean;
  alerte: AlerteBudget;
};

export type SyntheseFinance = {
  annee: number;
  totaux: {
    prevu: number;
    engage: number;
    realise: number;
    disponible: number;
    en_attente: number;
    taux: number;
  };
  par_enveloppe: SyntheseEnveloppe[];
  par_categorie: Array<{
    id: number;
    code: string;
    libelle: string;
    compte_syscohada: string | null;
    realise: number;
    engage: number;
  }>;
  depenses_par_mois: Array<{ mois: string; label: string; realise: number; engage: number }>;
  top_fournisseurs: Array<{ id: number; nom: string; total: number }>;
};

export type DepenseFilters = {
  page?: number;
  limit?: number;
  statut?: BudgetDepenseStatut;
  enveloppe_id?: number;
  categorie_id?: number;
  fournisseur_id?: number;
  q?: string;
  mine?: 1;
};

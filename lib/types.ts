// Types partagés entre serveur et client (sans dépendance better-sqlite3)

export type EmployeStatut = "actif" | "inactif" | "suspendu";
export type TypeContrat = "CDI" | "CDD" | "Stage" | "Freelance" | "Interim";
export type SituationFamiliale = "celibataire" | "marie" | "divorce" | "veuf";

export type Employe = {
  id: number;
  matricule?: string | null;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  situation_familiale: SituationFamiliale | null;
  nombre_enfants: number;
  type_contrat: TypeContrat | null;
  poste: string | null;
  departement: string | null;
  date_embauche: string | null;
  date_fin_contrat?: string | null;
  salaire_base: number;
  /** Défauts bulletin (saisis sur la fiche employé, utilisés à la génération). */
  def_prime_transport: number;
  def_prime_logement: number;
  def_prime_performance: number;
  def_autres_primes: number;
  /** Fraction 0–1 ; null = pas de calcul auto à la génération. */
  def_taux_cnss: number | null;
  def_taux_impot: number | null;
  statut: EmployeStatut;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
};

export type PresenceStatut = "present" | "absent" | "retard" | "conge" | "mission";

export type Presence = {
  id: number;
  employe_id: number;
  date: string;
  heure_entree: string | null;
  heure_sortie: string | null;
  statut: PresenceStatut;
  justification: string | null;
  heures_supplementaires: number;
  // joins
  employe_nom?: string;
  employe_prenom?: string;
  employe_poste?: string | null;
};

export type AbsenceType =
  | "maladie"
  | "conge_paye"
  | "conge_sans_solde"
  | "maternite"
  | "paternite"
  | "autre";

export type AbsenceStatut = "en_attente" | "approuve" | "refuse";

export type Absence = {
  id: number;
  employe_id: number;
  date_debut: string;
  date_fin: string;
  type_absence: AbsenceType;
  justification: string | null;
  statut: AbsenceStatut;
  created_at: string;
  employe_nom?: string;
  employe_prenom?: string;
  employe_poste?: string | null;
  /** Durée en jours ouvrés calculée par le serveur. */
  duree_jours?: number;
};

export type PaieStatut = "en_attente" | "paye" | "annule";

export type Paie = {
  id: number;
  employe_id: number;
  mois: string;
  annee: number;
  salaire_base: number;
  prime_transport: number;
  prime_logement: number;
  prime_performance: number;
  autres_primes: number;
  cnss: number;
  impot: number;
  autres_retenues: number;
  salaire_net: number;
  statut: PaieStatut;
  date_paiement: string | null;
  jours_travailles?: number | null;
  jours_periode?: number | null;
  created_at: string;
  employe_nom?: string;
  employe_prenom?: string;
  employe_poste?: string | null;
};

export type OffreStatut = "ouverte" | "fermee" | "pourvue";

export type Offre = {
  id: number;
  titre: string;
  departement: string | null;
  type_contrat: TypeContrat | null;
  description: string | null;
  competences_requises: string | null;
  cible_candidats: number;
  date_publication: string;
  date_cloture: string | null;
  statut: OffreStatut;
  candidats_count?: number;
};

export type CandidatureStatut = "recu" | "en_cours" | "retenu" | "rejete";

export type Candidature = {
  id: number;
  offre_id: number;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  cv_path: string | null;
  lettre_motivation: string | null;
  statut: CandidatureStatut;
  date_candidature: string;
};

export type CompetenceNiveau = "debutant" | "intermediaire" | "avance" | "expert";

export const NIVEAU_INT_TO_TEXT: Record<number, CompetenceNiveau> = {
  1: "debutant",
  2: "debutant",
  3: "intermediaire",
  4: "avance",
  5: "expert",
};

export const NIVEAU_TEXT_TO_INT: Record<CompetenceNiveau, number> = {
  debutant: 2,
  intermediaire: 3,
  avance: 4,
  expert: 5,
};

export type Competence = {
  id: number;
  employe_id: number;
  nom_competence: string;
  niveau: CompetenceNiveau;
  categorie: string | null;
  employe_nom?: string;
  employe_prenom?: string;
  employe_poste?: string | null;
};

export type FormationType = "formation" | "certification" | "diplome";

export type Formation = {
  id: number;
  employe_id: number;
  titre: string;
  type: FormationType;
  organisme: string | null;
  date_obtention: string | null;
  date_expiration: string | null;
  fichier_path: string | null;
  employe_nom?: string;
  employe_prenom?: string;
};

export type Evaluation = {
  id: number;
  employe_id: number;
  periode: string;
  note_globale: number;
  ponctualite: number;
  qualite_travail: number;
  travail_equipe: number;
  initiative: number;
  commentaire: string | null;
  evaluateur: string | null;
  date_evaluation: string;
  employe_nom?: string;
  employe_prenom?: string;
  employe_poste?: string | null;
};

export type ActiviteLog = {
  id: number;
  type: string;
  description: string;
  employe_id: number | null;
  meta: string | null;
  created_at: string;
  employe_nom?: string | null;
  employe_prenom?: string | null;
};

export type DashboardStats = {
  total_employes: number;
  presents_aujourd_hui: number;
  masse_salariale: number;
  recrutements_ouverts: number;
  tendances: {
    employes: number;
    presents: number;
    masse_salariale: number;
    recrutements: number;
  };
  sparklines: {
    employes: number[];
    presents: number[];
    masse_salariale: number[];
    recrutements: number[];
  };
};

export type PresenceChartPoint = {
  mois: string;
  presents: number;
  absents: number;
  retards: number;
};

export type DepartementsRepartition = {
  name: string;
  value: number;
  color: string;
};

export type PaieEvolutionPoint = {
  mois: string;
  masse: number;
};

/** Catégories de dépenses budgétaires */
export type BudgetCategorie = {
  id: number;
  code: string;
  libelle: string;
  description: string | null;
  created_at: string;
};

/** Enveloppe budgétaire (ligne de budget) */
export type BudgetEnveloppeStatut = "actif" | "clos" | "brouillon";

export type BudgetEnveloppe = {
  id: number;
  libelle: string;
  departement: string | null;
  annee: number;
  montant_prevu: number;
  statut: BudgetEnveloppeStatut;
  notes: string | null;
  created_at: string;
  updated_at: string;
  montant_realise?: number;
  montant_en_attente?: number;
  ecart?: number;
};

export type BudgetDepenseStatut =
  | "brouillon"
  | "soumise"
  | "validee_n1"
  | "validee"
  | "refusee"
  | "payee"
  | "annulee";

export type BudgetDepense = {
  id: number;
  enveloppe_id: number;
  categorie_id: number | null;
  libelle: string;
  montant: number;
  date_depense: string;
  fournisseur: string | null;
  reference_piece: string | null;
  statut: BudgetDepenseStatut;
  commentaire: string | null;
  created_at: string;
  enveloppe_libelle?: string;
  categorie_libelle?: string | null;
};

export type BudgetSynthese = {
  genere_le: string;
  annee: number;
  totaux: {
    prevu_actif: number;
    realise_approuve_paye: number;
    en_attente: number;
    refuse: number;
    taux_consommation_pct: number | null;
  };
  par_enveloppe: Array<{
    id: number;
    libelle: string;
    departement: string | null;
    montant_prevu: number;
    realise: number;
    en_attente: number;
    ecart: number;
    statut: BudgetEnveloppeStatut;
  }>;
  depenses_par_mois: Array<{ mois: string; label: string; montant: number }>;
};

/** Synthèse multi-domaines pour le module Statistiques & performance */
export type StatistiquesSynthese = {
  genere_le: string;
  headline: {
    employes_actifs: number;
    presents_aujourd_hui: number;
    masse_net_mois_courant: number;
    note_moyenne_evaluations: number | null;
    candidatures_en_cours: number;
  };
  rh: {
    total_par_statut: { actif: number; inactif: number; suspendu: number };
    effectif_total: number;
    contrats_actifs: Record<string, number>;
    masse_brute_mensuelle_fcfa: number;
    departements: Array<{ nom: string; effectif: number }>;
  };
  paie: {
    annee_courante: number;
    mois_courant: string;
    evolution_mensuelle: Array<{
      cle: string;
      label: string;
      masse_net: number;
      bulletins: number;
      payes: number;
    }>;
    cumul_net_annee: number;
  };
  presence: {
    serie_mensuelle: Array<{
      cle: string;
      label: string;
      presents: number;
      absents: number;
      retards: number;
      autres: number;
      taux_presence_pct: number | null;
    }>;
    aujourd_hui: {
      date: string;
      present: number;
      absent: number;
      retard: number;
      conge: number;
      mission: number;
      total: number;
    };
    absences_en_attente: number;
  };
  recrutement: {
    offres: { ouverte: number; fermee: number; pourvue: number; total: number };
    candidatures_par_statut: { recu: number; en_cours: number; retenu: number; rejete: number; total: number };
    taux_retenu_pct: number | null;
  };
  performance: {
    evaluations_12_mois: number;
    moyennes: {
      note_globale: number | null;
      ponctualite: number | null;
      qualite_travail: number | null;
      travail_equipe: number | null;
      initiative: number | null;
    };
    evolution_mensuelle: Array<{ cle: string; label: string; moyenne: number | null; count: number }>;
    repartition_notes: Array<{ tranche: string; count: number }>;
  };
};

export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

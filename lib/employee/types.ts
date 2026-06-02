export type UserMePayload = {
  id: number;
  email: string;
  role: string;
  nom: string;
  prenom: string;
  employeId?: number | null;
  matricule?: string | null;
  poste?: string | null;
  departement?: string | null;
  avatar?: string | null;
};

export type AuthLoginResponse = {
  access_token: string;
  user: UserMePayload;
};

export type EmployeMe = {
  id: number;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  poste?: string | null;
  departement?: string | null;
  matricule?: string | null;
  type_contrat?: string | null;
  date_embauche?: string | null;
  dateFinContrat?: string | null;
  date_fin_contrat?: string | null;
  avatar?: string | null;
  statut?: string | null;
  updated_at?: string | null;
};

export type AbsenceBalance = {
  annee: number;
  droitAnnuel?: number;
  joursPris?: number;
  soldeRestant?: number;
  detailParType?: Record<string, number>;
  total: number;
  pris: number;
  restant: number;
  en_attente: number;
};

export type AbsenceType =
  | "conge_paye"
  | "maladie"
  | "conge_sans_solde"
  | "maternite"
  | "paternite"
  | "autre";

export type AbsenceStatut = "en_attente" | "approuve" | "refuse";

export type EmployeeAbsence = {
  id: number;
  employe_id?: number;
  employeId?: number;
  date_debut?: string;
  date_fin?: string;
  dateDebut?: string;
  dateFin?: string;
  type_absence?: AbsenceType | string;
  typeAbsence?: AbsenceType | string;
  statut: AbsenceStatut | string;
  justification?: string | null;
  created_at?: string;
};

export type CreateAbsenceInput = {
  employeId: number;
  dateDebut: string;
  dateFin: string;
  typeAbsence: AbsenceType;
  justification?: string;
};

export type PaieBulletin = {
  id: number;
  mois: string | number;
  annee: number;
  salaire_net?: number;
  statut?: string;
  date_paiement?: string | null;
  jours_travailles?: number | null;
  jours_periode?: number | null;
  joursTravailles?: number | null;
  joursPeriode?: number | null;
};

export type EmployeeDocument = {
  id: number;
  nom?: string;
  titre?: string;
  type?: string;
  created_at?: string;
  date_creation?: string;
};

export type EmployeeNotification = {
  id: number;
  titre: string;
  message: string;
  lu?: boolean;
  lue?: boolean;
  created_at?: string;
  date?: string;
};

export const ABSENCE_TYPE_LABELS: Record<string, string> = {
  conge_paye: "Congé payé",
  maladie: "Maladie",
  conge_sans_solde: "Sans solde",
  maternite: "Maternité",
  paternite: "Paternité",
  autre: "Autre",
};

export const ABSENCE_STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  approuve: "Approuvé",
  refuse: "Refusé",
};

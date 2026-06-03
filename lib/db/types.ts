/**
 * Types IndexedDB — alignés sur lib/types.ts et lib/employee/types.ts
 */

import type {
  AbsenceStatut,
  AbsenceType,
  BudgetCategorie,
  BudgetDepense,
  BudgetEnveloppe,
  EmployeStatut,
  PaieStatut,
  PresenceStatut,
  SituationFamiliale,
  TypeContrat,
} from "@/lib/types";

export type NotificationType = "info" | "conge" | "paie" | "document" | "systeme";

/** Miroir de `Notification` (lib/notifications.ts) */
export interface NotificationOffline {
  id: number;
  employe_id: number | null;
  user_id: number | null;
  titre: string;
  message: string;
  type: NotificationType;
  meta: Record<string, unknown> | null;
  lu: boolean;
  lu_at: string | null;
  created_at: string;
}

export type BudgetEntityKind = "categories" | "enveloppes" | "depenses";

/** Ligne budget IndexedDB — clé composite [entity_kind, id] */
export interface BudgetOfflineRow {
  entity_kind: BudgetEntityKind;
  id: number;
  record: BudgetCategorie | BudgetEnveloppe | BudgetDepense;
}

/** Miroir de `Employe` (lib/types.ts) */
export interface Employee {
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
  def_prime_transport: number;
  def_prime_logement: number;
  def_prime_performance: number;
  def_autres_primes: number;
  def_taux_cnss: number | null;
  def_taux_impot: number | null;
  statut: EmployeStatut;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

/** Miroir de `Presence` (lib/types.ts) */
export interface Presence {
  id: number;
  employe_id: number;
  date: string;
  heure_entree: string | null;
  heure_sortie: string | null;
  statut: PresenceStatut;
  justification: string | null;
  heures_supplementaires: number;
  employe_nom?: string;
  employe_prenom?: string;
  employe_poste?: string | null;
}

/** Miroir de `Absence` / congés (lib/types.ts) */
export interface Leave {
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
}

/** Miroir de `Paie` (lib/types.ts) */
export interface Payslip {
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
}

/** Documents employé (lib/employee/types.ts + champs API courants) */
export interface Document {
  id: number;
  employe_id?: number;
  nom?: string;
  titre?: string;
  type?: string;
  created_at?: string;
  date_creation?: string;
}

export interface DashboardCache {
  key: string;
  data: unknown;
  cachedAt: number;
}

export type SyncQueueMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type SyncQueueStatus = "pending" | "failed";

export interface SyncQueueItem {
  id?: number;
  method: SyncQueueMethod;
  url: string;
  body: unknown;
  timestamp: number;
  retries: number;
  status: SyncQueueStatus;
}

export type OfflineStoreName =
  | "employees"
  | "presences"
  | "leaves"
  | "payslips"
  | "documents"
  | "dashboard"
  | "budget"
  | "notifications"
  | "sync_queue";

/** Clé composite pour index `mois` sur bulletins (annee + mois) */
export type PayslipMoisIndex = `${number}-${string}`;

export interface BvRhOfflineSchema {
  employees: {
    key: number;
    value: Employee;
    indexes: { departement: string | null; statut: EmployeStatut };
  };
  presences: {
    key: number;
    value: Presence;
    indexes: { employe_id: number; date: string };
  };
  leaves: {
    key: number;
    value: Leave;
    indexes: { employe_id: number; statut: AbsenceStatut };
  };
  payslips: {
    key: number;
    value: Payslip;
    indexes: { employe_id: number; mois: string };
  };
  documents: {
    key: number;
    value: Document;
    indexes: { employe_id: number; type: string };
  };
  dashboard: {
    key: string;
    value: DashboardCache;
  };
  budget: {
    key: [BudgetEntityKind, number];
    value: BudgetOfflineRow;
    indexes: { entity_kind: BudgetEntityKind };
  };
  notifications: {
    key: number;
    value: NotificationOffline;
    indexes: { employe_id: number | null; lu: boolean };
  };
  sync_queue: {
    key: number;
    value: SyncQueueItem;
    indexes: { timestamp: number; status: SyncQueueStatus };
  };
}

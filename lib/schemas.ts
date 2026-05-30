import { z } from "zod";

// ============ AUTH / INSCRIPTION ============
/** Création de compte (rôle limité à rh ou manager ; pas d’admin via cette API). */
export const registerSchema = z
  .object({
    email: z.string().email("Email invalide").transform((s) => s.trim().toLowerCase()),
    password: z.string().min(8, "Mot de passe : au moins 8 caractères"),
    password_confirm: z.string().min(1, "Confirmation requise"),
    nom: z.string().min(2, "Nom requis").transform((s) => s.trim()),
    prenom: z.string().min(2, "Prénom requis").transform((s) => s.trim()),
    role: z.enum(["rh", "manager"]).default("rh"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.password_confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["password_confirm"],
        message: "Les mots de passe ne correspondent pas",
      });
    }
  });
export type RegisterInput = z.infer<typeof registerSchema>;

/** Montant FCFA ≥ 0 : vide / invalide → 0 ; espaces retirés ; virgule décimale acceptée (ex. "1500,50"). */
function montantFcfaNonNegatif() {
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return 0;
    if (typeof val === "number") return Number.isFinite(val) ? Math.max(0, val) : 0;
    let s = String(val).trim().replace(/\s/g, "");
    if (!s) return 0;
    if (!s.includes(".") && /^\d+,\d+$/.test(s)) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }, z.number().min(0));
}

/** Même logique que montantFcfaNonNegatif mais undefined si champ laissé vide (mise à jour partielle bulletin). */
function montantFcfaOptionnel() {
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "number") return Number.isFinite(val) ? Math.max(0, val) : undefined;
    let s = String(val).trim().replace(/\s/g, "");
    if (!s) return undefined;
    if (!s.includes(".") && /^\d+,\d+$/.test(s)) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? Math.max(0, n) : undefined;
  }, z.number().min(0).optional());
}

/** Taux optionnels (0–1). Chaîne vide → non utilisé ; « 0,056 » ou « 0.056 » acceptés. */
function optionalTaux01() {
  return z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      let n: number;
      if (typeof val === "number") {
        n = val;
      } else {
        const s = String(val).trim().replace(/\s/g, "").replace(",", ".");
        const parsed = Number(s);
        if (!Number.isFinite(parsed)) return undefined;
        n = parsed;
      }
      return n;
    },
    z.number().min(0).max(1).optional()
  );
}

// ============ EMPLOYES ============
export const employeSchema = z.object({
  nom: z.string().min(2, "Nom requis"),
  prenom: z.string().min(2, "Prénom requis"),
  email: z.string().min(1, "Email requis").email("Email invalide"),
  telephone: z.string().min(6, "Téléphone requis (min. 6 caractères)"),
  date_naissance: z.string().optional().or(z.literal("")),
  adresse: z.string().optional().or(z.literal("")),
  situation_familiale: z.enum(["celibataire", "marie", "divorce", "veuf"]).optional().or(z.literal("")),
  nombre_enfants: z.coerce.number().int().min(0).default(0),
  poste: z.string().min(2, "Poste requis"),
  departement: z.string().min(2, "Département requis"),
  type_contrat: z
    .string()
    .min(1, "Type de contrat requis")
    .pipe(z.enum(["CDI", "CDD", "Stage", "Freelance", "Interim"])),
  salaire_base: z.coerce.number().positive("Salaire de base requis (montant > 0)"),
  date_embauche: z.string().min(8, "Date d'embauche requise"),
  date_fin_contrat: z.string().optional().or(z.literal("")),
  statut: z.enum(["actif", "inactif", "suspendu"]).default("actif"),
  /** Montants FCFA utilisés lors de la génération des bulletins ; défaut 0 si vide. */
  def_prime_transport: montantFcfaNonNegatif(),
  def_prime_logement: montantFcfaNonNegatif(),
  def_prime_performance: montantFcfaNonNegatif(),
  def_autres_primes: montantFcfaNonNegatif(),
  /** Si renseignés : base imposable × taux à la génération ; sinon retenues à 0 (à saisir sur le bulletin). */
  def_taux_cnss: optionalTaux01(),
  def_taux_impot: optionalTaux01(),
}).superRefine((data, ctx) => {
  if (data.statut === "inactif" && !data.date_fin_contrat) {
    ctx.addIssue({
      code: "custom",
      path: ["date_fin_contrat"],
      message: "Date de fin de contrat requise pour un départ (statut inactif)",
    });
  }
});
export type EmployeInput = z.infer<typeof employeSchema>;

// ============ INSCRIPTION EMPLOYE (admin crée un compte + fiche RH) ============
export const registerEmployeeSchema = employeSchema.extend({
  password: z.string().min(8, "Mot de passe : au moins 8 caractères"),
  password_confirm: z.string().min(1, "Confirmation requise"),
}).superRefine((data, ctx) => {
  if (data.password !== data.password_confirm) {
    ctx.addIssue({
      code: "custom",
      path: ["password_confirm"],
      message: "Les mots de passe ne correspondent pas",
    });
  }
});
export type RegisterEmployeeInput = z.infer<typeof registerEmployeeSchema>;

/** Inscription self-service PWA employé (champs optionnels côté API). */
export const registerEmployeePwaSchema = z
  .object({
    email: z.string().email("Email invalide").transform((s) => s.trim().toLowerCase()),
    password: z.string().min(8, "Mot de passe : au moins 8 caractères"),
    password_confirm: z.string().min(1, "Confirmation requise"),
    nom: z.string().min(2, "Nom requis").transform((s) => s.trim()),
    prenom: z.string().min(2, "Prénom requis").transform((s) => s.trim()),
    telephone: z.string().optional().or(z.literal("")),
    adresse: z.string().optional().or(z.literal("")),
    poste: z.string().optional().or(z.literal("")),
    departement: z.string().optional().or(z.literal("")),
    type_contrat: z.enum(["CDI", "CDD", "Stage", "Freelance", "Interim"]).optional().or(z.literal("")),
    date_embauche: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.password_confirm) {
      ctx.addIssue({
        code: "custom",
        path: ["password_confirm"],
        message: "Les mots de passe ne correspondent pas",
      });
    }
  });
export type RegisterEmployeePwaInput = z.infer<typeof registerEmployeePwaSchema>;

// ============ PRESENCES ============
export const presenceSchema = z.object({
  employe_id: z.coerce.number().int().positive("Employé requis"),
  date: z.string().min(4, "Date requise"),
  heure_entree: z.string().optional().or(z.literal("")),
  heure_sortie: z.string().optional().or(z.literal("")),
  statut: z.enum(["present", "absent", "retard", "conge", "mission"]),
  justification: z.string().optional().or(z.literal("")),
  heures_supplementaires: z.coerce.number().min(0).default(0),
});
export type PresenceInput = z.infer<typeof presenceSchema>;

// ============ ABSENCES ============
export const absenceSchema = z.object({
  employe_id: z.coerce.number().int().positive("Employé requis"),
  date_debut: z.string().min(4, "Date début requise"),
  date_fin: z.string().min(4, "Date fin requise"),
  type_absence: z.enum([
    "maladie",
    "conge_paye",
    "conge_sans_solde",
    "maternite",
    "paternite",
    "autre",
  ]),
  justification: z.string().optional().or(z.literal("")),
  statut: z.enum(["en_attente", "approuve", "refuse"]).default("en_attente"),
});
export type AbsenceInput = z.infer<typeof absenceSchema>;

// ============ PAIE ============
export const paieSchema = z.object({
  employe_id: z.coerce.number().int().positive(),
  mois: z.string().min(1).max(2),
  annee: z.coerce.number().int().min(2000).max(2100),
  salaire_base: montantFcfaNonNegatif(),
  prime_transport: montantFcfaNonNegatif(),
  prime_logement: montantFcfaNonNegatif(),
  prime_performance: montantFcfaNonNegatif(),
  autres_primes: montantFcfaNonNegatif(),
  cnss: montantFcfaNonNegatif(),
  impot: montantFcfaNonNegatif(),
  autres_retenues: montantFcfaNonNegatif(),
  statut: z.enum(["en_attente", "paye", "annule"]).default("en_attente"),
});
export type PaieInput = z.infer<typeof paieSchema>;

export const paieGenerateSchema = z.object({
  mois: z.string().min(1).max(2),
  annee: z.coerce.number().int().min(2000).max(2100),
});

/** Mise à jour partielle d'un bulletin (montants + statut). */
export const paieBulletinUpdateSchema = z
  .object({
    statut: z.enum(["en_attente", "paye", "annule"]).optional(),
    salaire_base: montantFcfaOptionnel(),
    prime_transport: montantFcfaOptionnel(),
    prime_logement: montantFcfaOptionnel(),
    prime_performance: montantFcfaOptionnel(),
    autres_primes: montantFcfaOptionnel(),
    cnss: montantFcfaOptionnel(),
    impot: montantFcfaOptionnel(),
    autres_retenues: montantFcfaOptionnel(),
  })
  .superRefine((data, ctx) => {
    const n = Object.values(data).filter((v) => v !== undefined).length;
    if (n === 0) {
      ctx.addIssue({ code: "custom", message: "Aucun champ à mettre à jour" });
    }
  });
export type PaieBulletinUpdateInput = z.infer<typeof paieBulletinUpdateSchema>;

/** Formulaire complet des lignes d'un bulletin (recalcul du net côté serveur). */
export const paieMontantsFormSchema = z.object({
  salaire_base: montantFcfaNonNegatif(),
  prime_transport: montantFcfaNonNegatif(),
  prime_logement: montantFcfaNonNegatif(),
  prime_performance: montantFcfaNonNegatif(),
  autres_primes: montantFcfaNonNegatif(),
  cnss: montantFcfaNonNegatif(),
  impot: montantFcfaNonNegatif(),
  autres_retenues: montantFcfaNonNegatif(),
});
export type PaieMontantsFormInput = z.infer<typeof paieMontantsFormSchema>;

// ============ OFFRES ============
export const offreSchema = z.object({
  titre: z.string().min(3, "Titre requis"),
  departement: z.string().min(2, "Département requis"),
  type_contrat: z
    .string()
    .min(1, "Type de contrat requis")
    .pipe(z.enum(["CDI", "CDD", "Stage", "Freelance"])),
  description: z.string().min(20, "Description requise (min. 20 caractères)"),
  competences_requises: z.string().min(5, "Compétences requises (min. 5 caractères)"),
  cible_candidats: z.coerce.number().int().min(1, "Indiquez un objectif de candidats (≥ 1)"),
  date_cloture: z.string().optional().or(z.literal("")),
  statut: z.enum(["ouverte", "fermee", "pourvue"]).default("ouverte"),
});
export type OffreInput = z.infer<typeof offreSchema>;

export const candidatureSchema = z.object({
  offre_id: z.coerce.number().int().positive(),
  nom: z.string().min(2, "Nom requis"),
  prenom: z.string().min(2, "Prénom requis"),
  email: z.string().min(1, "Email requis").email("Email invalide"),
  telephone: z.string().min(6, "Téléphone requis"),
  lettre_motivation: z
    .string()
    .min(30, "Lettre de motivation requise (min. 30 caractères)"),
  statut: z.enum(["recu", "en_cours", "retenu", "rejete"]).default("recu"),
});
export type CandidatureInput = z.infer<typeof candidatureSchema>;

// ============ COMPETENCES ============
export const competenceSchema = z.object({
  employe_id: z.coerce.number().int().positive("Employé requis"),
  nom_competence: z.string().min(2, "Nom requis"),
  categorie: z.string().optional().or(z.literal("")),
  niveau: z.enum(["debutant", "intermediaire", "avance", "expert"]),
});
export type CompetenceInput = z.infer<typeof competenceSchema>;

export const formationSchema = z.object({
  employe_id: z.coerce.number().int().positive(),
  titre: z.string().min(2),
  type: z.enum(["formation", "certification", "diplome"]),
  organisme: z.string().optional().or(z.literal("")),
  date_obtention: z.string().optional().or(z.literal("")),
  date_expiration: z.string().optional().or(z.literal("")),
});
export type FormationInput = z.infer<typeof formationSchema>;

// ============ EVALUATIONS ============
export const evaluationSchema = z.object({
  employe_id: z.coerce.number().int().positive("Employé requis"),
  periode: z.string().min(2, "Période requise"),
  ponctualite: z.coerce.number().min(0).max(10),
  qualite_travail: z.coerce.number().min(0).max(10),
  travail_equipe: z.coerce.number().min(0).max(10),
  initiative: z.coerce.number().min(0).max(10),
  commentaire: z.string().optional().or(z.literal("")),
  evaluateur: z.string().optional().or(z.literal("")),
});
export type EvaluationInput = z.infer<typeof evaluationSchema>;

// ============ BUDGET & DÉPENSES ============
export const budgetCategorieSchema = z.object({
  code: z.string().min(1).max(32).regex(/^[A-Z0-9_-]+$/i, "Code alphanumérique (ex. FORMATION)"),
  libelle: z.string().min(2, "Libellé requis"),
  description: z.string().optional().or(z.literal("")),
});
export type BudgetCategorieInput = z.infer<typeof budgetCategorieSchema>;

export const budgetEnveloppeSchema = z.object({
  libelle: z.string().min(2, "Libellé requis"),
  departement: z.string().optional().or(z.literal("")),
  annee: z.coerce.number().int().min(2000).max(2100),
  montant_prevu: z.coerce.number().min(0, "Montant invalide"),
  statut: z.enum(["actif", "clos", "brouillon"]).default("actif"),
  notes: z.string().optional().or(z.literal("")),
});
export type BudgetEnveloppeInput = z.infer<typeof budgetEnveloppeSchema>;

export const budgetDepenseSchema = z.object({
  enveloppe_id: z.coerce.number().int().positive("Enveloppe requise"),
  categorie_id: z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, z.number().int().positive().optional()),
  libelle: z.string().min(2, "Libellé requis"),
  montant: z.coerce.number().positive("Montant > 0 requis"),
  date_depense: z.string().min(8, "Date requise"),
  fournisseur: z.string().optional().or(z.literal("")),
  reference_piece: z.string().optional().or(z.literal("")),
  statut: z.enum(["en_attente", "approuve", "refuse", "paye"]).default("en_attente"),
  commentaire: z.string().optional().or(z.literal("")),
});
export type BudgetDepenseInput = z.infer<typeof budgetDepenseSchema>;

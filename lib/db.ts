import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

function resolveDbPath(): string {
  if (process.env.BV_DB_PATH) {
    return process.env.BV_DB_PATH;
  }

  try {
    const nodeRequire = createRequire(fileURLToPath(import.meta.url));
    const electron = nodeRequire("electron") as typeof import("electron");
    if (electron?.app?.getPath) {
      return path.join(electron.app.getPath("userData"), "bv-rh.db");
    }
  } catch {
    // Electron non disponible (build Next.js standalone)
  }

  const baseDir = path.join(os.homedir(), ".bv-groupe-rh");
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return path.join(baseDir, "bv-rh.db");
}

let db: Database.Database;

try {
  const dbPath = resolveDbPath();
  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS employes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT,
      telephone TEXT,
      email TEXT,
      adresse TEXT,
      situation_familiale TEXT CHECK(situation_familiale IN ('celibataire','marie','divorce','veuf')),
      nombre_enfants INTEGER DEFAULT 0,
      type_contrat TEXT CHECK(type_contrat IN ('CDI','CDD','Stage','Freelance','Interim')),
      poste TEXT,
      departement TEXT,
      date_embauche TEXT,
      statut TEXT DEFAULT 'actif' CHECK(statut IN ('actif','inactif','suspendu')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS presences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employe_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      heure_entree TEXT,
      heure_sortie TEXT,
      statut TEXT CHECK(statut IN ('present','absent','retard','conge','mission')),
      justification TEXT,
      heures_supplementaires REAL DEFAULT 0,
      FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS absences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employe_id INTEGER NOT NULL,
      date_debut TEXT NOT NULL,
      date_fin TEXT NOT NULL,
      type_absence TEXT CHECK(type_absence IN ('maladie','conge_paye','conge_sans_solde','maternite','paternite','autre')),
      justification TEXT,
      statut TEXT DEFAULT 'en_attente' CHECK(statut IN ('en_attente','approuve','refuse')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS paie (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employe_id INTEGER NOT NULL,
      mois TEXT NOT NULL,
      annee INTEGER NOT NULL,
      salaire_base REAL NOT NULL,
      prime_transport REAL DEFAULT 0,
      prime_logement REAL DEFAULT 0,
      prime_performance REAL DEFAULT 0,
      autres_primes REAL DEFAULT 0,
      cnss REAL DEFAULT 0,
      impot REAL DEFAULT 0,
      autres_retenues REAL DEFAULT 0,
      salaire_net REAL,
      statut TEXT DEFAULT 'en_attente' CHECK(statut IN ('en_attente','paye','annule')),
      date_paiement TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offres_emploi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      departement TEXT,
      type_contrat TEXT CHECK(type_contrat IN ('CDI','CDD','Stage','Freelance')),
      description TEXT,
      competences_requises TEXT,
      cible_candidats INTEGER DEFAULT 10,
      date_publication TEXT DEFAULT (datetime('now')),
      date_cloture TEXT,
      statut TEXT DEFAULT 'ouverte' CHECK(statut IN ('ouverte','fermee','pourvue'))
    );

    CREATE TABLE IF NOT EXISTS candidatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offre_id INTEGER NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      email TEXT,
      telephone TEXT,
      cv_path TEXT,
      lettre_motivation TEXT,
      statut TEXT DEFAULT 'recu' CHECK(statut IN ('recu','en_cours','retenu','rejete')),
      date_candidature TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (offre_id) REFERENCES offres_emploi(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS competences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employe_id INTEGER NOT NULL,
      nom_competence TEXT NOT NULL,
      niveau TEXT CHECK(niveau IN ('debutant','intermediaire','avance','expert')),
      categorie TEXT,
      FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS formations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employe_id INTEGER NOT NULL,
      titre TEXT NOT NULL,
      type TEXT CHECK(type IN ('formation','certification','diplome')),
      organisme TEXT,
      date_obtention TEXT,
      date_expiration TEXT,
      fichier_path TEXT,
      FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employe_id INTEGER NOT NULL,
      periode TEXT NOT NULL,
      note_globale REAL CHECK(note_globale BETWEEN 0 AND 10),
      ponctualite REAL CHECK(ponctualite BETWEEN 0 AND 10),
      qualite_travail REAL CHECK(qualite_travail BETWEEN 0 AND 10),
      travail_equipe REAL CHECK(travail_equipe BETWEEN 0 AND 10),
      initiative REAL CHECK(initiative BETWEEN 0 AND 10),
      commentaire TEXT,
      evaluateur TEXT,
      date_evaluation TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activite_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      employe_id INTEGER,
      meta TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      role TEXT DEFAULT 'admin' CHECK(role IN ('admin','manager','rh')),
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_presences_date ON presences(date);
    CREATE INDEX IF NOT EXISTS idx_presences_emp_date ON presences(employe_id, date);
    CREATE INDEX IF NOT EXISTS idx_paie_periode ON paie(annee, mois);
    CREATE INDEX IF NOT EXISTS idx_paie_employe ON paie(employe_id);
    CREATE INDEX IF NOT EXISTS idx_absences_emp ON absences(employe_id);
    CREATE INDEX IF NOT EXISTS idx_activite_created ON activite_log(created_at DESC);
  `);

  // Migration : ajouter salaire_base à employes si absent
  const empCols = db.prepare("PRAGMA table_info(employes)").all() as Array<{ name: string }>;
  if (!empCols.some((c) => c.name === "salaire_base")) {
    db.exec("ALTER TABLE employes ADD COLUMN salaire_base REAL DEFAULT 0");
  }

  // Migration : ajouter cible_candidats à offres_emploi si absent
  const offreCols = db.prepare("PRAGMA table_info(offres_emploi)").all() as Array<{ name: string }>;
  if (!offreCols.some((c) => c.name === "cible_candidats")) {
    db.exec("ALTER TABLE offres_emploi ADD COLUMN cible_candidats INTEGER DEFAULT 10");
  }

  // Défauts paie par employé (saisis par l'utilisateur, utilisés à la génération des bulletins)
  const empMigrations: Array<[string, string]> = [
    ["def_prime_transport", "ALTER TABLE employes ADD COLUMN def_prime_transport REAL DEFAULT 0"],
    ["def_prime_logement", "ALTER TABLE employes ADD COLUMN def_prime_logement REAL DEFAULT 0"],
    ["def_prime_performance", "ALTER TABLE employes ADD COLUMN def_prime_performance REAL DEFAULT 0"],
    ["def_autres_primes", "ALTER TABLE employes ADD COLUMN def_autres_primes REAL DEFAULT 0"],
    ["def_taux_cnss", "ALTER TABLE employes ADD COLUMN def_taux_cnss REAL"],
    ["def_taux_impot", "ALTER TABLE employes ADD COLUMN def_taux_impot REAL"],
  ];
  const empColNames = new Set(empCols.map((c) => c.name));
  for (const [col, sql] of empMigrations) {
    if (!empColNames.has(col)) {
      db.exec(sql);
      empColNames.add(col);
    }
  }

  // Module budget & dépenses
  db.exec(`
    CREATE TABLE IF NOT EXISTS budget_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      libelle TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS budget_enveloppes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      libelle TEXT NOT NULL,
      departement TEXT,
      annee INTEGER NOT NULL,
      montant_prevu REAL NOT NULL,
      statut TEXT DEFAULT 'actif' CHECK(statut IN ('actif','clos','brouillon')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS budget_depenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enveloppe_id INTEGER NOT NULL,
      categorie_id INTEGER,
      libelle TEXT NOT NULL,
      montant REAL NOT NULL,
      date_depense TEXT NOT NULL,
      fournisseur TEXT,
      reference_piece TEXT,
      statut TEXT DEFAULT 'en_attente' CHECK(statut IN ('en_attente','approuve','refuse','paye')),
      commentaire TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (enveloppe_id) REFERENCES budget_enveloppes(id) ON DELETE CASCADE,
      FOREIGN KEY (categorie_id) REFERENCES budget_categories(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_budget_dep_env ON budget_depenses(enveloppe_id);
    CREATE INDEX IF NOT EXISTS idx_budget_dep_date ON budget_depenses(date_depense);
    CREATE INDEX IF NOT EXISTS idx_budget_env_annee ON budget_enveloppes(annee);
  `);

  // Compte admin par défaut (idempotent : build Next.js = plusieurs workers en parallèle)
  const adminExists = db.prepare("SELECT 1 FROM users WHERE email = ?").get("admin@bvgroupe.com");
  if (!adminExists) {
    const hash = bcrypt.hashSync("Admin@2026", 10);
    db.prepare(
      "INSERT INTO users (email, password_hash, nom, prenom, role) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING"
    ).run("admin@bvgroupe.com", hash, "Administrateur", "BV", "admin");
  }
} catch (error) {
  console.error("Erreur de connexion SQLite:", error);
  throw error;
}

export function logActivite(
  type: string,
  description: string,
  employe_id: number | null = null,
  meta: Record<string, unknown> | null = null
): void {
  db.prepare(
    "INSERT INTO activite_log (type, description, employe_id, meta) VALUES (?, ?, ?, ?)"
  ).run(type, description, employe_id, meta ? JSON.stringify(meta) : null);
}

export { db };

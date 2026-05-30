# Audit de migration — BV Groupe RH

Document de référence pour la migration de l’application actuelle vers **NestJS + PostgreSQL**.

| | |
|---|---|
| **Projet** | `bv-groupe-rh` |
| **Stack actuelle** | Next.js 16 (App Router) + API Routes + SQLite (`better-sqlite3`) |
| **Stack cible** | NestJS + PostgreSQL (+ frontend Next.js ou séparé) |
| **Source du schéma SQL** | `lib/db.ts` (DDL + migrations inline, pas de fichier `.sql` séparé) |
| **Date de l’audit** | Basé sur l’état du dépôt au moment de l’analyse |

---

## Table des matières

1. [Vue d’ensemble](#1-vue-densemble)
2. [Cartographie des routes API](#2-cartographie-des-routes-api)
3. [Schéma de données](#3-schéma-de-données)
4. [Logique métier](#4-logique-métier)
5. [Authentification et sécurité](#5-authentification-et-sécurité)
6. [Dépendances et équivalents NestJS](#6-dépendances-et-équivalents-nestjs)
7. [Plan de migration](#7-plan-de-migration)
8. [Checklist de non-régression](#8-checklist-de-non-régression)
9. [Annexes](#9-annexes)

---

## 1. Vue d’ensemble

### 1.1 Architecture actuelle

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React 19, SWR, react-hook-form, Zod)               │
└───────────────────────────┬─────────────────────────────────┘
                            │ fetch → { ok, data?, error? }
┌───────────────────────────▼─────────────────────────────────┐
│  Next.js App Router                                         │
│  • Pages : app/**/page.tsx                                  │
│  • API : app/api/**/route.ts  (logique + SQL direct)        │
│  • Garde : proxy.ts (cookie bv-session)                     │
│  • Layout protégé : AppShellLayout → requireSessionOrDev    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  lib/db.ts — SQLite (better-sqlite3, synchrone)             │
│  lib/schemas.ts — validation Zod                            │
│  lib/auth.ts — session HMAC cookie                          │
│  lib/paie-calc.ts — calcul salaire net                      │
└─────────────────────────────────────────────────────────────┘
```

**Il n’existe pas de couche Service/Repository** : chaque route API exécute du SQL via `db.prepare()`.

### 1.2 Emplacement de la base SQLite

Ordre de résolution (`lib/db.ts`) :

1. Variable d’environnement `BV_DB_PATH`
2. Sous Electron : `{userData}/bv-rh.db`
3. Sinon : `~/.bv-groupe-rh/bv-rh.db`

### 1.3 Format de réponse API

Toutes les routes utilisent `lib/api-utils.ts` :

```json
{ "ok": true, "data": <T> }
{ "ok": false, "error": "<message>" }
```

Codes HTTP courants : `201` création, `400` JSON invalide, `401` non authentifié, `404` introuvable, `409` conflit, `422` validation Zod, `500` erreur serveur.

---

## 2. Cartographie des routes API

### 2.1 Protection des accès

| Couche | Fichier | Comportement |
|--------|---------|--------------|
| Proxy | `proxy.ts` | Vérifie la **présence** du cookie `bv-session` (contient `.`) |
| Layout | `AppShellLayout.tsx` | Redirige vers `/login` si pas de session |
| Handlers API | — | **Aucun contrôle de rôle** (`admin` / `manager` / `rh`) |

**Pages publiques (proxy) :** `/`, `/login`

**API publiques (proxy) :**

- `/api/public/*`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/test-bypass` (si `BV_TEST_BYPASS=1`)

**Points d’attention :**

- `/register` et `POST /api/auth/register` **ne sont pas** dans les listes publiques → inscription bloquée si l’auth est activée en production.
- En développement (`NODE_ENV=development`) ou avec `BV_AUTH_DISABLED=1`, le proxy laisse tout passer.

### 2.2 Inventaire des endpoints (44 fichiers `route.ts`)

#### Authentification

| Méthode | Chemin | Public | Entrée | Sortie |
|---------|--------|--------|--------|--------|
| POST | `/api/auth/login` | Oui | `{ email, password }` | Utilisateur + cookie session |
| POST | `/api/auth/logout` | Oui | — | Suppression cookie |
| POST | `/api/auth/register` | Non ⚠️ | `registerSchema` | Utilisateur + session ; `AUTH_DISABLE_REGISTRATION=1` → 403 |
| GET | `/api/auth/me` | Non | — | Session courante |
| GET | `/api/auth/test-bypass` | Conditionnel | `?next=` | Redirect dashboard (admin) |

#### Données publiques (landing)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/api/public/stats` | Agrégats anonymes (effectifs, masse salariale, etc.) |
| GET | `/api/public/presences-chart` | Série présences pour la landing |

#### RH — Employés

| Méthode | Chemin | Query / Body |
|---------|--------|--------------|
| GET | `/api/employes` | `search`, `departement`, `type_contrat`, `statut`, `sort`, `limit` |
| POST | `/api/employes` | `employeSchema` |
| GET/PUT/DELETE | `/api/employes/[id]` | `employeSchema` (PUT) |
| GET | `/api/employes/stats` | — |

#### Présences & absences

| Méthode | Chemin | Notes |
|---------|--------|-------|
| GET/POST | `/api/presences` | Filtres : `date`, `employe_id`, `statut`, `date_from`, `date_to`, `limit` |
| PUT/DELETE | `/api/presences/[id]` | |
| GET | `/api/presences/today`, `/api/presences/stats` | |
| GET/POST | `/api/absences` | |
| PUT/DELETE | `/api/absences/[id]` | |

#### Paie

| Méthode | Chemin | Notes |
|---------|--------|-------|
| GET | `/api/paie` | Filtres `mois`, `annee`, `statut`, `employe_id` |
| POST | `/api/paie` | **Deux modes** : `{ mois, annee }` → génération masse ; ou `paieSchema` → bulletin manuel |
| GET/PUT/DELETE | `/api/paie/[id]` | PUT partiel + recalcul `salaire_net` |
| GET | `/api/paie/stats`, `/api/paie/evolution` | |

#### Recrutement

| Méthode | Chemin |
|---------|--------|
| GET/POST | `/api/offres` |
| GET/PUT/DELETE | `/api/offres/[id]` |
| GET | `/api/offres/stats` |
| GET/POST | `/api/candidatures` |
| PUT/DELETE | `/api/candidatures/[id]` |

#### Compétences, formations, évaluations

| Méthode | Chemin | Notes |
|---------|--------|-------|
| GET/POST | `/api/competences` | `employe_id` |
| PUT/DELETE | `/api/competences/[id]` | |
| GET/POST | `/api/formations` | Pas de GET par id |
| PUT/DELETE | `/api/formations/[id]` | |
| GET/POST | `/api/evaluations` | `note_globale` calculée à la création |
| DELETE | `/api/evaluations/[id]` | Pas de PUT |

#### Dashboard & statistiques

| Méthode | Chemin |
|---------|--------|
| GET | `/api/dashboard/stats` |
| GET | `/api/dashboard/presences-chart` |
| GET | `/api/dashboard/departements` |
| GET | `/api/dashboard/activite` |
| GET | `/api/dashboard/recrutements` |
| GET | `/api/statistiques/synthese` |

#### Budget

| Méthode | Chemin | Notes |
|---------|--------|-------|
| GET/POST | `/api/budget/categories` | Code UNIQUE |
| GET/PUT/DELETE | `/api/budget/categories/[id]` | DELETE bloqué si dépenses liées |
| GET/POST | `/api/budget/enveloppes` | `annee`, `statut` |
| GET/PUT/DELETE | `/api/budget/enveloppes/[id]` | |
| GET/POST | `/api/budget/depenses` | |
| GET/PUT/DELETE | `/api/budget/depenses/[id]` | PUT `{ statut }` seul possible |
| GET | `/api/budget/synthese` | `?annee=` |

### 2.3 Pages frontend (App Router)

| Zone | Routes exemples |
|------|-----------------|
| Public | `/`, `/login`, `/register` |
| Protégées (`AppShellLayout`) | `/dashboard`, `/employes`, `/presence`, `/paie`, `/recrutement`, `/competences`, `/statistiques`, `/budget` (+ sous-pages) |

---

## 3. Schéma de données

### 3.1 ERD simplifié

```
users (autonome)

employes ──┬── presences
           ├── absences
           ├── paie
           ├── competences
           ├── formations
           ├── evaluations
           └── activite_log (FK nullable)

offres_emploi ─── candidatures

budget_categories ─── budget_depenses (FK optionnelle)
budget_enveloppes ─── budget_depenses
```

### 3.2 Tables principales

| Table | Clé | Relations |
|-------|-----|-----------|
| `employes` | `id` | Parent de la plupart des modules RH |
| `presences` | `id` | → `employes` CASCADE |
| `absences` | `id` | → `employes` CASCADE |
| `paie` | `id` | → `employes` CASCADE ; unicité `(employe_id, mois, annee)` **en application** |
| `offres_emploi` | `id` | |
| `candidatures` | `id` | → `offres_emploi` CASCADE |
| `competences`, `formations`, `evaluations` | `id` | → `employes` CASCADE |
| `activite_log` | `id` | → `employes` SET NULL ; `meta` JSON (TEXT) |
| `users` | `id` | `email` UNIQUE |
| `budget_*` | `id` | Voir `lib/db.ts` lignes 224–262 |

### 3.3 Colonnes métier importantes (`employes`)

| Colonne | Rôle |
|---------|------|
| `salaire_base` | Base bulletin |
| `def_prime_transport`, `def_prime_logement`, `def_prime_performance`, `def_autres_primes` | Défauts à la génération paie (0 par défaut) |
| `def_taux_cnss`, `def_taux_impot` | Taux 0–1 ; si null → retenue 0 à la génération |

**Non présent dans le schéma actuel :** `date_fin_contrat` (CDD / stage).

### 3.4 Index SQLite

- `presences(date)`, `presences(employe_id, date)`
- `paie(annee, mois)`, `paie(employe_id)`
- `absences(employe_id)`
- `activite_log(created_at DESC)`
- `budget_depenses(enveloppe_id)`, `budget_depenses(date_depense)`, `budget_enveloppes(annee)`

### 3.5 Migrations inline

Exécutées au démarrage si colonnes absentes :

- `employes.salaire_base`
- `employes.def_prime_*`, `def_taux_*`
- `offres_emploi.cible_candidats`
- Tables budget (CREATE IF NOT EXISTS)
- Seed admin : `admin@bvgroupe.com` / `Admin@2026`

---

## 4. Logique métier

### 4.1 Fichiers centraux

| Fichier | Rôle |
|---------|------|
| `lib/schemas.ts` | Schémas Zod (validation entrées) |
| `lib/paie-calc.ts` | `calcSalaireNet()` |
| `lib/db.ts` | Connexion SQLite + `logActivite()` |
| `lib/types.ts` | Types TypeScript partagés |

### 4.2 Règles critiques à reproduire

#### Paie

- **Génération masse** : tous les employés `statut = 'actif'` ; ignore si bulletin existe déjà.
- **CNSS** : `round(salaire_base × def_taux_cnss)` si taux défini, sinon `0`.
- **Impôt** : `round(brut × def_taux_impot)` si taux défini, sinon `0` ; `brut = base + primes`.
- **Net** : `round(brut - cnss - impot - autres_retenues)`.
- **Statut `paye`** : renseigne `date_paiement` ; `en_attente` / `annule` → `date_paiement = null`.

#### Évaluations

- `note_globale = moyenne(ponctualite, qualite_travail, travail_equipe, initiative)` arrondie à 2 décimales.

#### Budget

- Synthèse : réalisé = dépenses `approuve` + `paye` ; taux consommation vs enveloppes `actif`.
- DELETE catégorie interdit si référencée par une dépense.
- PUT dépense avec **uniquement** `{ statut }` → changement de workflow rapide.

#### Inscription

- Rôles autorisés via API : `rh`, `manager` uniquement (pas `admin`).

### 4.3 Écarts / non implémenté

| Sujet | État |
|-------|------|
| Heures supplémentaires (`presences.heures_supplementaires`) | Stockées, **non** utilisées en paie |
| RBAC par rôle | Absent sur les API |
| Upload CV / fichiers | Colonnes présentes, pas d’API |
| Export Excel | Client (`xlsx`) sur pages employés et paie |
| Intégrations API tierces | Aucune |

---

## 5. Authentification et sécurité

### 5.1 Session cookie (pas JWT)

- Cookie : `bv-session`
- Payload JSON signé HMAC-SHA256 (`AUTH_SECRET` ou secret par défaut en dur ⚠️)
- Durée : 7 jours
- Attributs : `httpOnly`, `sameSite: lax`, `secure: false` (Electron / local)

### 5.2 Rôles

| Rôle | Création |
|------|----------|
| `admin` | Seed DB |
| `manager`, `rh` | Inscription (`POST /api/auth/register`) |

**Aucune restriction par rôle** sur les endpoints métier aujourd’hui.

### 5.3 Variables d’environnement

| Variable | Effet |
|----------|--------|
| `AUTH_SECRET` | Secret de signature session |
| `BV_DB_PATH` | Chemin fichier SQLite |
| `BV_AUTH_DISABLED=1` | Désactive le proxy + session dev factice |
| `BV_TEST_BYPASS=1` | Active `GET /api/auth/test-bypass` |
| `AUTH_DISABLE_REGISTRATION` | Bloque l’inscription |

### 5.4 Risques à traiter en migration

1. Secret par défaut si `AUTH_SECRET` manquant.
2. Compte admin seed avec mot de passe connu.
3. Endpoints publics exposant des agrégats RH.
4. Register non whiteliste dans `proxy.ts`.
5. Pas de rate limiting ni traçabilité `user_id` dans `activite_log`.

---

## 6. Dépendances et équivalents NestJS

| Actuel | Usage | Cible NestJS / PG |
|--------|-------|-------------------|
| `better-sqlite3` | Base synchrone | **Prisma** ou **TypeORM** + `pg` |
| `bcryptjs` | Mots de passe | `bcrypt` + `@nestjs/passport` |
| `zod` | Validation | `class-validator` ou conserver Zod |
| `next` + API Routes | Backend | Module Nest dédié |
| `swr`, `react-hook-form` | Frontend | Inchangé côté client |
| `xlsx` | Export client | `exceljs` si export serveur |
| `electron` | Desktop | Option : API Nest distante |

---

## 7. Plan de migration

### 7.1 Ordre recommandé

| # | Module | Complexité |
|---|--------|--------------|
| 1 | Infra Nest + PostgreSQL + migrations | Haute |
| 2 | Auth (login, register, session/JWT) | Moyenne |
| 3 | Users + RBAC (à définir) | Moyenne |
| 4 | Employés | Moyenne |
| 5 | Compétences / formations | Faible |
| 6 | Présences / absences | Moyenne |
| 7 | Paie | **Haute** |
| 8 | Recrutement | Moyenne |
| 9 | Évaluations | Faible |
| 10 | Dashboard / statistiques | Moyenne |
| 11 | Budget | Moyenne |
| 12 | Journal d’activité | Faible |
| 13 | Rebranchement frontend | Moyenne |

### 7.2 Structure NestJS suggérée

```
src/
  modules/
    auth/
    users/
    employes/
    presences/
    absences/
    paie/           # PaieService + port de paie-calc.ts
    recrutement/
    competences/
    evaluations/
    budget/
    dashboard/
  common/           # Interceptor { ok, data }, pipes, guards
```

### 7.3 Recommandations PostgreSQL

- `UNIQUE (employe_id, mois, annee)` sur `paie`.
- Enums PG pour les statuts (remplacer les `CHECK` SQLite).
- `TIMESTAMPTZ` / `DATE` pour remplacer les dates en `TEXT`.
- Script ETL SQLite → PG (attention aux formats ISO en TEXT).

### 7.4 Tableau synthèse

| Module | Complexité | Risque principal |
|--------|------------|------------------|
| Infra + PG | Haute | Types, contraintes, migration données |
| Auth | Moyenne | Register public, secret, Electron/cookies |
| Paie | Haute | Double POST, calculs, unicité période |
| Budget | Moyenne | Workflow statuts, synthèse SQL |
| Dashboard / stats | Moyenne | Requêtes agrégées dupliquées |
| Employés | Moyenne | Défauts paie sur fiche |
| Reste CRUD | Faible à moyenne | Peu de règles |

---

## 8. Checklist de non-régression

- [ ] Login / logout / register (cookie ou JWT selon choix)
- [ ] Génération paie `{ mois, annee }` → `generated` / `skipped`
- [ ] Recalcul `salaire_net` après PUT bulletin
- [ ] Statut bulletin `paye` → `date_paiement`
- [ ] PUT dépense budget `{ statut }` seul
- [ ] DELETE catégorie budget avec dépenses → 409
- [ ] Unicité bulletin par employé et période
- [ ] Endpoints publics landing (comportement voulu en prod)
- [ ] Désactivation `test-bypass` et admin seed en production
- [ ] Exports Excel employés / paie
- [ ] CASCADE suppression employé (enfants supprimés)

---

## 9. Annexes

### 9.1 Fichiers clés du dépôt

| Fichier | Contenu |
|---------|---------|
| `lib/db.ts` | **Schéma SQL + migrations + seed admin** |
| `lib/schemas.ts` | Validation Zod de toutes les entités |
| `lib/auth.ts` | Session, hash, création compte |
| `lib/auth-verification.ts` | Flags désactivation auth dev |
| `lib/paie-calc.ts` | Formule net à payer |
| `lib/api-utils.ts` | Enveloppe JSON `ok` / `data` / `error` |
| `proxy.ts` | Garde cookie (équivalent middleware) |
| `hooks/api.ts` | Hooks SWR côté client |

### 9.2 Corrections pré-migration (recommandées sur l’existant)

1. Ajouter `/register` à `PUBLIC_PAGES` dans `proxy.ts`.
2. Ajouter `/api/auth/register` à `PUBLIC_API_PREFIXES`.
3. Imposer `AUTH_SECRET` en production (refuser le démarrage sinon).
4. Désactiver le seed admin ou forcer changement de mot de passe au premier login.

---

*Document généré à partir de l’analyse du code source. Ne pas utiliser comme spécification sans revalidation après évolution du dépôt.*

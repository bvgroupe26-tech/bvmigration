# Audit technique — PWA RH (`bv-groupe-rh`)

**Date :** juin 2026  
**Périmètre :** frontend Next.js `bv-groupe-rh` (+ backend Nest `bvGrooupebackend` pour l’auth)  
**Objectif :** analyser deux problèmes critiques signalés — **sans correctifs** (audit uniquement).

1. L’application **ne fonctionne pas offline**
2. La **session auth est perdue** à chaque fermeture de l’app (reconnexion obligatoire)

---

## Table des matières

1. [Vue d’ensemble du projet](#1-vue-densemble-du-projet)
2. [Audit PWA / offline](#2-audit-pwa--offline)
3. [Audit auth / persistance de session](#3-audit-auth--persistance-de-session)
4. [Audit gestion d’état](#4-audit-gestion-détat)
5. [Environnement & configuration](#5-environnement--configuration)
6. [Cartographie des 2 problèmes critiques](#6-cartographie-des-2-problèmes-critiques)
7. [Fichiers pivots (futures corrections)](#7-fichiers-pivots-futures-corrections)

---

## 1. Vue d’ensemble du projet

### 1.1 Dépendances principales (`package.json`)

| Catégorie | Paquets | Versions |
|-----------|---------|----------|
| Framework | `next`, `react`, `react-dom` | ^16.2.1, 19.2.4 |
| PWA | `@ducanh2912/next-pwa` → **Workbox 7.1.x** | ^10.2.9 |
| Données | `swr` | ^2.4.1 |
| Formulaires | `react-hook-form`, `@hookform/resolvers`, `zod` | — |
| UI | `framer-motion`, `lucide-react`, `tailwindcss` v4, `sonner` | — |
| Desktop (hors PWA) | `electron`, `electron-builder` | — |
| Legacy local | `better-sqlite3` (dev) | — |

**Absent du projet :** NextAuth, Supabase Auth, Better Auth, Zustand, Redux (utilisés), IndexedDB métier, `vite-plugin-pwa`.

### 1.2 Structure (résumé)

```
bv-groupe-rh/
├── app/                    # App Router (pages admin, employee, login, offline, api BFF)
├── components/             # UI, auth, employee, pwa, layout, push
├── context/AuthContext.tsx # Session utilisateur (client)
├── hooks/                  # SWR, employee API, PWA install, push
├── lib/                    # authClient, apiClient, session, avatar, fetcher
├── worker/index.js         # Code custom injecté dans le SW (push)
├── public/sw.js            # Source SW push (enrichi au build par Workbox)
├── proxy.ts                # Garde routes (équivalent middleware Next 16)
├── next.config.ts          # PWA + rewrites API
└── app/manifest.ts         # Web App Manifest dynamique
```

**Backend API :** NestJS sur Render (`https://bvback.onrender.com`), proxifié via `/api/nest/*` et `/api/auth/*` (BFF Next).

---

## 2. Audit PWA / offline

### 2.1 Outil et enregistrement du Service Worker

| Élément | Détail |
|---------|--------|
| **Outil** | `@ducanh2912/next-pwa` (Workbox via `workbox-webpack-plugin`) |
| **Config** | `next.config.ts` L6–43 : `register: true`, `sw: "sw.js"`, `customWorkerSrc: "worker"` |
| **Enregistrement auto** | Oui (`register: true` L9) → injection `workbox-window` au build |
| **Enregistrement manuel** | `hooks/usePushNotifications.ts` L53–55 : `navigator.serviceWorker.register("/sw.js")` |

**Risque :** double chemin d’enregistrement (next-pwa + push) sur le même `sw.js`.

**État du dépôt :** `public/sw.js` ne contient **que** la logique push (~152 lignes), pas Workbox. Le SW complet Workbox n’existe qu’**après `next build`** (génération webpack). En dev, le SW est souvent absent ou incomplet.

### 2.2 Stratégies de cache (Workbox par défaut + config projet)

**Config projet (`next.config.ts`) :**

```ts
cacheOnFrontEndNav: false,
aggressiveFrontEndNavCaching: false,
reloadOnOnline: true,
```

| Type | Stratégie | Référence |
|------|-----------|-----------|
| Assets statiques (`/_next/static`, images, fonts, CSS, JS) | **StaleWhileRevalidate** / **CacheFirst** | Defaults `@ducanh2912/next-pwa` |
| Requêtes RSC (`RSC: 1`) | **NetworkFirst** | Defaults Workbox |
| Navigation HTML same-origin | **NetworkFirst** | Defaults Workbox |
| `/api/*` (inclut `/api/nest` côté navigateur) | **NetworkFirst** | Defaults Workbox |
| Fallback document hors-ligne | **navigateFallback → `/offline`** | `next.config.ts` L17–18, L22 |

**Pas de** stratégie « app métier offline » : pas de Cache First sur les pages employé, pas de file d’attente réseau.

### 2.3 Précache

**Entrées explicites** (`next.config.ts` L32–41) :

- `/offline`, `/login`, `/dashboard`, `/employes`, `/presence`, `/paie`, `/budget`, `/profile`

**Manquant pour l’usage PWA employé :**

- `/employee/dashboard`, `/employee/presence`, `/employee/leaves`, `/employee/documents`, `/employee/profile`, etc.

### 2.4 Manifest

| Champ | Valeur / fichier |
|-------|------------------|
| Fichier | `app/manifest.ts` (route `manifest.webmanifest`) |
| Référence layout | `app/layout.tsx` L37 |
| `display` | `standalone` (`app/manifest.ts` L10) |
| `start_url` | `/` (`app/manifest.ts` L8) |
| Icons | 192, 512, maskable (`app/manifest.ts` L15–33) |

**Correct pour installation PWA**, mais `start_url: "/"` renvoie vers la landing, pas directement l’espace connecté.

### 2.5 Comportement sans réseau

| Scénario | Comportement actuel |
|----------|---------------------|
| Navigation vers une page app | Workbox tente le réseau (NetworkFirst RSC/HTML) → échec → possible fallback `/offline` si navigation document éligible |
| `/offline` | Page UX (`app/offline/page.tsx`) — bouton « Se reconnecter » → `/login` (L10) |
| Données RH (employés, congés, etc.) | **Aucune** — `apiClient` / `fetcher` → réseau obligatoire |
| IndexedDB / Background Sync | **Absent** |

### 2.6 Synthèse PWA

#### Ce qui est correctement implémenté

- Plugin PWA Workbox branché au build (`next.config.ts` L6–43).
- Page fallback `/offline` (`app/offline/page.tsx`).
- Manifest + `viewportFit: cover` pour encoches (`app/layout.tsx` L53–58).
- Cache des chunks `_next/static` et assets statiques (défaut Workbox).
- `ChunkLoadRecovery` pour récupération post-déploiement (`components/pwa/ChunkLoadRecovery.tsx` L20–31).
- `reloadOnOnline: true` (`next.config.ts` L16).

#### Ce qui est cassé ou manquant

| Problème | Fichier:Ligne |
|----------|---------------|
| **L’app métier n’est pas utilisable offline** (RSC + API en NetworkFirst, pas de store local) | Workbox defaults ; `lib/apiClient.ts` |
| **Routes employé PWA non précacheées** | `next.config.ts` L32–41 |
| **`cacheOnFrontEndNav: false`** — pas de cache de navigation front | `next.config.ts` L14 |
| **Aucune persistance API offline** (IndexedDB, sync) | Projet entier |
| **SW repo = push only** avant build — offline dépend du build prod | `public/sw.js` L1–152 |
| **Fallback offline renvoie vers login**, pas reprise de session/app | `app/offline/page.tsx` L8–11 |

#### Partiel / risqué

| Risque | Fichier:Ligne |
|--------|---------------|
| `navigateFallbackDenylist` exclut `/login`, `/api/`, `/_next/`, fichiers avec extension | `next.config.ts` L23–30 |
| Next.js 16 App Router : pages dynamiques RSC difficiles à servir offline même avec precache URL | Architecture Next |
| `DISABLE_PWA=true` désactive tout le SW | `next.config.ts` L8 |
| Conflit potentiel double registration SW | `next.config.ts` L9 + `hooks/usePushNotifications.ts` L53–55 |

---

## 3. Audit auth / persistance de session

### 3.1 Bibliothèque auth

**Auth maison (JWT + BFF Next + NestJS)** — pas NextAuth / Supabase.

| Couche | Rôle |
|--------|------|
| Client | `lib/authClient.ts`, `context/AuthContext.tsx` |
| BFF | `app/api/auth/login|refresh|logout/route.ts` → `lib/auth-proxy-server.ts` |
| API | Nest `bvGrooupebackend/src/modules/auth/` |

### 3.2 Stockage des jetons

| Jeton | Stockage | HttpOnly | Secure (prod) | SameSite |
|-------|----------|----------|---------------|----------|
| **Access JWT** `bv-token` | Cookie **lisible JS** + variable module `accessToken` | **Non** (`app/api/set-token/route.ts` L19) | Oui (L21) | `lax` (L20) |
| **Refresh** `refresh_token` | Cookie HttpOnly via BFF | **Oui** (`lib/auth-proxy-server.ts` L114–115) | Oui (L116) | **Forcé `lax`** (L117) |
| **Profil user** | `useState` React uniquement | — | — | — |

**Mémoire volatile :** `lib/authClient.ts` L19–20 (`let accessToken`) — perdu à la fermeture du process, **mais** rechargé depuis cookie `bv-token` L54–63.

### 3.3 Expiration et refresh

| Paramètre | Valeur code |
|-----------|-------------|
| Access JWT (défaut Nest) | `ACCESS_TOKEN_EXPIRES_IN` défaut **`7d`** (`bvGrooupebackend/.../auth.module.ts` L34–37) |
| Refresh token DB | **60 jours** (`auth-cookie.util.ts` L4–5, L23) |
| Cookie `bv-token` maxAge | `min(7j, exp JWT)` (`lib/session.ts` L86–91, `set-token/route.ts` L17) |
| Refresh proactif | Buffer **120 s** avant exp (`lib/session.ts` L54, L78–83) |
| SessionKeeper | Intervalle **60 s** + focus/visibility (`SessionKeeper.tsx` L12, L48–55) |

**Pas de case « Se souvenir de moi »** — `components/auth/LoginForm.tsx` L16–19.

### 3.4 Survie fermeture navigateur + réouverture

**Théorique (en ligne) :**

1. Cookies `refresh_token` + `bv-token` survivent (first-party, Vercel).
2. Au chargement, `AuthProvider` appelle `bootstrap()` (`AuthContext.tsx` L107–118).
3. `restoreSessionAccessToken()` → cookie ou `POST /api/auth/refresh` (`authClient.ts` L221–223).
4. `GET /auth/me` pour hydrater le profil (`AuthContext.tsx` L79–87).

**Causes probables de « re-login à chaque fermeture » :**

| Cause | Fichier:Ligne |
|-------|---------------|
| **Bootstrap 100 % réseau** — sans réseau → échec → session effacée | `AuthContext.tsx` L134–139 |
| **Échec refresh** (timeout 20s, Render cold start, cookie absent) → `resetAuthSessionState()` | `authClient.ts` L29, L171–174 ; `AuthContext.tsx` L138–139 |
| **Profil utilisateur jamais persisté** (localStorage) — UI vide jusqu’à `/auth/me` | `AuthContext.tsx` L91–92 |
| **`bootstrap` relancé à chaque changement de route** (`pathname` dans deps) | `AuthContext.tsx` L125–150 |
| **Pas de mécanisme « session offline »** | — |

**Cookie refresh :** Nest prod utilise `SameSite=None` (`auth-cookie.util.ts` L22), mais le navigateur ne reçoit que les cookies posés par **Vercel** via BFF avec `SameSite=Lax` (`auth-proxy-server.ts` L114–120) — **OK** tant que login/refresh passent par le domaine Vercel (`/api/auth/*`).

### 3.5 Middleware / garde routes

| Mécanisme | Fichier | Comportement |
|-----------|---------|--------------|
| **`proxy.ts`** (pas `middleware.ts`) | L25–68 | Redirection rôles si `bv-token` valide ; **laisse passer** si seul `refresh_token` L42–47 |
| **`AuthContext`** (client) | L152–165 | Redirige vers `/login` si non authentifié |
| **`AuthGuard`** | `AuthGuard.tsx` L22–70 | Garde par rôle côté client |

**Pas de vérification JWT côté Edge** sur les pages protégées si seul refresh cookie présent.

### 3.6 Synthèse auth

#### Correct

- Architecture BFF `/api/auth/*` avec `credentials: "include"` (`authClient.ts` L90).
- Refresh token HttpOnly longue durée (60 j) côté Nest.
- Rotation refresh + proxy cookies (`auth-proxy-server.ts` L159–165).
- `SessionKeeper` pour reprise focus/PWA (`SessionKeeper.tsx`).
- Renouvellement JWT proactif dans `apiClient` (`apiClient.ts` L46–56).

#### Cassé / manquant

| Problème | Fichier:Ligne |
|----------|---------------|
| **Pas de persistance du profil** hors mémoire React | `AuthContext.tsx` L91–92 |
| **Pas de « remember me » / session offline** | `LoginForm.tsx` |
| **Échec bootstrap = déconnexion** même si refresh cookie valide mais réseau lent | `AuthContext.tsx` L136–139 |
| **Access token non HttpOnly** (XSS → vol de session) | `set-token/route.ts` L18–19, `authClient.ts` L37–46 |

#### Partiel / risqué

| Risque | Fichier:Ligne |
|--------|---------------|
| `getTokenMaxAgeSeconds` peut raccourcir le cookie au TTL JWT si env prod = JWT court | `lib/session.ts` L86–91 |
| Garde `proxy.ts` permissive sans access token | `proxy.ts` L42–47 |
| iOS / PWA : purge cookies/storage après inactivité (comportement OS) | — |
| `FRONTEND_URL` mal configuré sur Render → cookies/CORS | `env.validation.ts` L26–28 |

---

## 4. Audit gestion d’état

| Type | Usage |
|------|--------|
| **React Context** | `AuthContext` — user, `isAuthenticated`, `isLoading` |
| **SWR** | Données API (`hooks/employee.ts`, `fetcher.ts`) — cache **mémoire**, revalidation réseau |
| **localStorage** | Avatars locaux (`avatar-utils.ts`), PWA dismiss, push banner, postes référentiel — **pas l’auth** |
| **sessionStorage** | `ChunkLoadRecovery` une fois (`ChunkLoadRecovery.tsx` L25–27) |

### Perdu à la fermeture complète de l’app

- État React (`user`, listes SWR en RAM).
- Variable `accessToken` en module (`authClient.ts` L19).

### Conservé (si cookies OK)

- `bv-token`, `refresh_token`.
- localStorage métier non-auth (avatar, préférences PWA).

---

## 5. Environnement & configuration

### 5.1 Variables frontend (documentées / utilisées)

| Variable | Rôle | Fichier |
|----------|------|---------|
| `API_PROXY_TARGET` | Cible Nest (rewrites + BFF) | `next.config.ts`, `auth-proxy-server.ts` |
| `NEXT_PUBLIC_API_URL` | URL API côté serveur Node | `resolve-api-url.ts`, `.env.example` |
| `DISABLE_PWA` | Désactive le SW | `next.config.ts` L8 |
| `NODE_ENV` | secure cookies, API default | plusieurs |
| `BV_AUTH_DISABLED` | Bypass auth dev | `auth-verification.ts` L17 |
| `BV_DB_PATH` | SQLite legacy | `lib/db.ts` L10 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push | `push-notifications.ts` L3 |

### 5.2 Backend (impact session)

| Variable | Impact |
|----------|--------|
| `ACCESS_TOKEN_SECRET` / `AUTH_SECRET` | Signature JWT |
| `ACCESS_TOKEN_EXPIRES_IN` | Durée session access (défaut 7d) |
| `REFRESH_TOKEN_SECRET` | Refresh |
| `FRONTEND_URL` | CORS + cookies (requis prod) |

### 5.3 Écarts dev / prod

| Écart | Effet |
|-------|--------|
| Dev : API `127.0.0.1:3001` ; Prod : Render | Latence / cold start → timeout refresh 20s |
| PWA active surtout en **prod build** ; `next dev` ≠ même SW | Offline non reproductible en dev |
| `secure: true` cookies seulement en prod | Comportement cookies différent localhost vs HTTPS |
| `cacheOnFrontEndNav: false` | Moins de pages en cache qu’une PWA « offline-first » |

> **Note :** ne pas committer `.env.local`. Vérifier en prod : `ACCESS_TOKEN_EXPIRES_IN`, `FRONTEND_URL`, absence de `DISABLE_PWA=true`.

---

## 6. Cartographie des 2 problèmes critiques

### Problème 1 — Ne fonctionne pas offline

```
Utilisateur ouvre PWA hors ligne
    → Service Worker
    → HTML/RSC : NetworkFirst → échec
    → /api/nest/* : NetworkFirst → échec
    → navigateFallback /offline (si éligible)
    → AuthContext bootstrap (refresh + /auth/me) → échec
    → Redirection /login
```

**Conclusion :** PWA **installable** avec shell limité, pas **offline-first**. Offline = page d’erreur + quelques assets statiques.

### Problème 2 — Session perdue à chaque fermeture

```
Fermeture app
    → Cookies refresh + bv-token conservés ?
        → Oui → Réouverture → bootstrap (réseau requis)
            → OK → session restaurée
            → Échec → clearUser + resetAuthSessionState → /login
        → Non (iOS/PWA/cookie) → /login
```

**Conclusion :** persistance **dépend d’un bootstrap réseau réussi** ; pas de restauration locale du profil ni de mode dégradé offline authentifié.

---

## 7. Fichiers pivots (futures corrections)

| Priorité | Fichier | Sujet |
|----------|---------|--------|
| P0 | `context/AuthContext.tsx` | Bootstrap offline, ne pas wipe session si refresh cookie présent |
| P0 | `next.config.ts` | Precache employee, stratégie offline, `cacheOnFrontEndNav` |
| P0 | `lib/authClient.ts` | Persistance / retry refresh au cold start |
| P1 | `lib/auth-proxy-server.ts` | Alignement cookies refresh (SameSite, maxAge) |
| P1 | `app/offline/page.tsx` | UX offline + session |
| P2 | Nouveau module | IndexedDB / queue sync (si offline métier requis) |

---

## Documents liés

- [AUDIT-MIGRATION-NESTJS.md](./AUDIT-MIGRATION-NESTJS.md)
- [README.md](../README.md) — configuration env et proxy API

---

*Audit réalisé par analyse statique du code source. Aucune modification applicative n’a été effectuée dans le cadre de cet audit.*

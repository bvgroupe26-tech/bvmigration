# Audit complet — Notifications Push PWA (Next.js + NestJS)

Documentation technique consolidée : audit architecture, problèmes détectés, causes racines, plan de correction et vérifications.

**Projets analysés :**
- Frontend : `bv-groupe-rh` (Next.js 16, Vercel)
- Backend : `bvGrooupebackend` (NestJS, Render — préfixe `/api`)

**Docs complémentaires :**
- [POSTMAN-TEST-PUSH.md](./POSTMAN-TEST-PUSH.md) — tests API
- [README-PUSH-PWA-DIAGNOSTIC.md](./README-PUSH-PWA-DIAGNOSTIC.md) — synthèse diagnostic + auth
- [AUDIT-PWA-AUTH.md](./AUDIT-PWA-AUTH.md) — audit PWA + auth global

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Contexte technique](#2-contexte-technique)
3. [Audit backend NestJS](#3-audit-backend-nestjs)
4. [Audit base de données](#4-audit-base-de-données)
5. [Audit frontend Next.js](#5-audit-frontend-nextjs)
6. [Audit Service Worker](#6-audit-service-worker)
7. [Flux complet](#7-flux-complet)
8. [Audit appels API](#8-audit-appels-api)
9. [Erreurs navigateur](#9-erreurs-navigateur)
10. [Logs backend](#10-logs-backend)
11. [HTTPS et déploiement](#11-https-et-déploiement)
12. [Dépendances](#12-dépendances)
13. [Variables d'environnement](#13-variables-denvironnement)
14. [Configurations importantes](#14-configurations-importantes)
15. [Problèmes détectés (détail)](#15-problèmes-détectés-détail)
16. [Causes racines](#16-causes-racines)
17. [Plan de correction](#17-plan-de-correction)
18. [Vérifications finales](#18-vérifications-finales)

---

## 1. Résumé exécutif

| Indicateur | Évaluation |
|------------|------------|
| **État global** | Chaîne **partiellement fonctionnelle** — backend et subscribe OK si env + déploiement corrects ; affichage hors app **fragile sur iOS** |
| **Fonctionnement estimé** | **~75–85 %** après corrections commitées + déploiement Vercel (`--webpack`) + VAPID alignées |
| **Blocage principal historique** | Service Worker **sans handler `push`** en prod (build Next 16 Turbopack sans webpack) |
| **Blocage secondaire observé** | Désynchronisation **navigateur ↔ base** (`isSubscribed` local, `subscriptionCount: 0` serveur) |

### Chaîne — état par étape

| Étape | Statut | Fichier / preuve |
|-------|--------|------------------|
| Permission | ✅ | `lib/push-notifications.ts` |
| SW enregistré | ✅ si `next build --webpack` | `next.config.ts`, `public/sw.js` |
| `pushManager.subscribe` | ✅ | `lib/push-notifications.ts` |
| POST `/push/subscribe` + JWT | ✅ | `lib/apiClient.ts`, guard NestJS |
| Sauvegarde Prisma | ✅ | `push_subscriptions` |
| `webPush.sendNotification` | ✅ si VAPID OK | `push-notification.service.ts` |
| SW reçoit push | ✅ si SW déployé | `worker/index.js` |
| Notification affichée (iOS PWA) | ⚠️ | SW + app fermée + réglages iOS |

**Note :** ce projet **n'utilise pas Firebase SDK**. Push via **Web Push API + `web-push`** vers endpoints natifs (`fcm.googleapis.com`, `web.push.apple.com`).

---

## 2. Contexte technique

### Frontend
- Next.js 16, React 19, PWA `@ducanh2912/next-pwa`
- Service Worker custom : `worker/index.js`
- Proxy API : `/api/nest/*` → Render

### Backend
- NestJS, Prisma, PostgreSQL
- Module : `push-notifications`
- Lib : `web-push` ^3.6.7

### Déploiement
- Front : Vercel (`https://…vercel.app`)
- API : Render (`https://bvback.onrender.com/api`)

---

## 3. Audit backend NestJS

### Modules et fichiers

| Fichier | Rôle |
|---------|------|
| `src/modules/push-notifications/push-notification.module.ts` | Module + export service |
| `src/modules/push-notifications/push-notification.controller.ts` | Routes `/push/*` |
| `src/modules/push-notifications/push-notification.service.ts` | VAPID, subscribe, send |
| `src/modules/push-notifications/dto/subscribe-push.dto.ts` | DTO validation |
| `src/modules/notifications/notifications.service.ts` | Dispatch push in-app |
| `src/modules/notifications/notifications-push.util.ts` | Construction payload |
| `src/app.module.ts` | `PushNotificationsModule` enregistré |

### Routes API push

| Route | Auth | Rôle |
|-------|------|------|
| `GET /push/vapid-public-key` | Public | Clé publique VAPID |
| `POST /push/subscribe` | JWT | Upsert subscription |
| `DELETE /push/unsubscribe` | JWT | Supprime endpoint |
| `GET /push/status` | JWT | Diagnostic `subscriptionCount` |
| `POST /push/test` | JWT | Envoi test |

> **Pas** de routes `/notifications/subscribe` — le chemin correct est **`/push/subscribe`**.

### `webPush.setVapidDetails`

Exécuté dans `onModuleInit()` **si** les 3 variables sont présentes :

```typescript
// push-notification.service.ts
const publicKey = this.config.get('VAPID_PUBLIC_KEY');
const privateKey = this.config.get('VAPID_PRIVATE_KEY');
const mailto = this.config.get('VAPID_MAILTO');

if (!publicKey || !privateKey || !mailto) {
  this.logger.warn('VAPID non configuré — push Web désactivé');
  return;
}
webPush.setVapidDetails(mailto, publicKey, privateKey);
this.vapidConfigured = true;
```

Si VAPID manquant : l'app **démarre** mais push **inactif** (`vapidConfigured = false`).

### `webPush.sendNotification`

- Récupère subscriptions par `userId` (`deletedAt: null`)
- Payload JSON : `title`, `body`, `tag`, `url`, `icon`, `data`
- Options : `TTL: 86400`, `urgency: 'high'`
- Headers Apple si `web.push.apple.com`
- Erreurs **410/404** → suppression subscription en base
- Si 0 subscription → log `warn`, retour `{ sent: 0, failed: 0 }`

### Guards

- `GlobalAuthGuard` sur toutes les routes sauf `@Public()`
- `POST /push/subscribe` : `@CurrentUser().id` — **jamais** userId depuis le body

### Intégration notifications in-app

Chaque création de notification → `dispatchPushToUser()` → `sendPush()` (fire-and-forget, erreurs en `logger.warn`).

---

## 4. Audit base de données

### Schéma Prisma

```prisma
model PushSubscription {
  id        Int      @id @default(autoincrement())
  userId    Int
  endpoint  String   @unique
  keys      Json
  createdAt DateTime @default(now())
  deletedAt DateTime?
  user      User     @relation(...)
  @@map("push_subscriptions")
}
```

### Format attendu (body subscribe)

```json
{
  "endpoint": "https://web.push.apple.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**Ne pas inclure** `expirationTime` (rejeté par validation NestJS).

### Migration

`prisma/migrations/20260530210000_push_subscriptions/migration.sql`

### Opérations

| Opération | Méthode | Fichier |
|-----------|---------|---------|
| Insert/update | `upsert` sur `endpoint` | `push-notification.service.ts` |
| Suppression | `deleteMany` / `delete` | unsubscribe, handlePushError 410 |
| Lecture envoi | `findMany` userId + deletedAt null | `sendPush` |

---

## 5. Audit frontend Next.js

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `lib/push-notifications.ts` | Subscribe, VAPID, sync serveur |
| `context/PushNotificationsContext.tsx` | Provider, état UI |
| `context/AuthContext.tsx` | `resyncPushAfterAuth()` après login |
| `lib/apiClient.ts` | Bearer JWT sur `/push/subscribe` |
| `components/pwa/PwaPushSettingsCard.tsx` | UI activation + sync |
| `components/push/PushNotificationClickHandler.tsx` | Navigation clic push |

### Flux subscribe

1. `Notification.requestPermission()` si `default`
2. `waitForServiceWorkerRegistration()` — **attente only**, pas de second `register()`
3. `pushManager.getSubscription()` ou `pushManager.subscribe(VAPID)`
4. Vérif `getAccessToken()` avant POST
5. `POST /api/nest/push/subscribe` via `apiFetch`

### Déclencheurs

| UI | Condition auth |
|----|----------------|
| Bannière push | `isAuthenticated` requis |
| Profil → Activer | Page protégée session |
| Auto resync | `resyncPushAfterAuth()` après login |

**Pas** d'auto-subscribe au login sans action utilisateur (sauf resync si permission déjà granted).

### État UI vs serveur

`isSubscribed` = subscription **navigateur** uniquement. Peut diverger de `GET /push/status` → `PwaPushSettingsCard` compense partiellement.

---

## 6. Audit Service Worker

### Fichiers

| Fichier | Rôle |
|---------|------|
| `worker/index.js` | Source custom (push, click, resync) |
| `public/sw.js` | Généré au build Workbox + `importScripts(worker-*.js)` |
| `next.config.ts` | `customWorkerSrc: "worker"`, `register: true` |

### Listeners `worker/index.js`

| Event | Présent | Rôle |
|-------|---------|------|
| `push` | ✅ | Parse JSON → `showNotification()` |
| `notificationclick` | ✅ | Ouvre `/employee/notifications` ou URL payload |
| `pushsubscriptionchange` | ⚠️ | Re-subscribe local + message client (pas POST direct) |
| `sync` | ✅ | Sync offline tag `bv-rh-sync` |

### Build critique

```json
// package.json
"build": "next build --webpack"
```

Sans `--webpack` (Turbopack Next 16) : **`public/sw.js` reste vide** → push impossible hors app.

Preuve post-build :
```javascript
importScripts("/fallback-....js","/worker-ee7db868282114fd.js")
```

### Pas de double enregistrement

Aucun `navigator.serviceWorker.register()` dans le code applicatif — next-pwa gère l'enregistrement.

---

## 7. Flux complet

```
Utilisateur connecté
    ↓
Demande permission (Notification.requestPermission)
    ↓
Permission accordée
    ↓
Service Worker prêt (next-pwa register)
    ↓
PushSubscription (pushManager.subscribe + VAPID)
    ↓
POST /push/subscribe + Bearer JWT
    ↓
Upsert push_subscriptions (userId + endpoint + keys)
    ↓
Événement métier → createNotification → sendPush
    ↓
webPush.sendNotification → Apple/FCM endpoint
    ↓
Navigateur réveille Service Worker
    ↓
addEventListener('push') → showNotification()
    ↓
Utilisateur voit alerte système (app fermée)
```

### Ruptures observées en session

| Symptôme | Rupture |
|----------|---------|
| UI « activé », `subscriptionCount: 0` | POST subscribe raté |
| `sent: 0` | Pas de ligne en base |
| `sent: 1`, pas de notif écran | SW sans listener push (build) ou iOS |

---

## 8. Audit appels API

### Frontend → Backend

| Appel | Méthode | URL effective | Auth |
|-------|---------|---------------|------|
| Subscribe | POST | `/api/nest/push/subscribe` | Bearer + cookie refresh |
| Unsubscribe | DELETE | `/api/nest/push/unsubscribe` | Bearer |
| Status | GET | `/api/nest/push/status` | Bearer |
| Test | POST | `/api/nest/push/test` | Bearer |
| VAPID key | GET | `/api/nest/push/vapid-public-key` | Public |

### Réponses typiques

| Réponse | Signification |
|---------|---------------|
| `{ sent: 1, failed: 0 }` | Envoyé vers Apple/Google |
| `{ sent: 0, failed: 0, subscriptionCount: 0 }` | Pas d'abonnement en base |
| `{ sent: 0, failed: 1 }` | Clés VAPID ou subscription invalide |
| 401 sur subscribe | JWT absent ou expiré |
| 503 sur vapid-public-key | `VAPID_PUBLIC_KEY` absent sur Render |

---

## 9. Erreurs navigateur

### Où diagnostiquer

- **Console** : erreurs JS, permission denied
- **Application → Service Workers** : SW actif, scope `/`
- **Application → Push** : subscription endpoint
- **Network** : `/api/nest/push/subscribe` → 200/401

### Commandes console (PWA installée)

```javascript
// SW count (doit être 1)
navigator.serviceWorker.getRegistrations().then(r => console.log('SW:', r.length));

// SW contient worker push
fetch('/sw.js').then(r => r.text()).then(t => console.log('push bundled:', t.includes('worker-')));

// Subscription
navigator.serviceWorker.ready
  .then(r => r.pushManager.getSubscription())
  .then(s => console.log('endpoint:', s?.endpoint));

// Test showNotification local
navigator.serviceWorker.ready.then(reg =>
  reg.showNotification('Test', { body: 'SW OK', icon: '/icons/icon-192.png' })
);
```

### Erreurs fréquentes

| Erreur | Cause |
|--------|-------|
| Permission denied | Utilisateur a refusé |
| SW indisponible | Dev mode ou build sans webpack |
| 401 subscribe | Non connecté ou token expiré |
| Clé VAPID invalide | Format ou mismatch front/back |
| Mixed content | HTTP sur page HTTPS (rare en prod Vercel) |

---

## 10. Logs backend

### Où regarder

Render → Logs du service `bv-groupe-rh-api`

### Messages clés

| Log | Signification |
|-----|---------------|
| `Web Push VAPID configuré` | OK |
| `VAPID non configuré` | Push désactivé |
| `Push subscription enregistrée #N pour user #X` | Subscribe OK |
| `Push non envoyé … aucun appareil abonné` | 0 subscription |
| `Push envoyé user #X : 1 ok` | Envoi OK |
| `Échec envoi push subscription #N` | Erreur web-push |

### Erreurs masquées

- `dispatchPushToUser` : fire-and-forget (`.catch(warn)`)
- Employé sans User lié : `return` sans log
- `pushsubscriptionchange` SW : DELETE sans JWT (échec silencieux)

---

## 11. HTTPS et déploiement

| Exigence | Statut prod |
|----------|-------------|
| HTTPS | ✅ Vercel + Render |
| Push API | Requis HTTPS |
| PWA installée (iOS) | Requis pour push iOS |
| Certificat SSL | Géré par hébergeurs |

### Render (`render.yaml`)

Déclare seulement `NODE_ENV=production`. **VAPID et FRONTEND_URL** doivent être ajoutées manuellement dans le dashboard Render.

### Vercel

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `API_PROXY_TARGET=https://bvback.onrender.com`
- **Ne pas** définir `DISABLE_PWA=true`

---

## 12. Dépendances

### Frontend (`bv-groupe-rh/package.json`)

| Package | Version | Rôle |
|---------|---------|------|
| `next` | ^16.2.1 | Framework |
| `@ducanh2912/next-pwa` | ^10.2.9 | PWA + Workbox |
| `react` | 19.2.4 | UI |

**Absent :** `firebase`, `workbox-window` (direct)

### Backend (`bvGrooupebackend/package.json`)

| Package | Version | Rôle |
|---------|---------|------|
| `@nestjs/common` | (voir package.json) | Framework |
| `web-push` | ^3.6.7 | Envoi push |
| `@prisma/client` | ✅ | ORM |

### Incompatibilité connue

**Next.js 16 Turbopack build** + **next-pwa (webpack plugin)** → SW non généré.  
**Fix :** `next build --webpack`

---

## 13. Variables d'environnement

### Render (backend)

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_MAILTO=mailto:contact@bvgroupe.com
FRONTEND_URL=https://votre-app.vercel.app
DATABASE_URL=
DIRECT_URL=
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
```

### Vercel (frontend)

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # = VAPID_PUBLIC_KEY Render
API_PROXY_TARGET=https://bvback.onrender.com
```

### Validation au démarrage

`env.validation.ts` exige `FRONTEND_URL` en prod mais **pas** `VAPID_*` → push peut être off sans crash.

Génération clés :
```bash
cd bvGrooupebackend && npm run vapid:generate
```

---

## 14. Configurations importantes

### `next.config.ts`

```typescript
withPWAInit({
  dest: "public",
  disable: process.env.DISABLE_PWA === "true",
  register: true,
  sw: "sw.js",
  customWorkerSrc: "worker",
  customWorkerDest: "public",
  fallbacks: { document: "/offline" },
});
```

### `app/manifest.ts`

- `display: "standalone"`
- Icons 192/512
- Requis iOS PWA push

### `public/sw.js`

- **Ne pas éditer manuellement** en prod — généré au build
- Stub commenté OK dans le repo ; le build webpack le remplace

---

## 15. Problèmes détectés (détail)

| ID | Niveau | Description | Fichier | Solution |
|----|--------|-------------|---------|----------|
| P1 | **Critique** | SW sans code push en prod (build Turbopack) | `package.json`, `public/sw.js` | `next build --webpack` + redeploy |
| P2 | **Critique** | Désync local/serveur subscription | `PushNotificationsContext.tsx` | `resyncPushAfterAuth` (fait) ; aligner `isSubscribed` |
| P3 | **Majeur** | VAPID non validées au boot | `env.validation.ts`, `render.yaml` | Configurer Render + option validation |
| P4 | **Majeur** | Clés VAPID front ≠ back | Vercel/Render env | Aligner clés publiques |
| P5 | **Majeur** | `pushsubscriptionchange` sans POST serveur fiable | `worker/index.js` L165+ | Resync client au démarrage |
| P6 | **Majeur** | iOS PWA affichage fragile | `worker/index.js`, iOS settings | SW déployé + PWA réinstallée |
| P7 | **Majeur** | Push employé sans User — skip silencieux | `notifications.service.ts` | Logger + lier employé→User |
| P8 | **Mineur** | `electron:build` sans `--webpack` | `package.json` L12 | Ajouter flag |
| P9 | **Mineur** | Erreurs push fire-and-forget | `notifications.service.ts` | Logs/métriques |
| P10 | **Mineur** | Docs obsolètes | `docs/AUDIT-PWA-AUTH.md` | Mettre à jour |
| P11 | **Info** | Pas de Firebase SDK | — | Normal pour Web Push standard |
| P12 | **Mineur** | Aucun test auto push | backend | Ajouter tests e2e |

---

## 16. Causes racines

### Cause #1 — Infrastructure (affichage hors app)

Build Next.js 16 **sans `--webpack`** → Service Worker prod **incomplet** → push acceptés par Apple **jamais affichés** par le SW.

### Cause #2 — Application (`sent: 0`)

Abonnement navigateur enregistré **sans garantie serveur** (JWT/timing) → `subscriptionCount: 0` malgré UI « activé ».

### Cause #3 — Ops (push désactivé)

Variables **VAPID / FRONTEND_URL** non imposées → backend démarre avec push **off** sans erreur visible.

---

## 17. Plan de correction

| # | Action | Priorité |
|---|--------|----------|
| 1 | Déployer Vercel avec `next build --webpack` | P0 |
| 2 | Vérifier VAPID Render + Vercel (clés identiques) | P0 |
| 3 | iPhone : supprimer PWA → réinstaller → Activer notifications | P0 |
| 4 | `GET /push/status` → `subscriptionCount ≥ 1` | P0 |
| 5 | `POST /push/test` → `sent: 1`, app fermée | P0 |
| 6 | Vérifier `fetch('/sw.js')` contient `worker-` | P0 |
| 7 | Aligner `isSubscribed` sur serveur | P1 |
| 8 | Documenter VAPID dans `render.yaml` | P2 |
| 9 | `electron:build` → `--webpack` | P3 |
| 10 | Tests automatisés push | P3 |

---

## 18. Vérifications finales

### Postman

```
1. POST /api/auth/login
2. GET  /api/push/status     → subscriptionCount ≥ 1
3. POST /api/push/test       → sent: 1, failed: 0
4. Fermer app téléphone → alerte système
```

### Checklist iPhone

- [ ] PWA installée (icône écran d'accueil)
- [ ] iOS 16.4+
- [ ] Réglages → Notifications → app autorisée
- [ ] Safari → Fonctionnalités expérimentales → Notifications (si présent)
- [ ] Profil → notifications activées + sync serveur OK
- [ ] App fermée avant test push

### Critères de succès

| Test | Attendu |
|------|---------|
| `subscriptionCount` | ≥ 1 |
| `POST /push/test` | `sent: 1` |
| Console `worker bundled` | `true` |
| Notif système app fermée | Visible |
| Clic notif | Ouvre `/employee/notifications` |

---

## Tableau de diagnostic rapide

| Composant | Statut |
|-----------|--------|
| Module push NestJS | ✅ |
| `webPush.setVapidDetails` | ✅ si env |
| `sendNotification` | ✅ |
| Table `push_subscriptions` | ✅ |
| Route `POST /push/subscribe` | ✅ |
| JWT sur subscribe | ✅ |
| `pushManager.subscribe` | ✅ |
| Bearer sur POST subscribe | ✅ |
| SW généré (`--webpack`) | ✅ code / ⚠️ deploy |
| Listener `push` dans SW | ✅ |
| Listener `notificationclick` | ✅ |
| Resync après login | ✅ |
| Clés VAPID cohérentes | ⚠️ vérifier env |
| Affichage iOS hors app | ⚠️ plateforme |
| Firebase | N/A (non utilisé) |

---

*Dernière mise à jour : juin 2026 — BV Groupe RH*

# Push PWA — Guide diagnostic complet

Documentation consolidée : audit technique, lien auth ↔ push, tests Postman, checklist iPhone et pistes de résolution.

**Projets :**
- Frontend : `bv-groupe-rh` (Next.js 16, Vercel)
- Backend : `bvGrooupebackend` (NestJS, Render — préfixe `/api`)

**Docs complémentaires :**
- [POSTMAN-TEST-PUSH.md](./POSTMAN-TEST-PUSH.md) — requêtes Postman détaillées
- [PUSH-SW-NOTIFICATIONS-README.md](./PUSH-SW-NOTIFICATIONS-README.md) — inventaire fichiers push/SW
- [AUDIT-PWA-AUTH.md](./AUDIT-PWA-AUTH.md) — audit PWA + auth global

---

## Table des matières

1. [Stack et flux global](#1-stack-et-flux-global)
2. [Étape 1 — Service Worker](#2-étape-1--service-worker)
3. [Étape 2 — Subscription push (frontend)](#3-étape-2--subscription-push-frontend)
4. [Étape 3 — Envoi push (NestJS)](#4-étape-3--envoi-push-nestjs)
5. [Étape 4 — Clés VAPID](#5-étape-4--clés-vapid)
6. [Étape 5 — Lien Auth ↔ Push](#6-étape-5--lien-auth--push)
7. [Tests console navigateur](#7-tests-console-navigateur)
8. [Tests Postman (résumé)](#8-tests-postman-résumé)
9. [Checklist iPhone](#9-checklist-iphone)
10. [Tableau de diagnostic](#10-tableau-de-diagnostic)
11. [Conclusions](#11-conclusions)
12. [Variables d'environnement](#12-variables-denvironnement)
13. [Pistes de correction (priorités)](#13-pistes-de-correction-priorités)

---

## 1. Stack et flux global

```
Utilisateur connecté (JWT access + refresh cookie HttpOnly)
    │
    ├─ Clic « Activer les notifications » (Profil ou bannière)
    │     └─ ensureWebPushSubscription()  [lib/push-notifications.ts]
    │           ├─ Notification.requestPermission()
    │           ├─ pushManager.subscribe(VAPID)  (si pas déjà abonné localement)
    │           └─ POST /api/nest/push/subscribe  (Bearer JWT)
    │
Backend NestJS
    ├─ upsert push_subscriptions (userId + endpoint + keys)
    └─ webPush.sendNotification() → FCM / web.push.apple.com
              │
Service Worker (/sw.js)
    └─ addEventListener('push') → showNotification()
```

**URLs production :**
- Front : Vercel (proxy `/api/nest/*` → Render)
- API : `https://bvback.onrender.com/api`

---

## 2. Étape 1 — Service Worker

### 2.1 Fichiers SW dans le dépôt

| Fichier | Rôle | Listeners push ? |
|---------|------|------------------|
| `public/sw.js` | Stub volontairement **vide** dans le repo | ❌ (commentaires seulement) |
| `worker/index.js` | Source custom next-pwa | ✅ `push`, `notificationclick`, `pushsubscriptionchange` |

Contenu actuel de `public/sw.js` (repo) :

```js
/* Ce fichier est volontairement vide.
   En production, /sw.js est généré par next-pwa depuis worker/index.js. */
```

**Point critique :** après `npm run build` local, `public/sw.js` peut rester vide si `@ducanh2912/next-pwa` (plugin **webpack**) ne s'exécute pas correctement avec Next.js 16 / Turbopack. **Vérifier sur Vercel** que le fichier déployé contient bien `addEventListener("push"` (DevTools → Application → Service Workers → `/sw.js`).

### 2.2 Listeners dans `worker/index.js`

| Listener | Présent | Rôle |
|----------|---------|------|
| `push` | ✅ | Parse payload JSON → `showNotification()` |
| `notificationclick` | ✅ | Focus / ouvre URL cible |
| `pushsubscriptionchange` | ✅ | Re-subscribe + POST `/push/subscribe` (**sans Bearer JWT**) |

### 2.3 Enregistrement du SW

| Mécanisme | Fichier | Détail |
|-----------|---------|--------|
| next-pwa auto-register | `next.config.ts` → `register: true` | Injection au build |
| Enregistrement manuel (fallback) | `lib/push-notifications.ts` → `waitForServiceWorkerRegistration()` | `navigator.serviceWorker.register("/sw.js", { scope: "/" })` |

**Scope :** `/` (racine du site).

### 2.4 Config next-pwa (`next.config.ts`)

```ts
withPWAInit({
  dest: "public",
  disable: process.env.DISABLE_PWA === "true",
  register: true,
  sw: "sw.js",
  customWorkerSrc: "worker",      // → worker/index.js
  customWorkerDest: "public",
  fallbacks: { document: "/offline" },
  workboxOptions: { ... },
});
```

### 2.5 Conflit SW

- **Un seul** `sw.js` visé (`/sw.js`).
- Le worker custom **doit être fusionné** dans le SW Workbox généré au build — pas servi seul depuis le stub vide.
- **Risque :** si le build ne génère pas le SW, le téléphone enregistre un SW **sans listener `push`** → `sent: 1` en Postman mais **aucune notif à l'écran**.

---

## 3. Étape 2 — Subscription push (frontend)

### 3.1 Où `pushManager.subscribe()` est appelé

**Fichier :** `lib/push-notifications.ts` → `ensureWebPushSubscription()`

```ts
subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(publicKey),
});
```

**Uniquement si** `getSubscription()` retourne `null`. Sinon, seul `sendPushSubscription()` est appelé (ré-enregistrement serveur).

**Déclencheurs (action utilisateur) :**

| UI | Fichier | Auth requise ? |
|----|---------|----------------|
| Bannière push | `PushNotificationsRoot.tsx` | ✅ `isAuthenticated && user` |
| Profil → Activer | `PwaPushSettingsCard.tsx` | ✅ page profil (session) |
| Auto au login | — | ❌ **n'existe pas** |

### 3.2 Permission

`Notification.requestPermission()` dans `requestNotificationPermission()` — appelé **avant** `pushManager.subscribe()` si `permission === "default"` et `requestPermission === true`.

### 3.3 Envoi au backend

```ts
// lib/push-notifications.ts
export async function sendPushSubscription(subscription) {
  await apiFetch("/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscriptionToPayload(subscription)),
  });
}
```

**Headers (`lib/apiClient.ts`) :**
- `Authorization: Bearer <accessToken>` si token en mémoire
- `credentials: "include"` (cookie refresh HttpOnly)
- Refresh proactif JWT + retry sur 401

**Pas de `expirationTime`** dans le body (retiré — provoquait une erreur de validation NestJS).

### 3.4 Resync serveur (partiel)

`syncPushSubscriptionToServer()` + auto-sync dans `PwaPushSettingsCard` **uniquement** si :
- utilisateur connecté
- abonnement **local** présent
- `GET /push/status` → `subscriptionCount === 0`

---

## 4. Étape 3 — Envoi push (NestJS)

### 4.1 web-push

- Package : `web-push` ^3.6.7
- Config : `webPush.setVapidDetails(mailto, publicKey, privateKey)` dans `onModuleInit()`
- Variables : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_MAILTO`

### 4.2 Routes push

| Route | Auth | Rôle |
|-------|------|------|
| `GET /push/vapid-public-key` | Public | Clé publique |
| `POST /push/subscribe` | JWT | Upsert subscription |
| `DELETE /push/unsubscribe` | JWT | Supprime endpoint |
| `GET /push/status` | JWT | Diagnostic `subscriptionCount` |
| `POST /push/test` | JWT | Envoi test |

### 4.3 `POST /push/subscribe`

- Guard global JWT (`GlobalAuthGuard`)
- `userId` = `@CurrentUser().id` (jamais depuis le body)
- Upsert Prisma sur `endpoint` unique :

```ts
upsert({
  where: { endpoint },
  create: { userId, endpoint, keys },
  update: { userId, keys, deletedAt: null },
});
```

### 4.4 `sendPush()` / `webPush.sendNotification()`

- Récupère les lignes `push_subscriptions` où `userId` + `deletedAt: null`
- Payload JSON : `title`, `body`, `tag`, `url`, `icon`, `data`
- Apple : headers `apns-push-type: alert`, `apns-priority: 10`
- Si **0 subscription** : log `warn`, retour `{ sent: 0, failed: 0 }` (silencieux)
- Erreurs **410/404** : suppression de la ligne en base

### 4.5 Lien notifications in-app

`notifications.service.ts` → `dispatchPushToUser()` appelle `pushNotificationService.sendPush()` en parallèle de la création de notification in-app (via `notifications-push.util.ts`).

### 4.6 Schéma Prisma

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

---

## 5. Étape 4 — Clés VAPID

| Emplacement | Variable |
|-------------|----------|
| Vercel | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| Render | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_MAILTO` |

**Règle :** clé publique Vercel = clé publique Render (identiques).

**Conversion frontend :** `urlBase64ToUint8Array()` dans `lib/push-notifications.ts` — attend 65 octets décodés.

**Fallback :** si `NEXT_PUBLIC_VAPID_PUBLIC_KEY` absent, fetch `GET /push/vapid-public-key`.

Génération :

```bash
npx web-push generate-vapid-keys
```

---

## 6. Étape 5 — Lien Auth ↔ Push

### 6.1 Les 4 questions

| # | Question | Réponse |
|---|----------|---------|
| 1 | Subscription créée **après** login ? | **Oui** en flux normal (UI protégée), mais **pas automatiquement** au login. Action manuelle requise. |
| 2 | Envoyée **avec** token auth ? | **Oui** via `apiFetch` (`Bearer` + `credentials: include` + retry 401). **Non** dans le SW `pushsubscriptionchange` (sans Bearer). |
| 3 | Recréée après refresh session ? | **Non automatiquement.** `SessionKeeper` / `refreshSession()` ne touchent pas au push. Resync partielle sur page **Profil** seulement. |
| 4 | Toujours valide en base ? | **Non garanti.** Désync local/serveur possible. Une fois en base, le refresh JWT **ne l'invalide pas**. Logout **ne supprime pas** la ligne push. |

### 6.2 Désynchronisation observée (cas réel)

| Côté | État |
|------|------|
| Navigateur | Permission OK + `pushManager.getSubscription()` → UI « Notifications activées » |
| Serveur | `subscriptionCount: 0` → `POST /push/test` → `sent: 0` |

**Cause :** `isSubscribed` dans `PushNotificationsContext` ne vérifie que le **navigateur**, pas la base :

```ts
const subscription = await reg.pushManager.getSubscription();
setIsSubscribed(Boolean(subscription));
```

**Correction appliquée (Profil) :** `fetchPushStatus()` + `syncPushSubscriptionToServer()` si désync.

### 6.3 Événement `BV_AUTH_READY_EVENT`

Émis dans `AuthContext.applyUser()` après login/bootstrap. Commentaire dans `pwa-install.ts` : « déclenche l'abonnement push » — **aucun listener push** ne l'écoute actuellement.

### 6.4 Refresh token et push

| Élément | Lié au JWT ? | Survit au refresh ? |
|---------|--------------|---------------------|
| Subscription navigateur | Non | Oui |
| Ligne `push_subscriptions` | Non (liée au `userId`) | Oui |
| Cohérence local ↔ serveur | — | **Non garantie** sans resync |

---

## 7. Tests console navigateur

Exécuter dans DevTools (PWA installée, utilisateur connecté) :

```javascript
// 1 — Service Workers enregistrés
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log('SW registrations:', regs));

// 2 — Permission
console.log('Permission:', Notification.permission);

// 3 — Subscription active
navigator.serviceWorker.ready
  .then(reg => reg.pushManager.getSubscription())
  .then(sub => console.log('Subscription:', sub ? sub.endpoint : 'AUCUNE'));

// 4 — Test local showNotification (SW OK ?)
navigator.serviceWorker.ready.then(reg => {
  reg.showNotification('Test Push', {
    body: 'Si tu vois ça, showNotification fonctionne',
    icon: '/icons/icon-192.png',
  });
});

// 5 — Vérifier que sw.js contient le listener push
fetch('/sw.js').then(r => r.text()).then(t =>
  console.log('push listener:', t.includes('addEventListener("push"'))
);
```

**Interprétation :**

| Résultat | Signification |
|----------|---------------|
| Test 4 OK, push Postman `sent:1` mais pas de notif | Problème réception push (SW listener ou iOS) |
| Test 4 KO | SW ou permission défectueux |
| Test 5 → `false` | **SW déployé sans code push** — cause probable n°1 |
| Test 3 AUCUNE | Pas d'abonnement navigateur |

---

## 8. Tests Postman (résumé)

**Base :** `https://bvback.onrender.com/api`

```
1. POST /auth/login          → accessToken + noter user.id
2. GET  /push/status         → subscriptionCount doit être ≥ 1
3. POST /push/test           → attendu sent: 1, failed: 0
4. Fermer l'app sur le téléphone → vérifier bannière système
```

**Réponses `/push/test` :**

| `data` | Signification |
|--------|---------------|
| `sent: 1, failed: 0` | Apple/Google a accepté — vérifier SW + iOS |
| `sent: 0, failed: 0, subscriptionCount: 0` | Pas d'abonnement en base pour ce userId |
| `sent: 0, failed: 1` | Clés VAPID ou subscription invalide |

Détail complet : [POSTMAN-TEST-PUSH.md](./POSTMAN-TEST-PUSH.md)

---

## 9. Checklist iPhone

1. **PWA installée** — ouvrir via icône écran d'accueil (pas Safari seul).
2. **iOS 16.4+** (idéalement 17+).
3. **Réglages → Notifications → [App]** — alertes autorisées.
4. **Réglages → Safari → Avancé → Fonctionnalités expérimentales → Notifications** — activé si présent.
5. **Profil → Activer les notifications** — puis `GET /push/status` → `subscriptionCount: 1`.
6. **Fermer complètement l'app** (swipe vers le haut) avant le test Postman.
7. Après changement de SW : supprimer PWA, réinstaller, réactiver les notifications.

Endpoint Apple attendu en base : `https://web.push.apple.com/...`

---

## 10. Tableau de diagnostic

| Composant | Statut repo | Problème détecté |
|-----------|-------------|------------------|
| `sw.js` présent dans `/public` | ⚠️ Stub vide | Code push dans `worker/index.js` — fusion au **build** requise |
| Listener `push` dans SW déployé | ⚠️ À vérifier prod | Build next-pwa peut ne pas générer le SW (Next 16) |
| Listener `notificationclick` | ✅ `worker/index.js` | — |
| SW enregistré | ✅ next-pwa + fallback | Double chemin possible |
| Conflit next-pwa / sw custom | ⚠️ | Stub `public/sw.js` vs SW Workbox généré |
| `Notification.requestPermission` | ✅ | Avant subscribe si `default` |
| `pushManager.subscribe()` | ✅ | Action manuelle uniquement |
| `applicationServerKey` | ✅ | Via `urlBase64ToUint8Array` |
| Subscription envoyée au backend | ✅ | `apiFetch` + Bearer |
| Route `POST /push/subscribe` | ✅ | JWT + `@CurrentUser` |
| Table `push_subscriptions` | ✅ | Prisma OK |
| `web-push` NestJS | ✅ | v3.6.7 |
| VAPID configuré NestJS | ✅ (si env OK) | Vérifier Render |
| `sendNotification()` appelé | ✅ | Test + notifications in-app |
| Lié à création notification | ✅ | `dispatchPushToUser` |
| Clés VAPID cohérentes front/back | ⚠️ À vérifier env | Doivent être identiques |
| Subscription liée au userId | ✅ | Upsert backend |
| `urlBase64ToUint8Array` | ✅ | Présent |
| Resync après refresh session | ❌ | Pas de resync globale |
| Auto-subscribe après login | ❌ | `BV_AUTH_READY` non branché |
| État UI = état serveur | ❌ | `isSubscribed` = local seulement |
| SW `pushsubscriptionchange` + auth | ❌ | POST sans Bearer JWT |

---

## 11. Conclusions

### D'où vient le problème ?

| Hypothèse | Verdict |
|-----------|---------|
| **1. Service Worker** | **Cause probable** si `/sw.js` déployé est vide ou sans listener `push`. Vérifier en prod (test console #5). |
| **2. Subscription manquante** | **Était le cas** (`subscriptionCount: 0`) — résolu par sync Profil. Risque de désync si activation sans JWT. |
| **3. Backend n'envoie pas** | **Peu probable** si `sent: 1` en Postman. Si `sent: 0` → pas de ligne en base ou VAPID off. |
| **4. Clés VAPID incorrectes** | Possible si `failed: 1`. Vérifier égalité Vercel/Render. |
| **5. Refresh token** | **Non** — le refresh JWT ne supprime pas la subscription. Le vrai risque auth est le **premier POST /push/subscribe manqué**, pas le renouvellement. |

### Réponses courtes (auth)

1. **Avant ou après login ?** → Après (manuel). Exception : subscription navigateur sans ligne serveur.
2. **userId sauvegardé ?** → Oui, via JWT côté NestJS.
3. **Survit au refresh session ?** → Oui en base et dans le navigateur ; cohérence local/serveur non garantie sans resync Profil.

---

## 12. Variables d'environnement

### Render (backend)

```
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_MAILTO=mailto:admin@votredomaine.com
FRONTEND_URL=https://votre-app.vercel.app
```

### Vercel (frontend)

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # = VAPID_PUBLIC_KEY Render
API_PROXY_TARGET=https://bvback.onrender.com
```

### À ne pas activer en prod

```
DISABLE_PWA=true   # désactive tout le service worker
```

---

## 13. Pistes de correction (priorités)

Sans ordre d'implémentation — diagnostic uniquement :

1. **Vérifier `/sw.js` en production** — doit contenir Workbox + code push de `worker/index.js`.
2. **Forcer webpack pour le build** si next-pwa ne génère pas le SW avec Next 16 / Turbopack.
3. **Resync push global** après login / `BV_AUTH_READY_EVENT` / refresh session réussi.
4. **Aligner `isSubscribed`** sur `GET /push/status` (local **et** serveur).
5. **Corriger `pushsubscriptionchange`** dans le SW : passer par le client (postMessage) pour POST `/push/subscribe` avec Bearer.
6. **Ne pas se fier au stub `public/sw.js`** du repo — inspecter le fichier réellement servi par Vercel.

---

*Dernière mise à jour : juin 2026 — BV Groupe RH*

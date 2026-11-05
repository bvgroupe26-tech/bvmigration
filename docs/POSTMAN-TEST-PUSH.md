# Tester les notifications push avec Postman

**Base URL production :** `https://bvback.onrender.com/api`

> Postman teste le **backend** (envoi). Pour recevoir l’alerte sur l’**écran du téléphone**, il faut d’abord un **abonnement réel** créé depuis l’app (Profil → Activer les notifications).

---

## Ordre des requêtes

```
1. GET  /push/vapid-public-key     (public, optionnel)
2. POST /auth/login              → récupérer accessToken
3. [Dans l’app] Activer les notifications sur le même compte
4. POST /push/test               → envoyer la notif test
5. Fermer l’app → vérifier l’écran d’accueil
```

---

## 1. Vérifier VAPID (public)

| Champ | Valeur |
|--------|--------|
| Method | `GET` |
| URL | `https://bvback.onrender.com/api/push/vapid-public-key` |
| Auth | Aucune |

**Réponse attendue (200) :**
```json
{
  "ok": true,
  "data": {
    "publicKey": "BEl62iUYgUivxIkv69yViEuiBIa..."
  }
}
```

Si erreur 503 → `VAPID_PUBLIC_KEY` manquante sur Render.

---

## 2. Connexion (JWT)

| Champ | Valeur |
|--------|--------|
| Method | `POST` |
| URL | `https://bvback.onrender.com/api/auth/login` |
| Headers | `Content-Type: application/json` |
| Body (raw JSON) | voir ci-dessous |

```json
{
  "email": "divinboutsindi90@gmail.com",
  "password": "VOTRE_MOT_DE_PASSE"
}
```

**Réponse attendue (200) :**
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": 1, "email": "...", "role": "..." }
  }
}
```

**Copier** `data.accessToken` (ou `data.access_token`) pour les étapes suivantes.

### Variable Postman (recommandé)

1. Onglet **Tests** de la requête Login :
```javascript
const json = pm.response.json();
const token = json?.data?.accessToken || json?.data?.access_token;
if (token) {
  pm.collectionVariables.set("accessToken", token);
}
```

2. Créer une variable de collection `accessToken`.

3. Sur les requêtes protégées : **Authorization** → Type **Bearer Token** → Token `{{accessToken}}`

---

## 3. Abonnement push (obligatoire avant le test)

Postman **ne peut pas** simuler un vrai `PushManager` du navigateur. Il faut enregistrer l’appareil depuis l’**application** :

1. Même compte que le login Postman.
2. iPhone : PWA installée → Profil → **Activer les notifications**.
3. Vérifier en base (optionnel) :
```sql
SELECT * FROM push_subscriptions WHERE "userId" = VOTRE_ID;
```

### Option : POST /push/subscribe (si vous avez copié l’endpoint depuis le navigateur)

| Champ | Valeur |
|--------|--------|
| Method | `POST` |
| URL | `https://bvback.onrender.com/api/push/subscribe` |
| Authorization | Bearer `{{accessToken}}` |
| Body | |

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/XXXX...",
  "keys": {
    "p256dh": "BASE64_CLE_P256DH",
    "auth": "BASE64_CLE_AUTH"
  }
}
```

**Ne pas inclure** `expirationTime`.

Pour obtenir `endpoint` et `keys` : sur Chrome, F12 → Console après activation :
```javascript
navigator.serviceWorker.ready.then(r =>
  r.pushManager.getSubscription().then(s =>
    console.log(JSON.stringify({
      endpoint: s.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(s.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(s.getKey('auth'))))
      }
    }, null, 2))
  )
);
```

---

## 3b. Diagnostic abonnement (recommandé avant le test)

| Champ | Valeur |
|--------|--------|
| Method | `GET` |
| URL | `https://bvback.onrender.com/api/push/status` |
| Authorization | Bearer `{{accessToken}}` |

Si `subscriptionCount` vaut **0**, `POST /push/test` renverra toujours `sent: 0` — activez les notifications dans l’app (Profil) avec le **même email** que le token Postman.

---

## 4. Envoyer une notification test

| Champ | Valeur |
|--------|--------|
| Method | `POST` |
| URL | `https://bvback.onrender.com/api/push/test` |
| Authorization | Bearer `{{accessToken}}` |
| Body | *(vide)* |

**Réponses possibles :**

| `data` | Signification |
|--------|----------------|
| `{ "sent": 1, "failed": 0, "message": "…" }` | Envoyé → alerte OS si app fermée + SW OK |
| `{ "sent": 0, "failed": 0, "subscriptionCount": 0, "message": "Aucun appareil abonné…" }` | Aucune ligne dans `push_subscriptions` pour ce `userId` |
| `{ "sent": 0, "failed": 0, "vapidConfigured": false }` | VAPID manquant sur Render |
| `{ "sent": 0, "failed": 1 }` | Abonnement invalide ou clés VAPID front ≠ Render |

**Ensuite :** fermer l’app sur le téléphone et regarder les notifications système.

---

## 5. Clé publique VAPID (contrôle)

| Champ | Valeur |
|--------|--------|
| Method | `GET` |
| URL | `https://bvback.onrender.com/api/push/vapid-public-key` |

Comparer avec `NEXT_PUBLIC_VAPID_PUBLIC_KEY` sur Vercel — **doit être identique** à `VAPID_PUBLIC_KEY` sur Render.

---

## Dépannage Postman

| Erreur | Cause |
|--------|--------|
| 401 Unauthorized | Token expiré → refaire Login |
| 503 VAPID | Variables manquantes sur Render |
| `sent: 0` | Pas de ligne dans `push_subscriptions` pour ce user |
| `failed: 1` | Mauvaise paire VAPID ou endpoint expiré |
| Postman OK mais pas d’alerte iPhone | Tester depuis l’icône PWA installée, pas Safari seul |

---

## Collection Postman (import rapide)

Créer une collection avec ces 3 requêtes :

1. `Auth - Login` → POST `/auth/login`
2. `Push - VAPID Public Key` → GET `/push/vapid-public-key`
3. `Push - Test Notification` → POST `/push/test` (Bearer)

Variable collection : `baseUrl` = `https://bvback.onrender.com/api`

URLs : `{{baseUrl}}/auth/login`, `{{baseUrl}}/push/test`

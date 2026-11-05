# BV GROUPE RH - Frontend unifié (Web + PWA)

Application Next.js unifiée pour les parcours:
- Admin / RH / Manager: `/dashboard`
- Employé: `/employee/dashboard`

La PWA est activée sur l'application racine (manifest + offline fallback).

## Connexion API (backend NestJS)

| Environnement | URL backend | Swagger |
|---------------|-------------|---------|
| **Production** | `https://bvback.onrender.com/api` | [/api/docs](https://bvback.onrender.com/api/docs) |
| **Local** | `http://127.0.0.1:3001/api` | `http://127.0.0.1:3001/api/docs` |

Le frontend appelle toujours `/api/nest/*` dans le navigateur ; Next.js proxifie vers le backend via `API_PROXY_TARGET`.

Variables dans `.env.local` (voir `.env.example`) :

```bash
API_PROXY_TARGET=https://bvback.onrender.com
NEXT_PUBLIC_API_URL=https://bvback.onrender.com/api
```

Après modification des variables, redémarrer `npm run dev`.

## Démarrage local

```bash
npm install
npm run dev
```

Application disponible sur [http://localhost:3000](http://localhost:3000).

## Scripts utiles

- `npm run dev`: serveur de développement
- `npm run build`: build production
- `npm run start`: lancement production
- `npm run lint`: lint du frontend unifié
- `npm run electron:dev`: mode desktop (Electron + Next)
- `npm run electron:build`: build desktop

## Auth et routage

- Cookie de session: `bv-token`
- Redirection post-login par rôle:
  - `employee` -> `/employee/dashboard`
  - `admin|manager|rh` -> `/dashboard`
- Protection des routes via `proxy.ts`

## PWA

- Manifest: `app/manifest.ts`
- Offline fallback: `app/offline/page.tsx`
- Config Next PWA: `next.config.ts`
- **Audit technique (offline + session)** : [docs/AUDIT-PWA-AUTH.md](docs/AUDIT-PWA-AUTH.md)

## Transition

Le plan de migration est documenté dans:
- `README-TRANSITION.md`

Les anciennes applications `apps/admin-pwa` et `apps/employee-pwa` sont conservées temporairement pour rollback, mais elles sont exclues du lint/typecheck de l'app racine.

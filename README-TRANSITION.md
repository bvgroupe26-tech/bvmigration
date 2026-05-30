# README de transition - Migration vers une app unifiee (Web + PWA)

## Objectif

Migrer l'architecture actuelle (web racine + `admin-pwa` + `employee-pwa`) vers **une seule application Next.js** avec:
- une authentification unique,
- un routage par role (`admin`, `manager`, `rh`, `employee`),
- une interface responsive (desktop/mobile),
- une capacite PWA sur la meme base de code.

## Perimetre de la migration (J+1)

- Unifier la navigation et l'authentification.
- Supprimer la duplication de pages/features entre apps.
- Garder le backend NestJS existant.
- Stabiliser le deploiement avec une seule app frontend.

---

## Architecture cible

- **Frontend unique**: `bv-groupe-rh` (app Next principale).
- **Routes metier**:
  - `/(admin)/*` pour RH/manager/admin (ou `/admin/*` selon convention choisie),
  - `/(employee)/*` pour l'espace employe.
- **Auth unique**:
  - token unique (`bv-token`),
  - middleware/proxy pour proteger les routes,
  - redirection post-login selon le role.
- **PWA unique**:
  - un seul `manifest.json`,
  - un seul service worker,
  - `start_url` coherent avec la page d'accueil connectee.

---

## Strategie de migration recommandee

### 1) Preparation (avant modifications)

- [x] Creer une branche: `chore/unification-web-pwa`.
- [x] Geler les features non critiques pendant la migration.
- [x] Lister les ecrans dupliques entre:
  - `app/*` (web actuel),
  - `apps/admin-pwa/*`,
  - `apps/employee-pwa/*`.
- [x] Definir les routes cibles finales (table de correspondance).
- [x] Definir la regle de redirection par role apres login.

### 2) Unification auth + routing (priorite 1)

- [x] Centraliser la logique de session dans l'app racine:
  - lecture/validation token,
  - garde des routes protegees,
  - redirect `/login` si non authentifie.
- [x] Implementer une redirection unique apres login:
  - `admin/manager/rh` -> `/dashboard` (ou `/admin/dashboard`),
  - `employee` -> `/employee/dashboard`.
- [x] Verifier que l'expiration token redirige toujours vers `/login`.

### 3) Migration des ecrans (priorite 2)

- [x] Migrer d'abord les ecrans critiques:
  - login,
  - dashboard admin,
  - dashboard employee,
  - pages les plus utilisees.
- [x] Deplacer les composants partages dans `components/*`.
- [x] Supprimer progressivement les ecrans dupliques dans `apps/*`.
- [x] Conserver des redirects temporaires si certains liens existent encore.

### 4) Activation PWA unique (priorite 3)

- [x] Ajouter/configurer `next-pwa` uniquement sur l'app racine.
- [x] Fusionner les besoins manifests (admin + employee) dans un manifest unique.
- [x] Definir `start_url` (ex: `/login` ou `/dashboard` selon session).
- [x] Verifier mode offline minimal (page `/offline`).

### 5) Nettoyage final

- [x] Supprimer `apps/admin-pwa` et `apps/employee-pwa` apres validation finale de prod.
- [x] Mettre a jour scripts npm, docs et CI/CD.
- [x] Mettre a jour la configuration de deploiement (un seul frontend).

---


---

## Checklist de validation (Go/No-Go)

### Auth & securite
- [ ] Login OK pour tous les roles.
- [ ] Logout supprime bien la session.
- [ ] Route protegee inaccessible sans token.
- [ ] Token expire -> redirection `/login`.

### Navigation
- [ ] Redirection post-login correcte selon role.
- [ ] Toutes les pages menu ouvrent la bonne route.
- [x] Aucun lien ne pointe encore vers `apps/admin-pwa` ou `apps/employee-pwa`.

### PWA
- [ ] Installable sur Android/iOS.
- [ ] Installation desktop possible (si souhaitee).
- [ ] `manifest.json` charge sans erreur.
- [ ] Service worker actif en production.
- [ ] Page offline fonctionnelle.

### Fonctionnel metier
- [ ] Dashboard admin OK.
- [ ] Dashboard employe OK.
- [ ] Appels API critiques OK (401/403 geres).

---

## Risques connus et mitigation

- **Risque**: regressions sur routes historiques.
  - **Mitigation**: redirects temporaires + tests E2E sur parcours critiques.
- **Risque**: divergence de comportements entre stores auth actuels.
  - **Mitigation**: garder un seul store auth dans l'app racine.
- **Risque**: conflit de cache PWA pendant bascule.
  - **Mitigation**: incrementer version cache et purger anciens workers.

---

## Rollback (si blocage)

- [ ] Revenir au commit precedent stable.
- [ ] Redeployer l'architecture precedente temporairement.
- [ ] Reouvrir la migration en sous-lots (auth d'abord, UI ensuite).

---

## Definition of Done

La migration est consideree terminee si:
- une seule app frontend est en production,
- les 2 parcours (admin et employe) fonctionnent via role,
- la PWA est operationnelle sur la meme app,
- aucun module critique ne depend encore des anciennes apps separees.

---

## Notes

- Cette transition privilegie la stabilite (auth/routing d'abord) avant l'optimisation visuelle.
- Les ameliorations UX peuvent etre planifiees juste apres la mise en prod de la base unifiee.

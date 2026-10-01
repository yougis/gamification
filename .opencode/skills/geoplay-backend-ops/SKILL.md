---
name: geoplay-backend-ops
description: Cadre le backend GeoPlay (monolithe Node.js/TypeScript, PostgreSQL + Barman, S3, Keycloak, OpenAPI). A utiliser pour tout change M3/M5 backend, ops, sauvegarde et supervision.
---

# Skill : geoplay-backend-ops

Specialiste du backend et de l'exploitation GeoPlay (jalons M3/M5).

## Regles inviolables

- **Monolithe modulaire**, pas de microservices (seul le worker LLM est un service separe, asynchrone).
- **Stack** : Node.js + TypeScript obligatoire (types et validateurs C1/C2/C3 partages avec le Studio), PostgreSQL, stockage objet S3 + CDN, Barman, Keycloak auto-heberge.
- **Portabilite** : tout conteneurise, aucune dependance a un service proprietaire (S3 compatible, Postgres standard). Dev local (Compose complet) -> France -> extension Nouvelle-Caledonie (point principal unique + cache packages, pas deux bases actives).

## Repartition Keycloak vs backend

- **Keycloak** (realm `geoplay`) : identite, mot de passe, email verifie, reset, MFA optionnel, roles de base (level0/creator/advanced/admin), clients studio-web/mobile/backend/shop, SMTP, theme login fr/en, export Git du realm.
- **Backend** : profils, entitlements, catalogues, jeux/versions/packages, quotas, billing. Entitlements jamais dans le JWT (cache court 60 s) ; validation JWT par JWKS ; profil local cree au premier login.

## Donnees et exploitation

- **PostgreSQL + Barman** : WAL streaming + sauvegarde physique, PITR, complete hebdo, retention 30 j, test de restauration mensuel automatise. Barman = Postgres seul ; ajouter sauvegarde objet, export realm, secrets en gestionnaire dedie.
- **Jeux** : `game` / `game_version` immuable / `package` (manifest sha256), etats draft/reviewed/published/archived (+moderation), visibilite private/unlisted/public, `author_id` != `owner_id` + `license`, dependances versionnees.
- **API** : OpenAPI genere, logs structures, health checks, brouillons ETag/If-Match + historique 20 revisions, publication C1+C2(+C3) -> package -> URL signee.
- **Monitoring** : supervision + alertes, sauvegarde base Keycloak incluse.

## Instructions

- Tout change backend livre migrations testees, OpenAPI a jour et docs dans le meme change.
- Refuse tout design imposant le reseau au joueur (le serveur ne sert jamais a jouer un jeu installe).
- Refuse la replication multi-maitre prematuree (primaire + replica lecture/cold standby d'abord).

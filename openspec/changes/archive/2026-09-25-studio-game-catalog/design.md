## Context

État observé : Studio SPA 100 % statique (aucun backend), export = téléchargements de fichiers locaux via `exportPackFull` (voie unique, `game.json` + manifest `{path, version, size, sha256}`), players important par QR/lien/fichier avec vérification manifest. Le Studio ne connaît que le poste client ; les players ne connaissent aucun serveur. Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Publier un pack validé sous un nom de jeu versionné, obtenir un code à 4 chiffres.
- Récupérer un pack par code (ou QR/lien équivalent) sur natif et PWA, avec la vérification existante.
- Serveur = distributeur de fichiers bête, jamais une plateforme (pas de comptes, pas de scores en ligne).

**Non-Goals:**
- Authentification, droits, confidentialité des jeux (le code n'est pas un secret).
- Resync/scoring serveur (change dédié `600-sync-scoring-master`, roadmap).
- Refonte de l'export fichier (coexiste tel quel).
- Choix de l'hébergeur (tranché à l'implémentation : opéré asso ou tiers).

## Decisions

### D1 — Service minimal : quatre routes, stockage fichiers + index

**Décision** : `POST /publish {gameId, game.json, manifest, assets[]} → {code}`, `GET /games/:code → pack courant`, `GET /games/:code/versions → historique`, `GET /games → liste [{code, nom, version courante, date}]`. Stockage : fichiers sur disque + index `{code → gameId, gameId → [versions]}`. Aucune base requise au socle (fichier JSON + FS suffisent pour des dizaines de jeux).

**Alternative écartée** : adosser le catalogue à une BDD + API générique — surdimensionné pour « code → pack », complexifie l'hébergement associatif visé.

### D2 — Code attribué côté service, collision résolue par tirage

**Décision** : à la première publication d'un nom, tirage d'un code libre sur `0000`–`9999` (re-tirage en cas d'occupation) ; republication = même code. Pas de dérivation déterministe (hash du nom) : elle interdirait la réassignation et compliquerait l'unicité.

**Alternative écartée** : code choisi par l'auteur — collisions et codes devinables « 1234 » systématiques, sans aucun gain (le code n'est pas un secret de toute façon).

### D3 — Réutilisation stricte des contrats existants

**Décision** : publication refusée si `exportPackFull` échoue ( couches 1+2 + statuts) ; player réutilisant tel quel import/verify/reprise-`sessionId`. Le QR/lien encode `{urlService, code}` et remplit l'écran d'import existant — aucune nouvelle voie d'import, juste un pré-remplissage.

**Alternative écartée** : protocole d'import dédié au catalogue — dupliquerait la vérification manifest, source de dérive avec le natif et la PWA.

### D4 — Version courante + historique adressable, pas de canal

**Décision** : `code → version courante` par défaut ; versions anciennes adressables (`code@téléchargement` interne, ex. `?v=n`). Pas de distinction natif/PWA côté service : le même pack sert les deux (cf. change `player-pwa-shell`, export sans fork).

**Alternative écartée** : un code par canal — doublerait les codes criés à l'oral pour aucun bénéfice, le pack étant identique.

### D5 — Écran Importer = browser catalogue, historique retiré de l'affichage

**Décision** : l'écran Importer affiche la liste des jeux (`GET /games`) avec recherche texte sur le nom (+ code exact) et filtrage/tri **côté Studio** ; le bouton d'import réutilise le pipeline existant. Le panneau d'historique local est retiré de l'écran, sans migration ni suppression des données stockées. L'import fichier reste accessible en voie secondaire.

**Alternative écartée** : recherche/filtre côté serveur + purge des données d'historique — requête réseau par frappe et migration de données pour aucun gain à cette échelle.

## Risks / Trade-offs

- [Épuisement des 10 000 codes] → mitigation : codes recyclables sur jeux supprimés + passage documenté à 5 chiffres si le seuil est atteint (changement assumé, pas silencieux).
- [Anti-rafale minimal] → mitigation : limitation par IP au niveau HTTP ; documenté comme anti-abus, jamais comme sécurité.
- [Service indisponible le jour J] → mitigation : export fichier existant conservé comme repli (borne USB/câble) ; le catalogue n'est jamais le seul chemin.
- [Hébergeur non tranché] → mitigation : le service est stateless hors FS (12-factor), déployable tel quel où l'association décidera ; à trancher avant l'apply.

## ADDED Requirements

### Requirement: Coquille PWA installable et offline

Le Player SHALL exister aussi comme coquille navigateur installable (PWA :
manifest, service worker, « Ajouter à l'écran d'accueil » / Web Clip MDM),
adossée au même moteur et à la même UI commune que le natif. La PWA SHALL
importer un pack par fichier, URL ou QR, vérifier le manifest SHA-256 par
fichier au premier lancement et refuser tout pack partiel ou corrompu avec
état explicite, exactement comme le natif. Un pack vérifié SHALL rejouer sans
réseau (visite en ligne initiale requise pour la mise en cache).

La persistance PWA (progression, tirages, events, inventaire) SHALL vivre en
stockage local navigateur avec écriture immédiate et même `sessionId` de
reprise. Le stockage SHALL être demandé persistant (`persist()`) et le
lancement SHALL revérifier l'intégrité du pack.

Le verrouillage kiosque OS n'existant pas côté web, la PWA SHALL proposer la
procédure Guided Access (iPad) comme repli documenté quand `holdMode !=
"none"`, sans jamais prétendre verrouiller.

#### Scenario: Installation flotte sans compte

- **GIVEN** un iPad supervisé recevant la PWA par Web Clip MDM
- **WHEN** l'animateur ouvre le jeu sans réseau après une visite en ligne
- **THEN** le pack vérifié démarre offline, sans compte Apple ni provisioning

#### Scenario: Pack PWA partiel non lançable

- **GIVEN** un pack PWA mis en cache à 90 %
- **WHEN** le joueur tente de lancer
- **THEN** le lancement est refusé avec la progression et le fichier manquant

### Requirement: Export compatible multi-player

Le même JSON de jeu SHALL s'exporter vers `NATIVE` et `PWA` sans fork (même
schéma, même manifest, même validation AJV des deux côtés). Le canal SHALL
être un attribut de distribution choisi à l'export, jamais une variante du
jeu. L'export SHALL afficher le verdict de compatibilité par canal avant
génération (voir `player-compatibility`).

#### Scenario: Même jeu, deux canaux

- **GIVEN** un jeu QUIZ/PUZZLE sans capteur exotique
- **WHEN** l'auteur exporte vers `NATIVE` puis vers `PWA`
- **THEN** les deux packs contiennent le même `game.json` et passent la même validation AJV

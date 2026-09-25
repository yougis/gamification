## Purpose

Distribuer les jeux GeoPlay depuis le Studio vers les players (natifs et PWA) via un service catalogue : publication versionnée par nom de jeu, récupération par code d'accès à 4 chiffres, vérification d'intégrité inchangée côté player.

## ADDED Requirements

### Requirement: Publication versionnée par nom de jeu

Le Studio SHALL publier un pack vers le service catalogue via une action « Publier ». Le pack publié SHALL être byte-identique à l'export fichier (`game.json` + manifest `{path, version, size, sha256}`, validé couches 1+2 avant envoi). Chaque jeu est versionné **par nom** (`gameId`) : chaque publication crée une nouvelle version qui devient la « courante », les versions précédentes restant adressables. Republier le même nom SHALL remplacer la courante sans changer le code d'accès du jeu.

#### Scenario: Première publication

- **GIVEN** un jeu valide nommé « Chasse du Vieux-Port » jamais publié
- **WHEN** l'auteur choisit « Publier »
- **THEN** le service stocke le pack comme version courante et retourne un code à 4 chiffres unique

#### Scenario: Republication garde le code

- **GIVEN** le jeu « Chasse du Vieux-Port » déjà publié sous le code `4217`
- **WHEN** l'auteur publie une version corrigée
- **THEN** la nouvelle version devient courante, le code reste `4217`, l'ancienne version reste adressable

### Requirement: Code d'accès à 4 chiffres non sécurisé

Chaque jeu publié SHALL recevoir un code unique sur `0000`–`9999`, attribué à la publication et affiché à l'auteur. Le code SHALL être un simple identifiant d'accès (résolution code → pack courant), **sans** valeur de sécurité : pas d'authentification, pas de chiffrement lié au code, pas de garantie de confidentialité. Le service SHALL appliquer une limitation d'abus de base (anti-rafale) sans promettre de résistance au brute-force.

#### Scenario: Attribution unique

- **GIVEN** deux jeux publiés nommés différemment
- **WHEN** chaque publication se termine
- **THEN** les deux codes sont distincts et affichés dans le Studio

#### Scenario: Code non sécurisé assumé

- **GIVEN** un jeu publié sous le code `4217`
- **WHEN** un tiers devine ou intercepte `4217`
- **THEN** il obtient le même pack public — aucun contournement, c'est le comportement spécifié, jamais une fuite

### Requirement: Récupération par code côté player

Le player (natif et PWA) SHALL offrir la saisie d'un code à 4 chiffres (plus scan QR / lien qui l'encodent : `{urlService, code}`). À la validation, le player SHALL télécharger le pack courant du jeu puis appliquer la vérification manifest existante (SHA-256 par fichier, refus du partiel/corrompu avec état explicite). Un pack déjà vérifié (même `sha256` par fichier) SHALL être réutilisé sans re-téléchargement. Après récupération, le jeu SHALL tourner offline, sans jamais recontacter le service.

#### Scenario: Téléchargement par code puis offline

- **GIVEN** un joueur saisissant `4217` avec réseau
- **WHEN** le pack est vérifié fichier par fichier
- **THEN** le jeu démarre, puis rejoue sans réseau (même `sessionId` de reprise)

#### Scenario: Code inconnu refusé proprement

- **GIVEN** un joueur saisissant `0000` (aucun jeu)
- **WHEN** le service répond
- **THEN** le player affiche « code inconnu », sans état partiel ni crash

#### Scenario: Pack altéré refusé malgré le service

- **GIVEN** un pack dont 1 asset a un SHA-256 faux côté service (transport non fiable)
- **WHEN** le joueur tente de lancer après téléchargement
- **THEN** le lancement est refusé avec le fichier nommé, exactement comme un fichier local corrompu

### Requirement: Liste des jeux du catalogue

Le service SHALL exposer `GET /games` retournant pour chaque jeu publié : code, nom (`gameId`), version courante et date de publication. Le Studio SHALL présenter cette liste avec une recherche texte sur le nom (plus correspondance exacte sur le code) et un filtrage/tri côté Studio, suffisants à l'échelle associative (dizaines de jeux).

#### Scenario: Recherche par nom

- **GIVEN** un catalogue de 12 jeux dont « Chasse du Vieux-Port »
- **WHEN** l'auteur tape « vieux » dans la recherche de l'écran Importer
- **THEN** seul « Chasse du Vieux-Port » (avec son code) reste listé

### Requirement: Import depuis le catalogue dans le Studio

L'écran Importer SHALL présenter le catalogue (liste, recherche, filtre) à la place du panneau d'historique local, qui n'est plus affiché. Le bouton d'import d'un jeu SHALL charger son pack courant via le pipeline d'import existant (validation couches 1+2). Les données d'historique éventuellement stockées en local SHALL être conservées sans migration. L'import fichier local SHALL rester accessible comme voie secondaire.

#### Scenario: Import depuis la liste

- **GIVEN** l'écran Importer affichant le catalogue
- **WHEN** l'auteur choisit « Chasse du Vieux-Port » et lance l'import
- **THEN** le pack courant est chargé dans l'éditeur après validation, comme un import fichier

#### Scenario: Historique absent de l'écran

- **GIVEN** un poste avec un historique d'imports stocké localement
- **WHEN** l'auteur ouvre l'écran Importer
- **THEN** aucun panneau d'historique n'est affiché, seul le catalogue (recherche, filtre) l'est

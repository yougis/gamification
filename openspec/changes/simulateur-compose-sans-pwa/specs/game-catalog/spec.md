## MODIFIED Requirements

### Requirement: Récupération par code côté player

Le player natif SHALL offrir la saisie d'un code à 4 chiffres (plus scan QR / lien qui l'encodent : `{urlService, code}`). À la validation, le player SHALL télécharger le pack courant du jeu puis appliquer la vérification manifest existante (SHA-256 par fichier, refus du partiel/corrompu avec état explicite). Un pack déjà vérifié (même `sha256` par fichier) SHALL être réutilisé sans re-téléchargement. Après récupération, le jeu SHALL tourner offline, sans jamais recontacter le service.

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

## ADDED Requirements

### Requirement: Auto-chargement par game URL

La PWA SHALL accepter `?game=<url>` : au démarrage, elle charge automatiquement le pack depuis cette URL via le pipeline d'import URL existant (`game.json` + `manifest.json` + `compat.json` depuis la même base, même vérification SHA-256). Un pack invalide SHALL suivre le refus existant avec motifs.

#### Scenario: Émulation Studio
- **WHEN** la PWA démarre avec `?game=http://localhost:5173/emulate/game.json`
- **THEN** le jeu courant du Studio démarre sans passer par l'écran d'import

### Requirement: Triche pré-ouverte par cheat flag

La PWA SHALL accepter `?cheat=1` : le panneau triche animateur (bypass, position simulée, tirages forcés) démarre ouvert, chaque event portant le flag existant. Sans le flag, comportement inchangé (panneau fermé).

#### Scenario: Émulation en triche
- **WHEN** la PWA démarre avec `?cheat=1`
- **THEN** le panneau triche est ouvert et chaque event simulé porte le flag triche

### Requirement: Namespace de session émulée

La PWA SHALL accepter `?session=<id>` (ou équivalent) isolant stockage et reprise : deux namespaces SHALL ne jamais se lire ni s'écrire mutuellement.

#### Scenario: Isolation
- **WHEN** deux émulations tournent avec des sessions distinctes
- **THEN** progressions et tirages restent séparés

## MODIFIED Requirements

### Requirement: Exécution graphe et modules

Le Player SHALL exécuter la sémantique des specs (`viewer-orchestrator`, états,
`latch`, pools persistés) et rendre les 5 modules socle avec leurs
fallbacks (2D, sans-capteur, dilatation tactile). Un type inconnu SHALL dégrader
le nœud avec message, jamais crasher le Jeu.

#### Scenario: Partie 5 POI de bout en bout

- **GIVEN** le pack `reference-5poi` importé
- **WHEN** le joueur joue le tirage puis la branche jusqu'à FIN
- **THEN** chaque état suit la machine `LOCKED→UNLOCKED→COMPLETED`

## ADDED Requirements

### Requirement: Export compatible natif unique

Le même JSON de jeu SHALL s'exporter vers le player natif sans fork (même
schéma, même manifest, même validation AJV). Il n'existe plus qu'un seul canal de distribution, jamais une variante du
jeu. L'export SHALL afficher le verdict de compatibilité natif avant
génération (voir `player-compatibility`).

#### Scenario: Jeu exporte vers le natif

- **GIVEN** un jeu QUIZ/PUZZLE sans capteur exotique
- **WHEN** l'auteur exporte vers `NATIVE`
- **THEN** le pack contient le `game.json` et passe la validation AJV

## REMOVED Requirements

### Requirement: Export compatible multi-player
**Reason**: Plus de canal PWA ; un seul canal natif (voir Requirement Export compatible natif unique).
**Migration**: L'export ne propose plus de choix de canal.

### Requirement: Coquille PWA installable et offline
**Reason**: Le web n'est plus un canal joueur ; le simulateur auteur ne joue pas de vraie partie et n'a besoin ni d'installation ni d'offline.
**Migration**: Jouer passe exclusivement par les builds natifs Android/iOS ; previsualiser passe par le simulateur Compose web (`compose-web-simulator`).

### Requirement: Build PWA reproductible
**Reason**: Plus de coquille web a construire.
**Migration**: Aucune ; la toolchain wasm restante sert le simulateur Studio, pas un livrable.

### Requirement: PWA publiée sur URL publique stable
**Reason**: Plus de `dist/` web a deployer.
**Migration**: Aucune ; aucune URL publique de player web n'est maintenue.

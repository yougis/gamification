## ADDED Requirements

### Requirement: Pack .zip transférable unique

Le Studio SHALL proposer « Pack complet (.zip) » : une archive unique contenant `game.json`, `manifest.json`, `tiles.json` et tous les assets et tuiles listés au manifest (octets identiques aux fichiers du pack). La taille totale SHALL être affichée avant génération avec confirmation au-delà du seuil existant, et l'assemblage SHALL se faire en streaming (jamais tout en RAM).

#### Scenario: Export puis import offline
- **GIVEN** un jeu valide avec images et 240 tuiles
- **WHEN** l'auteur exporte le `.zip`, le transfère (fichier) et l'importe sur le téléphone sans réseau
- **THEN** le jeu tourne offline avec images et fond de carte, manifest vérifié fichier par fichier

### Requirement: Mise à jour différentielle par manifests

À l'import d'un pack dont le `gameId` est déjà installé (zip, URL, catalogue), le player SHALL comparer le manifest installé au nouveau manifest par `{path, sha256}` : fichiers nouveaux ou modifiés = seuls copiés/téléchargés, fichiers absents du nouveau = supprimés, fichiers identiques = conservés sans re-vérification au-delà du SHA connu. L'ensemble SHALL être vérifié puis basculé atomiquement (l'ancien pack reste jouable jusqu'au succès). La progression SQLite SHALL être préservée (même `gameId`).

#### Scenario: Seule l'image modifiée voyage
- **GIVEN** un pack installé et un nouveau pack ne différant que par `assets/chateau.jpg`
- **WHEN** la mise à jour est appliquée
- **THEN** seul ce fichier est copié, les tuiles et le reste sont conservés, la partie en cours reprend à l'identique

#### Scenario: Échec sans casse
- **GIVEN** une mise à jour interrompue (fichier manquant)
- **WHEN** la vérification échoue
- **THEN** l'ancien pack reste installé et jouable, avec le fichier fautif nommé

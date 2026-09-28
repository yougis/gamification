## ADDED Requirements

### Requirement: Téléchargement du JSON brut malgré le blocage

Quand l'export du pack est bloqué (erreurs C1/C2 ou statuts), l'écran Exporter SHALL exposer à côté du bouton bloqué un bouton toujours actif « Télécharger le JSON brut (non valide, debug) ». Le bouton SHALL télécharger le jeu courant tel quel en `game.json` (sans manifest, sans SHA-256, sans assets, sans `compat.json`), avec un nom de fichier marqué non valide, et SHALL rappeler les causes du blocage. Le téléchargement SHALL ne modifier aucun état (ni JSON, ni historique undo, ni rapport d'export).

#### Scenario: Jeu invalide inspectable

- **GIVEN** un jeu bloqué par 2 erreurs C1 affiché dans l'écran Exporter
- **WHEN** l'auteur active « Télécharger le JSON brut »
- **THEN** le `game.json` courant est téléchargé avec les 2 causes rappelées, le pack reste bloqué, aucun état n'a changé

### Requirement: Pack jamais confondu avec le brut

Le bouton de génération du pack SHALL rester désactivé tant que la règle centrale `canExport` l'exige ; le JSON brut SHALL ne jamais être produit avec un manifest, un SHA ni des assets. Un JSON brut réimporté SHALL suivre le pipeline d'import existant (validation couches 1+2).

#### Scenario: Brut réimporté revalidé

- **GIVEN** un `game.json` brut téléchargé avec 2 erreurs C1
- **WHEN** l'auteur le réimporte après correction manuelle
- **THEN** l'import suit la validation bi-couche comme tout fichier local

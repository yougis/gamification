## Purpose

Donner aux packs GeoPlay un index spatial normalisé de leurs tuiles (univers, bornes, zooms, stratégie), qui fait foi pour le chargement intelligent et le calcul des différences, là où le manifest ne porte que l'intégrité fichier par fichier.

## ADDED Requirements

### Requirement: Fichier tiles.json normalisé

Chaque pack contenant des tuiles SHALL inclure `tiles.json` à la racine : objet compatible TileJSON avec `bounds` (bbox WGS84), `minzoom`/`maxzoom`, `strategie` (`fixed`/`viewport`/`radius`/`none` + paramètres), et `tuiles: [{z, x, y}]` (une entrée par tuile du pack). `tiles.json` SHALL être listé au `manifest.json` comme tout fichier (SHA-256 vérifié). Tout pack exporté SHALL contenir `tiles.json`, avec une liste vide quand il n'y a pas de tuile.

#### Scenario: Pack outdoor avec tuiles
- **GIVEN** un export avec 240 tuiles en `radius` 300 m, zooms 12–16
- **WHEN** le pack est généré
- **THEN** `tiles.json` liste 240 entrées `{z,x,y}` dans la bbox et les zooms, et son SHA figure au manifest

#### Scenario: Pack sans tuile
- **GIVEN** un jeu indoor (`tileStrategy: "none"`)
- **WHEN** le pack est généré
- **THEN** `tiles.json` existe avec une liste vide et passe la vérification

### Requirement: Index comme source de l'univers des tuiles

Le chargement intelligent (viewport, radius) et le calcul des ajouts/retraits SHALL lire l'univers des tuiles depuis `tiles.json`, jamais en énumérant des fichiers PNG. Deux index SHALL se comparer entrée par entrée (`z/x/y`) : présentes des deux côtés = conservées, nouvelles = à charger, absentes du nouveau = à retirer.

#### Scenario: Ajout et retrait ciblés
- **GIVEN** un pack installé (200 tuiles) et un nouveau pack (210 tuiles : 190 communes, 20 nouvelles, 10 retirées)
- **WHEN** la mise à jour est calculée
- **THEN** 20 tuiles sont marquées à charger et 10 à retirer, les 190 communes ne sont ni retéléchargées ni revérifiées au-delà du SHA déjà connu

### Requirement: Cohérence manifest contre index

À l'export comme à l'import, chaque entrée `{z,x,y}` de `tiles.json` SHALL correspondre à un fichier du manifest (chemin conventionnel `tuiles/<z>/<x>/<y>.png`) et réciproquement tout fichier `tuiles/*` du manifest SHALL figurer à l'index. Tout écart SHALL bloquer avec le fichier fautif nommé.

#### Scenario: Tuile orpheline refusée
- **GIVEN** un pack avec `tuiles/12/3/4.png` au manifest mais absent de `tiles.json`
- **WHEN** l'export ou l'import est vérifié
- **THEN** le pack est refusé avec le fichier nommé

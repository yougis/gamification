## Purpose

Suppression de `global.preset` du schema, des types TypeScript et du modèle Kotlin. Le champ `preset` est un doublon de `navigationModel` et n'est jamais lu par le moteur.

## MODIFIED Requirements

### Requirement: Configuration du modèle de navigation

**FROM:** Le jeu SHALL définir `global.navigationModel` et `global.presentation` dans son JSON. Le jeu PEUT également définir `global.preset` pour référencer le préfixe de référence sélectionné.

**TO:** Le jeu SHALL définir `global.navigationModel` et `global.presentation` dans son JSON. Le préfixe de référence fonctionnel est désormais sélectionné via `global.experienceStyle.preset`. Le champ `global.preset` est **supprimé**.

- `global.navigationModel` : le modèle de navigation (`"BASIC"`, `"GUIDED"`, `"TREASURE_HUNT"`, `"ESCAPE_GAME"`, `"OPEN_EXPLORATION"`)
- `global.presentation` : tableau des modes de présentation (`["MAP"]`, `["STORY"]`, `["CLUE", "MAP"]`, etc.)
- **REMOVED:** `global.preset` — supprimé car redondant avec `navigationModel`. Le préfixe est désormais dans `experienceStyle.preset`.

Si `global.navigationModel` est absent, la valeur par défaut SHALL être `"BASIC"`.

**Reason:** `preset` est un doublon de `navigationModel` avec les mêmes valeurs d'enum, jamais lu par le moteur.

**Migration:** Remplacer toute référence à `global.preset` par `global.experienceStyle.preset`. Les anciens jeux avec `global.preset` devront être mis à jour.

#### Scenario: Jeu BASIC sans configuration navigation
- **GIVEN** un jeu sans `global.navigationModel` ni `global.preset`
- **WHEN** le moteur charge le jeu
- **THEN** le modèle par défaut `"BASIC"` est appliqué

#### Scenario: Jeu ESCAPE_GAME avec configuration (post-migration)
- **GIVEN** un jeu avec `global.navigationModel: "ESCAPE_GAME"`, `global.presentation: ["TOOLBOX", "CLUE"]`, et `global.experienceStyle.preset: "ESCAPE_GAME"`
- **WHEN** le moteur charge le jeu
- **THEN** le player affiche la boîte à outils et les indices avec le style ESCAPE_GAME

#### Scenario: Jeu avec ancien preset (migration)
- **GIVEN** un jeu avec `global.preset: "ESCAPE_GAME"` (ancien format)
- **WHEN** le validateur controle le jeu
- **THEN** le jeu est rejeté avec erreur : `global.preset` est obsolète, utilisez `global.experienceStyle.preset`

### Requirement: Préfixes de référence fonctionnels

**FROM:** Les préfixes de référence sont configurés par `global.preset`.

**TO:** Les préfixes de référence sont configurés par `global.experienceStyle.preset`. Le tableau de préfixes reste identique mais est maintenant lu depuis `experienceStyle.preset`.

| Dimension | BASIC | GUIDED | TREASURE_HUNT | ESCAPE_GAME | OPEN_EXPLORATION |
|-----------|-------|--------|---------------|-------------|------------------|
| Progression | GRAPH | SEQUENTIAL | CLUE | GRAPH | GRAPH |
| Discovery | MAP | NEXT | CLUE | CONDITIONAL | MAP |
| Activation | GEOFENCE | AUTO | GEOFENCE | ITEM_REQUIRED | GEOFENCE |
| Inventory | OFF | OFF | ITEM_REQUIRED | ON | OFF |
| Effects | NONE | NONE | REVEAL | GIVE_ITEM/REVEAL | NONE |
| Presentation | MAP | STORY | CLUE+MAP | CLUE+TOOLBOX | MAP |

**Reason:** La table des préfixes reste valide, seule la source de configuration change de `preset` à `experienceStyle.preset`.

#### Scenario: Auteur sélectionne ESCAPE_GAME puis modifie la progression
- **GIVEN** un auteur sélectionne le preset ESCAPE_GAME via `experienceStyle.preset`
- **WHEN** il modifie la dimension progression de GRAPH à SEQUENTIAL
- **THEN** le jeu utilise la progression SEQUENTIAL avec les mécanismes ESCAPE_GAME pour les autres dimensions

#### Scenario: Auteur modifie une dimension du preset BASIC
- **GIVEN** le preset BASIC avec Inventory=OFF
- **WHEN** l'auteur ajoute un objet dans le preset
- **THEN** le preset BASIC devient un jeu hybride BASIC + inventaire

## Why

Entre deux étapes, le joueur GeoPlay n'a aujourd'hui qu'une liste d'états (GameGraphScreen) : ni temps écoulé, ni visibilité sur les déblocages temporisés à venir, ni point d'entrée unique vers l'inventaire et l'étape à ouvrir. Sur un jeu comme Sherlock Holmes, c'est un trou d'orientation : le joueur ne sait ni où il en est dans le temps, ni quand la suite se débloque. Il faut un écran d'accueil joueur — un tableau de bord — affiché par défaut entre les étapes.

## What Changes

- **Mode de présentation `HOME`** : nouvelle valeur de `global.presentation` (enum C1 étendu). Quand présente, le player affiche un tableau de bord par défaut entre les étapes, combinable avec les autres présentations (ex. `["HOME", "MAP", "TOOLBOX"]`).
- **Contenu du tableau de bord** : temps écoulé de la session ; compte à rebours vers les prochains déblocages temporisés, affiché à côté de chaque POI concerné (calculé depuis les conditions `TIMER` existantes, jamais de nouvelle donnée) ; entrée vers la boîte à outils (règle d'affichage inchangée) ; états des POI (fait / à faire, réutilisant les états moteur) ; proposition d'ouverture de l'étape éligible en tête de file (même file FIFO, aucune transition ajoutée).
- **Limites d'épreuve exclues** : les `timeLimitSeconds`/`maxAttempts` des mini-jeux restent affichés et gérés dans les écrans d'étapes par les modules eux-mêmes, jamais dans le tableau de bord.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `game-navigation`: mode de présentation `HOME` (tableau de bord entre les étapes).
- `game-schema`: valeur `HOME` ajoutée à l'enum `global.presentation`.
- `viewer-orchestrator`: règle de rendu du tableau de bord (temps écoulé, comptes à rebours par POI, entrée inventaire, proposition d'ouverture).

## Impact

- **Code** : moteur partagé (calculs purs : temps restant par POI), UI partagée + natif Android (tableau de bord, même règle des deux côtés) ; schéma graphe : une valeur d'enum ajoutée (rétrocompatible : absent = comportement actuel).
- **Carte** : volontairement hors périmètre — le tableau de bord liste les POI avec états et comptes à rebours ; le fond cartographique reste un suivi (MapLibre différé).
- **Réseau** : aucun (tout est calculé localement, offline-first inchangé).
- **Validation** : C1 accepte `HOME`, C2 inchangée (aucune règle sur les valeurs de présentation).

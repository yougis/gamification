## Context

Voir `proposal.md`. Existant : `InventoryState` + effets GIVE/REMOVE, règle `ITEM_USED`/`consumable`, `SessionEvent` + bus du change 4, écran Inventaire du change 1, limite transitive documentée au socle (AND-exclusif direct).

## Goals / Non-Goals

**Goals:**
- Une seule primitive (recette déclarative), moteur atomique, validation symétrique à l'existant.
- Ordre d'implémentation : après changes 1 (édition) et 4 (`ITEM_COMBINED`).

**Non-Goals:**
- Chaînes de craft multi-étapes automatiques (chaque combinaison = une action joueur confirmée).
- Quantités > 1 par entrée (le `stackable`/quantité existe côté état ; les recettes consomment 1 unité — documenté, extensible plus tard).

## Decisions

- **Recettes au niveau jeu** (`recipes[]`), pas sur les objets : une combinaison met en relation N objets, la rattacher à l'un d'eux disperserait la lecture et compliquerait la validation des cycles. Alternative écartée : `combinesWith` par objet — éclaté, doublons.
- **Application = effets existants** : retrait = REMOVE_ITEM, production = GIVE_ITEM, le tout en une transaction d'état (tout ou rien). Aucune nouvelle primitive moteur.
- **Proposition côté toolbox** : la boîte à outils liste les recettes dont les entrées sont réunies (sélection d'objets = filtre, pas de devinette) ; confirmation explicite avant application.
- **`consume` indépendant de `consumable` en lecture, contraint en validation** : la donnée dit ce qui est consommé, le schéma objet dit ce qui est consommable, la C2 réconcilie (symétrie `ITEM_USED`).

## Risks / Trade-offs

- [Farming via cycles transitifs] → limite documentée volontaire (même doctrine que le socle) ; le cas direct est rejeté.
- [Recettes sans UI d'édition] → contrat de données d'abord, édition dans l'écran Inventaire en suivi (JSON expert + C2 entre-temps).
- [Conflit avec ITEM_USED sur même objet] → les deux mécanismes coexistent (usage simple vs combinaison) ; la validation ne les oppose pas.

## Migration Plan

Aucune (`recipes` absent = pas de craft). Rollback = ignorer `recipes`.

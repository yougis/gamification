## Context

Voir `proposal.md`. État observé : `Inspecteur`, famille `FAMILLES[7]` (« 8 · Inventaire »), édite `inventoryRef` via `upd()` → `editGame(..., "modifierNoeud")` (un pas d'undo) ; cases à cocher existantes au même format (latch, rejouable, score) ; le flag `node.inventoryAccess` est déjà lu par la règle triple du player.

## Goals / Non-Goals

**Goals:**
- Le flag devient visible et éditable sans JSON, au même endroit que le reste de l'inventaire par nœud.
- Zéro nouvelle opération MCP, zéro nouveau composant.

**Non-Goals:**
- Aperçu de l'icône dans le canvas (le canvas auteur ne rend pas la chrome joueur).
- Modification de la règle d'affichage (change `player-inventory-toolbox`).

## Decisions

- **Case dans la famille 8, pas dans la famille épreuve** : le flag concerne l'inventaire, pas le mini-jeu ; il voisine `inventoryRef` et le rappel pédagogique y a son contexte. Alternative écartée : famille épreuve — surcharge un panneau déjà dense et mélange les concerns.
- **Réutilisation stricte** : même composant case, même `upd()`, même op `modifierNoeud` — aucun code structurel nouveau, juste un champ contrôlé `checked={node.inventoryAccess !== false}`.
- **Rappel non bloquant calculé** : `(game.objects ?? []).length === 0 || !(game.global?.presentation ?? []).includes("TOOLBOX")` — mêmes sources que la règle runtime, sans dupliquer la règle (l'affichage joueur reste l'autorité).

## Risks / Trade-offs

- [Auteur surpris que la case « ne fasse rien » sans inventaire] → le rappel l'explique ; Valider reste la porte du diagnostic.
- [Jeux existants] → absent = coché : aucun changement visible ni JSON modifié à l'ouverture.

## Migration Plan

Aucune (champ optionnel, UI ajoutée). Rollback = retirer la case.

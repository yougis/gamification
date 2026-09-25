## Context

Voir `proposal.md`. Existant : présentation `TOOLBOX` (rendu boîte à outils), `InventoryState` moteur persisté en SQLite, résolution d'écran global → nœud (même pattern d'héritage/surcharge que les styles).

## Goals / Non-Goals

**Goals:**
- Accès inventaire omniprésent sans casser la file ACTIVE ni la persistance.
- Granularité nœud uniquement (pas de niveau zone/widget).

**Non-Goals:**
- Contenu de la toolbox (change 1 : icon/image), événements (change 4), craft (change 5).

## Decisions

- **Overlay, pas navigation** : ouvrir l'inventaire n'est pas un changement d'écran (pas de transition `LOCKED→…`, pas d'event de progression) — seule la présentation change. Alternative écartée : écran à part — casserait la modale unique et la reprise.
- **Condition d'affichage triple** : objets non vides ET `TOOLBOX` en présentation ET `node.inventoryAccess !== false`. Le Nœud ne peut que masquer, jamais forcer (pas d'icône sans inventaire réel).
- **Même règle natif/PWA** : flag lu du JSON des deux côtés, aucun code spécifique au canal.

## Risks / Trade-offs

- [Icône masquant un indice] → position configurable par `experienceStyle.components.toolbox`, jamais codée en dur.
- [Jeux existants] → absent = `true` : aucun changement visible sauf si le jeu a déjà objets + TOOLBOX (alors l'icône apparaît — effet voulu et documenté).

## Migration Plan

Aucune (champ optionnel). Rollback = ignorer le flag.

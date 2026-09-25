## Context

Voir `proposal.md`. Existant : `SessionEvent(type, timestamp, sessionId)` journalisés en SQLite (`hold_journal` et events de jeu), `InventoryState` + effets GIVE/REMOVE, renderers par module (éditeur + joueur), validation C1 (sous-schémas par `$ref`) + C2 (références).

## Goals / Non-Goals

**Goals:**
- Zéro couplage direct inventaire ↔ mini-jeu : le journal est le seul médium.
- Même règle pour les 6+ modules, natif comme PWA.

**Non-Goals:**
- Effets déclenchés par événements (restent dans `effects`/`activation`).
- Formulaire auteur dédié (JSON expert + erreurs de validation suffisent ici ; suivi possible).
- Combinaisons (change 5, qui émettra `ITEM_COMBINED` via ce bus).

## Decisions

- **Le journal EST le bus** : pas de nouveau service ni de callbacks ; l'émission = une écriture SQLite de plus dans le flux existant, l'écoute = filtre sur type (+ `itemId`) au rendu. Alternative écartée : bus mémoire pub/sub — perdu au kill, divergent entre plateformes.
- **Déclaration dans `module.data`** (`inventoryHints`), pas au registre : l'abonnement dépend du Nœud (tel quiz réagit à la loupe, tel autre non), pas du type. Le registre ne porte que la capacité générique.
- **Affichage passif** : l'indice est une zone du renderer, jamais une modale ; il ne vole pas le focus et survit aux rotations d'écran comme le reste du Nœud.
- **Validation en deux temps** : C1 = forme (`event` dans l'enum, `hint` non vide) via définition partagée référencée par les sous-schémas ; C2 = `itemId` existants dans `objects[]`.

## Risks / Trade-offs

- [Spam d'indices] → un seul emplacement, dernier événement gagne ; l'auteur dose ses abonnements.
- [Vocabulaire figé] → tout nouveau type d'événement = nouveau change (volontaire : la stabilité du vocabulaire est la garantie de simplicité).
- [Events hors Nœud ACTIVE] → ignorés pour l'affichage (mais toujours journalisés pour la relecture).

## Migration Plan

Aucune (tout est optionnel). Rollback = ignorer `inventoryHints`.

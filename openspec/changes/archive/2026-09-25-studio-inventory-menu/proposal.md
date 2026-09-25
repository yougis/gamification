## Why

La gestion de l'inventaire vit aujourd'hui dans une carte de l'écran Configuration : création limitée (id + nom + consommable, sans description ni visuel ni ordre), pas d'image, pas de duplication, pas de « donner pour tester ». L'inventaire est pourtant un concern de même rang que le graphe pour les jeux escape/chasse — il mérite un écran dédié et un CRUD complet.

## What Changes

- Nouvel écran Studio « Inventaire » dans la barre de navigation (8e entrée) ; la carte « Objets / inventaire » sort de Configuration.
- CRUD enrichi par objet : `name`, `description`, `consumable`, `stackable` éditables après création, `icon` + `image` via parcours/dépôt (circuit manifest SHA-256 existant), duplication, ordre d'affichage joueur, suppression avec confirmation listant les nœuds impactés (conservée).
- Nouveau champ objet `image` (string optionnel, asset du pack) : l'`icon` reste le pictogramme de la boîte à outils, l'`image` est l'illustration grande (fiche objet).
- **BREAKING (dev uniquement, assumé)** : aucune migration d'interface — l'écran Config perd sa carte inventaire.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring` : organisation en écrans (8e écran Inventaire) + nouvel écran dédié avec CRUD enrichi.
- `game-inventory` : objet du jeu (champ `image`, props éditables).

## Impact

- Studio uniquement : navigation (`ECRANS`), déplacement du panneau objets, ImagePicker réutilisé, opérations MCP `addObject`/`setObjects` conservées (+ `duplicateObject`).
- Schéma graphe : ajout du champ optionnel `image` sur GameObject (`game-schema.json`, `types.ts`) — rétrocompatible (optionnel, validateur et runtime ignorent l'inconnu... non : `additionalProperties: false` impose la déclaration, d'où la mise à jour du schéma dans ce change).
- Ne touche pas aux valeurs réservées CONDITIONAL/WINDOW, n'ajoute aucun module au registre.
- Aucune connexion réseau (assets locaux + manifest).
- Aucune dépendance à un change précédent non archivé.

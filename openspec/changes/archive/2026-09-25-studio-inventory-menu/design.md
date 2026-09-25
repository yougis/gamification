## Context

Voir `proposal.md`. État observé : panneau « Objets / inventaire » dans l'écran Configuration (`App.tsx`, opérations `addObject`/`setObjects`, calcul `refsObjet`), création id+nom+consommable uniquement ; `GameObject` = `{id, name, icon?, description?, consumable?, stackable?}` ; assets via ImagePicker + manifest ; catalogue (`catalog.ts` : `listGames`/`fetchPack`/`publishGame`) déjà planifié par ailleurs.

## Goals / Non-Goals

**Goals:**
- Écran Inventaire de même rang que les autres (nav, repli, pastille inchangés).
- CRUD sans impasse : tout champ reprisable, visuels via circuit manifest existant.
- Schéma `image` rétrocompatible (optionnel).

**Non-Goals:**
- Import catalogue (change 2), toolbox joueur (change 3), événements/indices (change 4), craft (change 5).
- Aucun changement moteur/validation au-delà du champ `image` déclaré.

## Decisions

- **Déplacement, pas duplication** : la carte Config disparaît ; le panneau migre en écran. Alternative écartée : garder les deux — source de divergence.
- **`icon` vs `image`** : pictogramme (liste, toolbox 36px) vs illustration (fiche objet). Deux champs plutôt qu'un avec variantes : le pack embarque déjà des SVG aux deux usages, et le manifest ne distingue pas les rôles.
- **Opérations nommées** : `addObject`/`setObjects` conservées, ajout `duplicateObject` (même opé que création, nouvel id proposé `id-copie`) ; ordre = ordre du tableau `objects` (réordonnancement = `setObjects` réordonné, une entrée undo).
- **Validation** : `additionalProperties: false` impose de déclarer `image` dans `game-schema.json` + `types.ts` dans ce change, sinon C1 rejette les jeux qui l'utilisent.

## Risks / Trade-offs

- [8e écran vs spec « 7 sanctuarisés »] → déclaré comme impact : pastille, stepper et rails suivent la même règle, aucun traitement spécial.
- [Icônes d'autres jeux] → hors scope ici ; l'import catalogue (change 2) ré-enregistrera les assets avec provenance.
- [Jeux sans objet] → écran vide incitatif, comme la liste des étapes vide ; l'inventaire reste optionnel côté moteur.

## Migration Plan

Aucune migration de données (`objects[]` inchangé en forme). Rollback = restaurer la carte Config, retirer l'entrée nav.

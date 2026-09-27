## Why

L'écran global (`global.screen`, template par défaut des étapes et fond du tableau de bord HOME) ne s'édite aujourd'hui que par gabarit + fond dans l'écran Configuration : pas de canvas, pas de zones, pas de widgets — alors que les écrans d'étapes disposent du WYSIWYG complet. L'auteur ne peut ni mettre en forme l'accueil (héritage des styles globaux du jeu), ni y voir les accès transverses du joueur (carte, inventaire, messages d'info) tels qu'ils apparaîtront. Il faut le même rendu éditable que les étapes, dans la même UX.

## What Changes

- **Canvas WYSIWYG sur `global.screen`** : quand l'entrée « écran global — Accueil » est sélectionnée (pseudo-sélection du change `studio-home-apercu-simu`), le panneau central affiche `PhoneCanvas` lié à `global.screen` avec les mêmes opérations que les étapes (zones, widgets, drag inter-zones, édition en place, undo via les opérations nommées existantes + `setGlobalScreen`).
- **Héritage des styles globaux du jeu** : le canvas résout `global.screen.styles` (police, taille, graisse, couleur, alignement) comme base, exactement comme les étapes en héritent ; témoins d'héritage (badges Global/Écran/Widget) identiques.
- **Blocs d'accès en aperçu** : le rendu montre, en lecture seule, les accès transverses dérivés des présentations actives — carte (si `MAP`), boîte à outils (si `TOOLBOX` + objets, règle existante), messages d'info — positionnés comme le player les affichera, sans écriture possible.
- **UX cohérente** : mêmes composants (`PhoneCanvas`, `ZoneRenderer`, panneau propriétés contextuel, `BarreViewports`), mêmes gestes, mêmes libellés ; seule la source diffère (global vs nœud), signalée par un bandeau « écran global ».

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring`: édition WYSIWYG de l'écran global avec héritage des styles et blocs d'accès en aperçu.

## Impact

- **Code** : Studio uniquement (panneau central, panneau propriétés, opérations `setGlobalScreen` existantes + ajouts widgets calqués sur les nœuds). Schéma graphe inchangé (`global.screen` existe déjà) ; JSON joueur inchangé (même champ, mieux rempli).
- **Hors périmètre** : nouveaux types de widgets (les accès restent des aperçus dérivés, pas des widgets éditables) ; personnalisation visuelle du tableau au-delà de l'écran global ; rendu player.

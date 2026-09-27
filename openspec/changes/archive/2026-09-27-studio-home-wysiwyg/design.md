## Context

État observé : `global.screen` (schéma + `resolveScreen` + `ScreenGlobalPanel` gabarit/fond) existe mais sans canvas ; `PhoneCanvas` + `ZoneRenderer` + panneau propriétés sont pilotés par l'écran d'un nœud (`etape.screen`) ; `PresentationPanel` expose les 7 présentations ; `toolboxIconVisible` donne la règle inventaire. Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Un seul canvas, deux sources (nœud/global), zéro divergence UX.
- Blocs d'accès dérivés, jamais éditables, charte commune.

**Non-Goals:**
- Nouveaux widgets éditables ; rendu player ; refonte du panneau propriétés.

## Decisions

### D1 — Paramétrer la source, pas dupliquer le canvas

**Décision** : `PhoneCanvas` et la chaîne (`ZoneRenderer`, propriétés, viewport, DnD) reçoivent une source abstraite « écran édité » (aujourd'hui : `etape.screen` + écriture nœud ; global : `global.screen` + `setGlobalScreen`). Un discriminant d'affichage (bandeau) distingue les deux. Mêmes opérations widget calquées sur les nœuds (mêmes ops quand elles existent, `setGlobalScreen` sinon).

**Alternative écartée** : canvas global séparé — divergence garantie à la première évolution.

### D2 — Styles : la base change, la mécanique non

**Décision** : sur l'écran global, le niveau « Global » des témoins = `global.screen.styles` lui-même (base du jeu), « Écran » = surcharges de ce même objet ? Non : pour éviter la confusion, la barre d'outils affiche la base jeu comme valeur héritée et écrit les surcharges dans `global.screen.styles`. Concrètement : même composant, prop `baseStyles` = styles du jeu.

**Alternative écartée** : deux barres d'outils — même divergence que D1.

### D3 — Blocs d'accès : aperçu dérivé positionné comme le player

**Décision** : trois blocs lecture seule (carte / boîte à outils / infos), affichés selon `presentation` + configuration (mêmes prédicats que le player : `MAP` configurée, règle toolbox), placés dans le flux du canvas comme le player les empile. Clic = infobulle de rappel, jamais de sélection.

## Risks / Trade-offs

- [Paramétrage vs régression nœuds] → la source nœud reste le défaut ; tests existants du canvas inchangés + nouveaux cas globaux.
- [Blocs vs widgets] → visuellement proches mais non sélectionnables : badge « aperçu » systématique pour lever l'ambiguïté.

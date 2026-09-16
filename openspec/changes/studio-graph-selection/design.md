# Design — studio-graph-selection

## Context

Voir `proposal.md` (Why) et `specs/studio-authoring/spec.md` (exigences). État actuel dans `studio/src/App.tsx` :
- `onNodesChange` traite tous les types de changements ReactFlow (`select`, `position`, `dimensions`…) de la même façon et appelle `setPositions` avec un objet toujours neuf.
- `onSelectionChange` appelle `setSelMulti` avec un tableau toujours neuf, même si la sélection est identique.
- Deux vérités de sélection coexistent : `sel` (pilote `nodes[].selected` et le panneau détail) et `selMulti` (pilote Aligner H/V), sans réconciliation.
- `fitView={nbEtapes > 0}` recadre tant qu'il y a des étapes, donc potentiellement à chaque recalcul de `nodes`.
- Trois branches `ecran === "composer"` (desktop `lg:flex`, mobile `lg:hidden` par onglet) + graphe repliable ; seuils incohérents (`etroite` < 900 px JS vs `lg:` 1024 px Tailwind).
- Nœuds reconstruits de zéro à chaque recalcul (`useMemo` sur `game.nodes` + `positions`) : les champs internes ReactFlow (`measured`, `dragging`) sont jetés → cause probable du warning 015 et des saccades au drag.
- Styles custom accumulés : fonds/rails/ombres par statut sur les nœuds, 3 styles d'arêtes + pilules JSX + marqueurs, surcharges `.studio-flow`. Décision : retour à la base ReactFlow.
- React 19 + `StrictMode` (dev) + `@xyflow/react` 12.11.6.

## Goals / Non-Goals

- Goals : couper la boucle sélection → positions → nodes → sélection ; rendre le zoom manuel souverain ; distinguer vide réel et canvas non monté ; drag sans warning 015 ni saccade ; boîtes uniformes et liens verticaux ; canvas au rendu par défaut.
- Non-Goals : aucun changement de la palette/typographie hors canvas (change `studio-tailwind-ux` terminé), aucune API MCP, aucun schéma, aucun runtime.

## Decisions

### D1 — Filtrer `onNodesChange` par type de changement
Ne traiter que `position` (et `dimensions` si pertinent) pour `setPositions` ; ignorer les changements `select`/`remove` dans ce handler (la sélection passe par `onSelectionChange`, la suppression par son propre chemin).
- Alternative écartée : garder un seul handler universel — c'est précisément ce qui transforme chaque clic en écriture de positions.

### D2 — Gardes d'égalité avant chaque setter du pipeline
Comparer le contenu avant `setPositions` (coordonnées identiques → pas de setter) et avant `setSelMulti` (mêmes ids dans le même ordre → pas de setter). La boucle meurt faute de carburant : sans nouvel objet/tableau, pas de re-render, pas de nouveau `nodes`, pas de ré-émission.
- Alternative écartée : `useMemo`/`memo` seul — il ne protège pas des setters appelés avec des références neuves.

### D3 — Handlers stables + vérité de sélection unique
Mémoriser `onNodesChange`/`onSelectionChange` (`useCallback`) et refléter l'union `sel ∪ selMulti` dans `nodes[].selected`, pour que ReactFlow ne détecte plus d'écart entre sa sélection interne et la prop `nodes` (écart = ré-émission).
- Alternative écartée : supprimer `selMulti` — il sert l'alignement multi-nœuds, le fusionner casserait cette fonction.

### D4 — Cadrage à la demande
`fitView` uniquement au montage, à la transition 0→N nœuds, et via le bouton `Recentrer` existant ; retirer le `fitView` permanent lié à `nbEtapes > 0`.
- Alternative écartée : garder le fit permanent + debounce — le debounce masque le conflit au lieu de le supprimer, et le zoom reste imprévisible.

### D5 — Diagnostic vide vs non monté (sans changer le layout d'abord)
Avant toute retouche de layout : instrumenter le constat (compte `NodeList`, compte Panel, visibilité MiniMap, `repliees.graphe`, `onglet`, largeur viewport) pour classer chaque « vide » en données / non-monté / viewport-zéro. N'aligner les seuils 900/1024 que si le diagnostic l'exige.
- Alternative écartée : refonte du layout responsive maintenant — prématurée tant que la cause n'est pas classée.

### D6 — Reset style vers la base ReactFlow (option (a) retenue)
Supprimer : objet `style` inline des nœuds (fonds, rails `borderLeft`, ombres, outlines — la sélection utilise le style `.selected` par défaut), pilules de labels JSX des arêtes (remplacées par le libellé texte simple via la prop standard `label`), marqueurs/couleurs/pointillés/`labelStyle`/`labelBgStyle` custom des arêtes, surcharges `.studio-flow` sur `.react-flow__node` et `.react-flow__edge-text`. Conservés : chrome Studio (contrôles, minimap, fond, attribution masquée) et thème sombre hors canvas.
- Alternative écartée : (b) base + accents fonctionnels — l'auteur a tranché pour (a) pure, quitte à mettre la spec à jour (fait dans le delta spec).

### D7 — Dimensions uniformes et liens verticaux
Largeur fixe sur les nœuds (`style.width`, ex. 180) + libellés concis (identifiant, sans concaténation de statuts) ; `sourcePosition: Bottom` / `targetPosition: Top` sur les nœuds, cohérent avec la grille top-down de repli.
- Alternative écartée : custom node component — contrôle total mais contre l'esprit « base », et inutile pour ce besoin.

### D8 — Drag initialisé et fluide (warning 015)
Préserver `measured`/`dragging` en fusionnant les objets nœuds précédents (via ref) au lieu de reconstruire de zéro ; en complément, n'autoriser le drag que sur nœuds initialisés si le cas H2 (grab avant mesure) se confirme ; mémoïser les panneaux lourds (`NodeList`, détail, validation) pour que chaque frame de drag ne re-rende plus tout `App`.
- Alternative écartée : migrer vers `useNodesState` possédé par ReactFlow avec positions re-synchronisées — refonte plus large, disproportionnée tant que D8 suffit.

## Risks / Trade-offs

- [Risk] XYFlow 12.11 émet des changements `select` via `onNodesChange` même après filtrage partiel → Mitigation : vérifier à l'exécution les types reçus (log temporaire en dev) et étendre le filtre.
- [Risk] `fitView` prop de cette version recadre aussi au montage uniquement, pas aux updates — le conflit zoom serait alors ailleurs (ex. `setCenter` de la recherche pendant un geste) → Mitigation : le diagnostic D5 + test manuel zoom → sélection → zoom tranche.
- [Risk] `StrictMode` double-invoque et fait paraître la boucle pire qu'en production → Mitigation : valider le fix en dev (StrictMode) ET en build preview ; le fix (gardes d'égalité) vaut dans les deux cas.
- [Risk] Régression alignement multi-nœuds si `selMulti` mal réconcilié → Mitigation : scénario manuel Shift+clic 2 nœuds → Aligner H/V dans les tâches.
- [Risk] Sans flèches, le sens des arêtes ne se lit plus que par la disposition top-down + le libellé → Mitigation : assumé par le choix (a) ; si la relecture s'en plaint, réintroduire les seuls marqueurs (prop standard) sans rouvrir tout le style.
- [Risk] Statut `draft` moins découvrable sans badge canvas → Mitigation : NodeList, écran Relire et blocage d'export inchangés (3 surfaces restantes).
- [Trade-off] Gardes d'égalité = comparaisons à chaque événement — coût négligeable (quelques dizaines de nœuds max dans un jeu auteur).

## Migration Plan

Aucune migration : Studio web uniquement, pas de données persistées impactées (les positions restent le même `Record<id, {x, y}>`). Déploiement = build Studio habituel. Rollback = revert du change. Vérification : `tsc --noEmit` + `vite build` + scénarios manuels du delta spec.

## Open Questions

- Q1 : Unifier `etroite` (900 px) et `lg:` (1024 px) ? Réponse attendue du diagnostic D5 ; ne change ni specs ni tâches (seuil = détail d'implémentation).
- Q2 (résolue) : Libellés d'arêtes en texte simple via la prop `label` standard — tranché par D6, pas de custom edge.

## Why

Le canvas du Composer (Studio) est inutilisable : graphe vide malgré des étapes définies, `Maximum update depth exceeded` via `onSelectionChange`, et zoom qui se bat contre un recadrage permanent. Sans canvas fiable, l'auteur ne peut ni composer ni relire un jeu.

S'y ajoutent, constatés ensuite : boîtes aux dimensions irrégulières, liens aux ancrages illisibles, warning ReactFlow 015 au drag (« node not initialized » avec saccades), et un style custom accumulé illisible. Décision : repartir sur la configuration de base ReactFlow, quitte à retirer la distinction visuelle `draft` et les styles d'arêtes custom du canvas (les statuts restent visibles dans la liste, Relire et le blocage d'export).

## What Changes

- **Stabiliser le pipeline de sélection ReactFlow** : filtrer `onNodesChange` aux seuls changements de position/dimensions (ignorer les changements `select`), garde anti-doublon avant `setPositions` et `setSelMulti` (comparer le contenu, pas seulement setter), handlers mémorisés, source de sélection unique (`sel` + `selMulti`) reflétée dans `nodes[].selected`.
- **Cadrage à la demande** : `fitView` seulement au montage / transition 0→N nœuds / action explicite `Recentrer`, au lieu du `fitView` permanent actuel qui recadre à chaque recalcul de `nodes` et entre en conflit avec le zoom manuel.
- **Diagnostic « graphe vide »** : distinguer le vrai vide de données (`game.nodes` vide, témoin `NodeList`) du faux vide de montage (graphe replié, onglet mobile autre que `graphe`, conteneur non mesuré) ; aligner ou documenter les seuils `etroite` (< 900 px JS) vs `lg:` (1024 px Tailwind).
- **Drag initialisé et fluide** : préserver les champs internes ReactFlow (`measured`, `dragging`) lors de la reconstruction des nœuds dérivés (cause probable du warning 015) ; mémoïser les panneaux lourds qui n'en dépendent pas (`NodeList`, détail, validation) pour ne plus re-rendre tout `App` à chaque frame de drag.
- **Dimensions uniformes et liens lisibles** : largeur fixe des boîtes + libellés concis ; ancrages imposés (`sourcePosition` bas / `targetPosition` haut) cohérents avec la grille top-down.
- **Reset style vers la base ReactFlow** : suppression des styles inline par statut (fonds, rails couleur par type, ombres, outline), des pilules de labels JSX, des marqueurs/couleurs/pointillés d'arêtes custom et des surcharges `.studio-flow` sur nœuds et textes d'arêtes. Les arêtes gardent un libellé texte simple (nom de condition, prop standard). Le chrome Studio (contrôles, minimap, fond, panneaux) garde le thème sombre.
- **Non-objectifs** : aucune refonte hors canvas, aucun changement du schéma graphe (Noeuds/activation/registre), rien côté runtime natif.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring` : précision de l'exigence « Canvas graphe détaillé » — sélection (simple et multiple) stable sans boucle de re-rendu, zoom/pan standard non contrarié par un recadrage automatique, canvas monté avec taille mesurable ; ET retour au rendu par défaut : boîtes uniformes, liens bas→haut, libellés texte simples, plus aucune distinction visuelle `draft` ni style d'arête custom sur le canvas (delta spec à suivre).

## Impact

- **Code** : `studio/src/App.tsx` (`zoneGraphe`, `noeuds`/`aretes`, `onNodesChange`, `onSelectionChange`, `fitView`, libellés), `studio/src/components/NodeList.tsx` (témoin indépendant, inchangé sauf si besoin), `studio/src/styles/theme.css` (règles `.studio-flow` sur nœuds et textes d'arêtes à retirer ; chrome contrôles/minimap/fond conservé).
- **Dépendances** : `@xyflow/react` 12.11.6 + React 19 + `StrictMode` (le mode dev amplifie la boucle, ne la crée pas).
- **Schéma graphe** : aucune modification — aucun consommateur impacté (Studio MCP, runtime natif, orchestrateur, modules du registre, packaging offline).
- **Valeurs réservées** : `CONDITIONAL`/`WINDOW` non touchés, aucun module ajouté au registre.
- **Réseau** : aucun — le Composer reste 100 % local (offline-first inchangé).
- **Dépendance** : aucune dépendance à un change non archivé (`studio-tailwind-ux` est terminé ; `create-ios-player` est indépendant).

## Why

L'écran principal du Studio est rigide : le menu de gauche a une largeur fixe, les panneaux (graphe, liste, détail, essai) ne sont ni redimensionnables ni repliables, et le graphe ReactFlow dysfonctionne (rendu/positionnement). Configurer un jeu demande de jongler entre des zones trop petites sans logique de drill-down : il faut rendre l'espace de travail adaptable et guider l'auteur étape par étape.

## What Changes

- **Nouveau** : menu de gauche rétractable (replié/déplié, état persisté en `localStorage`)
- **Nouveau** : panneaux redimensionnables par poignées de séparation (largeur sur desktop, hauteur quand empilés), tailles persistées en `localStorage`
- **Nouveau** : navigation en drill-down — chaque étape du `WorkflowStepper` et chaque nœud sélectionné ouvrent la section correspondante ; boutons « molette » (engrenage) sur chaque carte de section pour régler/plier la section
- **Correction** : reprise de l'affichage du graphe/carte (conteneur à hauteur garantie, `fitView`, nœuds repositionnés proprement, MiniMap/Controls utilisables)
- **Nouveau** : boutons plier/déplier par section (palette, graphe, liste, détail, essai) avec état replié mémorisé
- **Conservé** : aucune modification du JSON produit, du schéma Draft-07, de la validation ni du workflow auteur existant (undo/redo, import, export)

## Capabilities

### New Capabilities
- Aucune (rework présentationnel pur — `skip_specs: true`)

### Modified Capabilities
- Aucune (aucun comportement spec-level ne change : `studio-authoring` reste valide tel quel)

## Impact

- **Studio UI uniquement** (`studio/src/App.tsx`, `studio/src/components/`, `studio/src/styles/theme.css`)
- Aucun impact sur : schéma JSON, validateur, MCP, runtime natif, packaging offline, specs existantes
- Risque principal : régression visuelle sur petit écran (onglets) — couvert par les scénarios de test manuel des tâches

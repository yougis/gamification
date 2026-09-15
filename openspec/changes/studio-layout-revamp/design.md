# Design — Refonte des écrans du Studio

## Context

Voir `proposal.md` pour la motivation. État actuel (`studio/src/App.tsx`, ~1367 lignes) : layout desktop en 3 colonnes flex aux largeurs figées (`w-60`/`flex-[3]`/`flex-[2]`, `maxWidth` en dur), aucune persistance, `WorkflowStepper` purement indicatif (`onAller` change juste l'étape), et `zoneGraphe` (ReactFlow) dont le rendu est cassé — hypothèses : chaîne flex parente qui s'effondre à hauteur 0, `minHeight: 320` insuffisant, positions de nœuds par défaut superposées. Contrainte : offline-first, pas de dépendance nouvelle si possible (React + Tailwind déjà là).

## Goals / Non-Goals

- Goals : espace de travail adaptable et persisté ; drill-down workflow → section ; graphe lisible et manipulable.
- Non-Goals : aucun changement du JSON, du schéma, de la validation, du MCP, du runtime ; le modèle d'onglets petit écran est conservé tel quel (non-régression uniquement).

## Decisions

### 1. Splitters custom plutôt que `resize` CSS
Poignées de séparation (`div` 6px, curseur `col-resize`/`row-resize`) avec drag au pointeur (`setPointerCapture`), largeurs en px stockées en `localStorage` (`geoplay-layout-v1`), bornées (min 200px, max 60% du conteneur). Alternative `resize: horizontal` écartée : rendu incohérent entre navigateurs, pas de hook de persistance, poignée minuscule au tactile.

### 2. Menu gauche repliable en rail d'icônes
État `menuReplie` persisté ; replié = rail 56px avec les mêmes boutons en icon-only + `title`/`aria-label` (convention existante du projet : jamais d'icône sans libellé accessible). Alternative « menu overlay » écartée : masque le graphe, casse le flux auteur.

### 3. Drill-down en deux sens
- Workflow → section : `onAller(etape)` fait défiler (`scrollIntoView`) et surligne (anneau `var(--focus)` 1,5s) la section correspondante (table de correspondance étape → id de section).
- Section → réglage : bouton « molette » (`Icon name="engrenage"`, déjà utilisé) par carte de section ouvrant un mini-panneau : plier/déplier, réinitialiser la taille, (graphe uniquement) recentrer (`fitView`).
- Sélection d'un nœud dans le graphe/liste → ouvre la section détail et la surligne.

### 4. Reprise du graphe (diagnostic à confirmer à l'implémentation)
Hypothèses par probabilité : (a) hauteur effective 0 malgré `minHeight` (chaîne `min-h-0` parente), (b) positions par défaut superposées rendant le graphe illisible, (c) `fitView` non déclenché après chargement. Correctifs : conteneur à hauteur garantie (`flex-1` + `min-h-[320px]` vérifié au runtime), `fitView` + `fitViewOptions` après chaque chargement/import, jitter initial des positions, `proOptions={{ hideAttribution: true }}` si pertinent. Le `MiniMap`/`Controls` restent tels quels une fois le conteneur sain.

### 5. État de layout centralisé
Un seul objet `layout` (`{ menuReplie, largeurs: {palette, liste, detail}, repliees: {...} }`) persisté sous une clé unique, plutôt que N clés éparses — un seul point de migration si la structure change.

## Risks / Trade-offs

- [Risque] Drag des splitters en conflit avec le drag des nœuds ReactFlow → Mitigation : poignées hors canvas uniquement, `touch-action: none` sur la poignée.
- [Risque] Largeurs persistées invalides après changement d'écran → Mitigation : clamp au chargement + bouton « réinitialiser la mise en page ».
- [Risque] Le correctif graphe masque un bug plus profond (ex. boucle de rendu) → Mitigation : la tâche de diagnostic impose de reproduire avant/après avec `game-5poi.json` + `game-sherlock-holmes.json`.
- [Trade-off] Pas de bibliothèque de docking (ex. react-resizable-panels) : moins de code tiers à auditer offline, mais splitters maison à tester au tactile.

## Migration Plan

Aucune migration de données : `localStorage` versionné (`geoplay-layout-v1`), défauts sains si absent/corrompu. Rollback = revert du commit UI, aucun impact sur les jeux produits.

## Open Questions

- Faut-il aussi rendre la hauteur du pied (rapport d'erreurs) ajustable, ou un max fixe suffit-il ? (Réponse par défaut : max fixe + scroll, réévaluer à l'usage.)

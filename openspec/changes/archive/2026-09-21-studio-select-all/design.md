## Context

État observé dans `studio/src/App.tsx` (voir `proposal.md` pour la motivation) : deux états coexistent — `sel: string | null` (sélection primaire, panneau détail, écrit par `choisirNoeud`) et `selMulti: string[]` (écrit par `onSelectionChange` ReactFlow, sert l'alignement H/V). `onNodeClick` appelle `choisirNoeud` qui ne vide jamais `selMulti` : un clic simple laisse l'ancienne sélection multiple intacte. `NodeList` ne reçoit que `sel` + `onChoisir` : sélection simple uniquement, sans Maj+clic, sans bouton groupé. Aucun `onPaneClick`, aucune action tout sélectionner/désélectionner.

## Goals / Non-Goals

**Goals:**
- Une seule sélection visible, identique dans le graphe et la liste.
- Sémantique clic-remplace / Maj-ajoute-retire partout, plus action groupée explicite.

**Non-Goals:**
- Refactor du modèle d'état vers un tableau unique (trop invasif : `sel` pilote le drill-down, le détail et l'aperçu écran ; `selMulti` pilote l'alignement).
- Sélection rubber-band modifiée (comportement ReactFlow natif conservé).
- Persistance de la sélection (elle reste transitoire, hors `localStorage` et hors JSON).

## Decisions

### D1 — Garder `sel` + `selMulti`, définir l'union comme sélection visible

**Décision** : la sélection visible = `{sel} ∪ selMulti`. `sel` reste le primaire (détail, drill-down) ; `selMulti` reste l'additive (ReactFlow natif + alignement). Aucun refactor d'état.

**Alternative écartée** : unifier en un seul `string[]` + index primaire — casserait les consommateurs de `sel` (`MapView`, `NodeList`, `FileRelire`, aperçu écran) pour aucun gain observable.

### D2 — Clic simple remplace, Maj+clic bascule

**Décision** : `onNodeClick` (sans Maj) = `choisirNoeud(id)` + vide `selMulti` ; avec Maj = bascule l'id dans `selMulti` et promeut l'id en `sel` (détail suit le dernier touché). Même règle dans `NodeList` (handler de ligne étendu à l'événement Maj, la ligne étant désormais une `div role="option"` focusable). Clic pane vide = vide les deux.

**Alternative écartée** : laisser ReactFlow gérer le clic simple via `onSelectionChange` seul — perdrait le drill-down et le reset d'écran pilotés par `choisirNoeud`.

### D3 — Action groupée unique, deux points d'entrée

**Décision** : une seule fonction `toutSelectionner()` (tous les ids de `game.nodes` dans `selMulti`, `sel` = dernier id pour le détail) / `toutDeselectionner()` (`sel=null`, `selMulti=[]`), exposée à la fois dans la barre du graphe et l'en-tête de la liste avec libellé réactif. Respecte les gardes d'égalité anti-boucle de `studio-graph-selection`.

**Alternative écartée** : deux actions séparées par vue — divergerait à nouveau les sélections, exactement le bug visé.

### D4 — Liste reflète l'union, pas seulement `sel`

**Décision** : `NodeList` reçoit aussi `selMulti` et marque choisie toute ligne de l'union ; le `aria-activedescendant` suit `sel`. Pas de `scrollIntoView` forcé côté liste (le drill-down du détail couvre déjà la navigation).

**Alternative écartée** : faire défiler la liste vers chaque sélection graphe — agressif à chaque Shift+clic, source de yoyo visuel.

## Risks / Trade-offs

- [Conflit d'archive avec `studio-graph-selection`] → le bloc MODIFIED de ce change est un sur-ensemble volontaire du sien : archiver `studio-graph-selection` d'abord, celui-ci ensuite. Ordre inverse = écrasement des scénarios D1–D8, à refaire.
- [`onSelectionChange` natif vs clic simple] → ReactFlow émet aussi pour un clic simple ; mitigation : `onNodeClick` fait foi pour le clic (remplace), `onSelectionChange` ne fait qu'ajouter via gardes (pas de remplacement), comme aujourd'hui.
- [Maj+clic clavier seul] → la ligne liste est focusable (`tabIndex`, `Enter`/`Espace` existants) ; mitigation : documenter que l'ajout au clavier passe par Maj+Entrée dans les tâches, sans nouveau widget.
- [Coût négligeable] → unions sur quelques dizaines d'ids max, comme les gardes existantes.

## Context

État observé : `NodeList` porte les 4 boutons d'ajout (`onAjouter`) ; `PresentationPanel` (Configuration) bascule déjà `HOME` via `setPresentation` avec undo ; l'écran Prévisualiser porte l'état d'essai (`done`, `draws`, `sim.dtMin`, `file`, `activeId`) et les helpers `timerRemainingMs`/`toolboxIconVisible`/`showHomeDashboard` existent en TS. Voir `proposal.md` pour la motivation.

## Goals / Non-Goals

**Goals:**
- Toggle + entrée visibles là où l'on compose, aperçu vivant là où l'on essaie.
- Zéro écriture depuis l'aperçu ; zéro impact graphe/validation/export.

**Non-Goals:**
- Personnalisation visuelle du tableau ; rendu player ; édition depuis l'aperçu.

## Decisions

### D1 — Toggle = même opération que les cases

**Décision** : le bouton appelle le même code que `basculer("HOME")` de `PresentationPanel` (extrait si besoin en helper partagé) : `setPresentation`, undo natif, même infobulle d'aide. Deux vues, une seule écriture.

**Alternative écartée** : état local d'affichage découplé du JSON — divergerait de Configuration, source de confusion.

### D2 — Pseudo-sélection exclusive, jamais un nœud

**Décision** : état `selAccueil: boolean` (ou `selGlobal`) séparé de `sel`/`selMulti` ; clic entrée → `selAccueil=true` + `sel=null`, clic nœud → inverse. Le panneau détail affiche un rappel + raccourci Configuration. Exclusion garantie par construction (aucun objet nœud créé) + test « aucun id accueil dans `nodes[]` ».

### D3 — Deux aperçus, deux fidélités assumées

**Décision** : mini-aperçu statique t=0 dans le volet (carte d'identité, pas cher, toujours juste) ; aperçu simu complet dans Prévisualiser (branché sur l'état d'essai, `evaluate` relancé aux mêmes ticks que l'essai). Pas de troisième état.

## Risks / Trade-offs

- [Désynchro mini-aperçu/essai] → assumée et documentée : le volet dit t=0, l'essai dit l'instant simu ; libellés distincts (« aperçu » vs « essai en cours »).
- [Toggle vs cases Configuration] → même opération, pas de double source ; testé une fois pour les deux vues.

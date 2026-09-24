## Why

Les tests terrain du Studio remontent un lot mixte : des contrôles morts ou trompeurs (familles de l'Inspecteur figées, pile Valider vide, prévisualisation qui n'avance pas), un point de rupture confirmé (`activeFamille` hors deps du memo `detail`, pile Valider qui lit des champs objet sur des `string[]`, `terminer` qui ne rouvre rien), et des points d'entrée dispersés (toolbar flottante, pastille, Undo/Redo texte, boutons AJOUTER en 4 exemplaires). Un seul lot corrige l'ensemble sans toucher au graphe ni au schéma.

## What Changes

- **Graphe** : Recentrer / Aligner H / Aligner V quittent la toolbar flottante pour les contrôles natifs ReactFlow (`Controls` + `ControlButton`, `showFitView` natif pour Recentrer), règle Aligner (< 2 sélectionnés = désactivé + tooltip) et restriction vue `graphe` inchangées ; le chevron de repli reste seul en overlay.
- **Entête applicative** : la pastille validation y déménage (à côté nom du jeu / compteurs nœuds-draft-reviewed existants) ; le champ nom du jeu s'élargit dynamiquement selon son contenu ; Undo/Redo texte deviennent les icônes `annuler`/`retablir` du set (tooltips conservés).
- **AJOUTER** : les 4 actions (Étape/Lieu/Tirage/Fin) vivent à un seul endroit panneau ouvert : en haut de la box des étapes (`NodeList`) ; les rangées dupliquées des mémos App sont supprimées, les icônes nav repliée et rail replié sont conservées (accès états repliés, cf. spec existante).
- **Familles du détail** : ajout d'`activeFamille` aux deps du memo `detail` (cause racine du figement après remontée 2.3) ; tabs clic + flèches à nouveau opérationnels, sans autre changement.
- **Valider** : la pile d'erreurs rend le texte explicite (chaînes `erreurFR`, règle corrompue nommée), chaque carte navigue vers le nœud fautif (Composer + surlignage, comme `listeErreurs`) ; badges C1/C2 Pass/Fail et compte C1 calculés au lieu d'être codés en dur.
- **Prévisualisation jeux** : `terminer` (triche ou validation jouée) rouvre automatiquement le Nœud ACTIVE suivant éligible au lieu de retomber sur l'attente ; chemin `onComplete` vérifié par type de module socle, fallback sinon.

## Capabilities

### New Capabilities

_(aucune — corrections et réagencements de comportements existants)_

### Modified Capabilities

- `studio-authoring`: composition de l'entête applicative (pastille, compteurs, nom auto-largeur, undo/redo icônes) ; contrôles natifs ReactFlow pour Recentrer/Aligner ; point d'entrée AJOUTER unique panneau ouvert dans la box des étapes (rails conservés) ; pile Valider textuelle et navigable ; avance auto en prévisualisation jeux.

## Impact

- **Code** : `studio/src/App.tsx` (toolbar, entête, Valider, `terminer`, memo `detail`), `studio/src/components/NodeList.tsx` (header AJOUTER), `studio/src/components/wysiwyg/PlayerTerminal.tsx` (seulement si le chemin `onComplete` l'exige) ; imports `Controls`/`ControlButton` (déjà en dépendance v12), icônes existantes uniquement.
- **Vérification** : familles cliquables, pile Valider lisible + navigable, avance auto rejouable, `tsc --noEmit` au baseline, smokes dev/runtime/pack/screen verts, revue visuelle toolbar/entête/rails.
- **Aucun impact** : schéma Draft-07, graphe/orchestrateur, runtime player, packaging offline, opérations MCP (mêmes ops, mêmes validations).

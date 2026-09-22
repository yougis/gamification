## Why

Le Studio sait faire jouer le *graphe* (simulateur `Apercu` : file FIFO,
triche, pas-à-pas) et sait afficher les *écrans* (`PhoneCanvas` côté
éditeur), mais les deux ne se rencontrent jamais : l'auteur ne voit pas ce
que verra le joueur sur un terminal mobile. Le jeu habillé Sherlock (change
`sherlock-screens-images`) rend ce manque criant — 8 écrans composés,
invisibles en situation de jeu. Un mode « Jeux » plein écran, branché sur le
moteur de simulation existant, ferme cette boucle auteur → joueur simulé
sans attendre le Player natif.

## What Changes

- Nouveau mode « Jeux » plein écran dans l'écran Prévisualiser du Studio :
  rendu du terminal joueur simulé (viewport téléphone, chrome mobile),
  piloté par le même état de simulation que le simulateur existant
  (file FIFO, nœud ACTIVE, tirages, HOLD simulé, `sessionId`).
- L'écran affiché est celui du nœud ACTIVE, résolu global → nœud
  (`resolveScreen`) et rendu via `PhoneCanvas` en lecture seule
  (sélection/édition désactivées, zones fantômes masquées) ; le widget
  `module` utilise le renderer joueur du module quand il existe
  (QUIZ, PUZZLE déjà disponibles), sinon un état non bloquant avec sortie
  par triche.
- Validation jouée : répondre/valider dans le renderer joueur fait
  progresser la simulation (COMPLETED + effets + log SIMULÉ) exactement
  comme « Terminer » du simulateur ; chaque event porte le flag triche.
- Changement d'écran piloté par le moteur : l'écran affiché suit le nœud
  ACTIVE (file FIFO, 1 modale max) ; aucun sélecteur libre d'écrans.
- Rappel permanent « simulation — n'écrit jamais dans le JSON source » et
  badge SIMULÉ conservés ; sortie du mode (Échap ou bouton) vers la vue
  auteur sans perte d'état de simulation.

## Capabilities

### New Capabilities

- Aucune.

### Modified Capabilities

- `studio-authoring`: l'exigence « Prévisualisation traçée » gagne un mode
  joueur plein écran — rendu de l'écran du nœud ACTIVE, validation jouée
  via les renderers joueurs, changements d'écran pilotés par le moteur,
  traçabilité triche inchangée.

## Impact

- Code : `studio/src/App.tsx` (écran Prévisualiser, nouveau mode),
  réutilisation de `PhoneCanvas`, `resolveScreen`, `getPreview`/renderers
  joueurs, état de simulation existant ; ajout probable d'un registre
  `getPlayer` minimal + états non bloquants pour modules sans renderer.
- Schéma graphe : non modifié → aucun consommateur impacté (Studio MCP,
  runtime natif, orchestrateur, modules, packaging offline).
- Registre : aucun module ajouté ; CONDITIONAL/WINDOW non touchés.
- Réseau : aucun — simulation 100 % locale, offline-first préservé.
- Dépendances : s'appuie sur `sherlock-screens-images` (statut complete,
  non archivé) comme jeu de démonstration ; aucune dépendance bloquante.
  Divergence assumée avec `player-kmp-migration` (en cours) : le mode web
  est une simulation auteur, pas un Player ; les renderers joueurs web ne
  préjugent pas des rendus natifs.

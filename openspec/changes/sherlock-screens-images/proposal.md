## Why

Le jeu de démonstration `game-sherlock-holmes.json` (9 nœuds, ESCAPE_GAME) ne
déclare aucun `screen` : ni `global.screen`, ni `node.screen`. Il s'affiche
donc partout avec l'écran par défaut (fond uni, content-only) et ne démontre
ni le système WYSIWYG (templates, widgets, styles, images), ni le packaging
d'assets images. Pour prouver que la chaîne auteur → validation → export →
jeu offline fonctionne de bout en bout sur un vrai contenu, le jeu doit être
habillé : écrans par nœud, widgets texte/image, assets embarqués, tout en
restant valide (C1+C2), exportable et jouable.

## What Changes

- Ajout d'un `global.screen` au jeu Sherlock (template de base aux couleurs
  du branding `#8B0000` / `#DAA520`, police Georgia, styles globaux).
- Ajout d'un `screen` à chaque nœud joueur (start, baker, scotland, strand,
  stbarts, holmes, moriarty, fin), construit depuis les templates embarqués
  (`basic-story`, `quiz-focus`, `map-fullscreen`, `clue-focus`,
  `inventory-view`) puis personnalisé (titres, textes d'ambiance, widgets).
- Ajout de widgets `image` référençant les assets existants
  (`baker-street.jpg`, `scotland-yard.svg`, `holmes.marker.svg`,
  `holmes-fallback.svg`, icônes d'objets) et de nouveaux assets à créer pour
  les nœuds sans visuel (baker, strand, stbarts, moriarty source+dérivée,
  fin) ; chaque asset est enregistré au manifest du pack (chemin + SHA-256).
- Le nœud structurel `pool` (RANDOM_POOL, jamais ACTIVE) ne reçoit pas de
  screen joueur et reste sur l'écran par défaut.
- Aucune modification du graphe (activation, effets, inventaire, pools),
  du schéma Draft-07, du registre de modules ou du runtime : le jeu reste
  valide couches 1+2, exportable en pack offline et jouable à l'identique
  sur le plan fonctionnel.

## Capabilities

### New Capabilities

- `sherlock-holmes`: contrat d'habillage du jeu de démonstration Sherlock
  Holmes — écrans par nœud issus des templates, widgets texte/image,
  assets images embarqués au manifest, jeu valide C1+C2, exportable et
  jouable. Spec de contenu : elle fige les critères d'acceptation du
  livrable sans étendre ni modifier le framework générique.

### Modified Capabilities

- Aucune. Ni `game-schema`, ni `studio-screen-builder`, ni
  `module-screen-plugins`, ni le registre ne changent : le change consomme
  les specs existantes (templates, ScreenDefinition, widgets, styles,
  `minigameDefaults`) sans les modifier.

## Impact

- Fichiers : `studio/src/game/game-sherlock-holmes.json` (screens),
  `studio/src/game/assets/` (nouvelles images), `studio/src/game/manifest.json`
  (enregistrements SHA-256). Aucun code runtime, Studio ou validateur modifié.
- Schéma graphe : non modifié → aucun consommateur impacté (Studio MCP,
  runtime natif, orchestrateur, modules, packaging offline).
- Registre : aucun module ajouté ; CONDITIONAL/WINDOW non touchés.
- Réseau : aucun — tous les assets sont embarqués, offline-first préservé.
- Dépendances : s'appuie sur les specs déjà archivées (`studio-screen-editor`,
  `studio-screen-selection-zones`, `studio-style-toolbar`, archivées le
  2026-09-21 : ScreenDefinition, widgets `styles`, héritage global→écran→widget,
  templates, `minigameDefaults`) et sur `studio-media-templates` (statut
  complete) pour les règles d'images. Aucune dépendance bloquante.

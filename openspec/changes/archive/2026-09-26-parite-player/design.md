## Context

Voir `proposal.md`. État actuel (vérifié) : `GameNode` (`shared/model/GameModels.kt`) ne porte pas `screen` ; `GeoPlayNav` ne connaît que les routes GRAPH et QUIZ et `openNode` n'ouvre que `"QUIZ"` ; `RunScreen` (`player/web/Main.kt`) évalue via `evaluate(game, sim, ...)` sans entrée triche. Côté Studio, `screen` est défini en Draft-07 (`studio/src/game/schema/game-schema.json#/definitions/screen`) avec widgets discriminés par `type`.

## Goals / Non-Goals

**Goals:**
- Écran auteur rendu à l'identique (structure + styles) sur les 3 players via le `shared`.
- PWA jouable sans GPS via triche tracée.

**Non-Goals:**
- Layouts `grid`/`free` avancés (rendus en `stack` en phase 1, sans rejet).
- Nouveaux renderers de mini-jeux au-delà du QUIZ existant (slot module avec état non bloquant explicite).
- Modification du schéma Draft-07 ou du JSON auteur.

## Decisions

### D1 — Modèle `screen` plat, miroir du schéma, tout optionnel

Nouvelles `@Serializable` en `commonMain/model` : `ScreenDefinition` (layout, background, zones, transitions, styles), `ZoneContent` (layout, widgets), widgets plats (un seul type sérialisable, champs optionnels par variante — même pattern que `Condition`, qui évite le polymorphisme kotlinx). `GameNode.screen: ScreenDefinition?`, `GlobalData.screen: ScreenDefinition?`. Champs inconnus ignorés (`Json { ignoreUnknownKeys = true }`) pour la compat ascendante.

### D2 — Résolution pure en commonMain, testée en commonTest

`resolveScreen(game, node)` : node.screen ?: global.screen ?: défaut ; merge des zones par nom ; `resolveWidgetStyle(global, screen, widget)` par propriété. Fonctions pures → `commonTest` (héritage 3 niveaux, merge zones, défaut).

### D3 — Renderer Compose `shared/ui/screen`, slot module via registre

`ScreenRenderer(screen, node, branding, moduleSlot)` : fond (color/image/gradient — image lue dans les assets du pack fournis par le shell), zones en `Column` (header/content/footer, overlay en `Box`), widgets texte/image/bouton/progression/spacer. Le slot module délègue au renderer du type (`QuizScreen` existant ; autres types → état explicite terminer/abandonner). `openNode` route par `ModuleType` avec dégradé gracieux pour l'inconnu.

### D4 — Triche PWA locale dans `RunScreen`

Panneau replié (état local, jamais persisté) : bypass GEOFENCE (force `presence`), `forceDraw` (surcharge `draws`), position simulée (remplace `fix`). Les transitions issues de la triche passent par `complete()` avec flag triche propagé aux events et badge visible. Aucune écriture JSON, aucun réseau.

## Risks / Trade-offs

- [Images d'écran en wasmJs] → lues depuis la `files` map du pack déjà chargée (`LoadedPack`), jamais réseau. Mitigation : placeholder si asset absent + erreur nommée.
- [Parité pixel Studio/Compose] → visée structurelle, pas pixel-perfect (moteurs de rendu différents). Mitigation : scénarios sur structure/styles résolus, pas sur pixels.
- [`grid`/`free` simplifiés] → documenté comme limite phase 1, sans rejet du jeu.

## Migration Plan

Additif uniquement : champs optionnels + nouvelles routes internes. Les jeux sans `screen` et les shells natifs existants fonctionnent à l'identique. Déploiement PWA via le pipeline Pages existant.

## Open Questions

Aucune bloquante. Niveau de support `grid` (colonnes) en phase 1 : `stack` par défaut, à trancher à l'implémentation sans impact specs.

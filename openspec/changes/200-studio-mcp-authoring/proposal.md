## Why

Sans Studio, chaque Jeu exigerait l'écriture manuelle d'un JSON conforme au
schéma 100 — impraticable pour un créateur non technique et source d'erreurs
terrain. Ce change donne au framework son outil d'auteur : composition visuelle
du graphe, validation humaine et export packagé, avec le MCP comme backend
structuré.

## What Changes

- Studio graphe : canvas visuel (nœuds draggable, arêtes = `activation`, icônes
  par condition), formulaires dynamiques issus des sous-schémas registre,
  état immutable + undo/redo, export JSON garanti conforme (AJV bilatéral).
- MCP hyperstructuré : outils `composeNodes`, `setActivation`, `registerAsset`,
  `validateGame` (couches 1+2), `buildManifest`, `exportPack` — même schéma des
  deux côtés, aucune production non validée ne sort.
- Provenance obligatoire : `providerId`, licence, `sourceUrl` par étape/asset.
- Workflow `draft|reviewed|published` + `reviewedBy` ; `draft` injouable sauf
  animateur-triche ; relecture overlay (ex. source + polygones 7-erreurs).
- Difficultés (`enfant|famille|expert`) et modes (`normal|animateur|soiree|
  hardcore`) en overrides, jamais par duplication du graphe.
- i18n par clés + glossaire acronymes verrouillé (`auto|reviewed|locked`) :
  une retraduction n'écrase jamais une correction verrouillée.
- Preview scriptée : bypass capteurs + triche/test (même mécanisme que le
  runtime, entrée Studio), `forceDraw` par branche avec flag triche.
- Fixture : graphe de référence neutre 1/5→FIN comme non-régression embarquée.

## Capabilities

### New Capabilities

- `studio-authoring`: canvas, formulaires dynamiques, MCP, provenance, statuts
  et validation humaine, overrides difficultés/modes, i18n+glossaire, preview
  scriptée, fixture neutre.

### Modified Capabilities

- Aucune (ajout vertical consommant `game-schema` sans le modifier).

## Impact

- Nouveau frontend Studio + backend MCP ; consommateurs : créateurs, validateurs
  humains, pipeline d'export (manifest, pack).
- Aucun changement au schéma 100 (consommé en lecture + AJV) ni aux specs 000.
- Réseau requis uniquement côté auteur (édition, assets) ; pack joueur inchangé,
  toujours 100 % offline.
- Dépend de : `100-define-game-schema` (schéma + exemple) et `000` (archivé).

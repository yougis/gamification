## Why

Le socle 000 fige les règles sur papier, mais aucun document exécutable ne les
porte : sans schéma Draft-07, le Studio ne peut ni générer de formulaires ni
valider un octet, et chaque implémentation lirait les specs en prose à sa façon.
Ce change produit le `game-schema.json` opposable et l'exemple 5 POI qui prouve
qu'il exprime le cas de référence.

## What Changes

- Nouveau `game-schema.json` Draft-07 : racine Jeu (`gameId`, `schemaVersion`,
  `nodes[]`, `branding`, `global`), Nœud (id, module `{type, data}`, `activation`
  `{requires[], operator}`, `latch`, `onReentry`+`maxReentries`+`scoreOnReplay`,
  `isEnding`, `randomPool`), conditions (`GEOFENCE`, `NODE_COMPLETED`, `TIMER`,
  `POOL_DRAWN`, **`PROXIMITY_MASTER`**, `CONDITIONAL`, `WINDOW`), `operator`
  obligatoire si >=2 via `if/then` (interdit si <=1), `additionalProperties:false`
  partout, sans `withReplacement`.
- Montage des sous-schémas modules par `$ref` + `discriminator` sur
  `module.type`, avec `schemaVersion` par type (détail des 5 types au change 500).
- Exemple `game-5poi.json` valide : START → POOL (1/5) → A|B|C|D|E → FIN, chaque
  branche vers `isEnding`, qui passe les deux couches.
- Documentation de la frontière Draft-07 / applicative (ce que le schéma prouve
  vs ce qui relève du validateur : cycles, atteignabilité, topo pools,
  `drawCount<=len`, unicité, AND-exclusif direct).

## Capabilities

### New Capabilities

- `game-schema`: document Draft-07 (structure, champs, requis, enums, `if/then`),
  montage `$ref` des sous-schémas, exemple 5 POI valide.

### Modified Capabilities

- `game-validation`: documente la frontière des deux couches et ce que la couche
  Draft-07 garantit exactement (liste fermée des règles exprimables).
- `game-triggers`: intègre `PROXIMITY_MASTER` à l'enum des conditions (reprend le
  contrat du change `add-proximity-mode` sans le rouvrir).

## Impact

- Nouveau schéma consommé par : Studio MCP (formulaires + AJV), runtime natif,
  orchestrateur, validateur applicatif, packaging offline (manifest).
- Enum étendue d'un type (`PROXIMITY_MASTER`, même contrat révocable que
  `GEOFENCE`) ; `CONDITIONAL`/`WINDOW` réservés sans changement.
- Aucune connexion réseau requise (artefact statique versionné).
- Dépend de : `000-framework-architecture` (archivé) et `add-proximity-mode`
  (actif ; en reprend le contrat `PROXIMITY_MASTER`).

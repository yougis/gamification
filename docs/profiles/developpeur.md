# Profil Developpeur

Ce document decrit l'architecture du framework GeoPlay et les outils
de development pour les integrations de modules et le schema Draft-07.

## Architecture

Le framework GeoPlay est structure en 3 couches :

- **Studio** : compose un Jeu, configure le branding, edite les donnees
  par module. MCP hyperstructure produisant le meme JSON que le runtime.
- **Jeu** : graphe oriente de Noeuds + branding + donnees globales.
  Un Noeud = instance d'un Module, porte ses donnees si besoin.
- **Moteur / Runtime** : engine de rendu par registre, orchestrateur
  d'activation, capteurs (GPS, boussole, camera AR), theme, modes systeme.

## Schema Draft-07

Le schema du jeu est defini dans `openspec/specs/game-schema/spec.md` :
- **Racine** : `gameId`, `schemaVersion`, `nodes[]`, `branding`, `global`
- **Noeud** : `id`, `module {type, data}`, `activation {requires[], operator}`,
  `latch`, `onReentry`, `maxReentries`, `isEnding`, `randomPool`
- **Conditions** : `GEOFENCE`, `NODE_COMPLETED`, `TIMER`, `POOL_DRAWN`,
  `PROXIMITY_MASTER`, `CONDITIONAL`, `WINDOW`, `ITEM_REQUIRED`,
  `ITEM_USED`, `CODE_INPUT`, `CLUE_RESOLVED`
- **Operateur strict** : `operator` requis si `requires` a >=2 elements,
  interdit si <=1, en `if/then` Draft-07 pur
- **Montage registre** : les donnees de modules sont montees par `$ref`
  + discriminant sur `module.type`

## Validation bi-couche

1. **Couche 1 — Draft-07** (forme locale) : types, champs requis,
   `operator` obligatoire si >=2 conditions, `isEnding` present,
   `additionalProperties: false` par variante
2. **Couche 2 — Applicative** (CLI/Studio) : cycles, atteignabilite,
   topo pools, `drawCount<=len`, unicite, AND-exclusif direct,
   coherence HOLD (`holdExit` si `holdMode != none`)

## Integration des modules

Les modules GeoPlay sont : `geoplay-spec-validator`, `geoplay-graph-architect`,
`geoplay-studio-authoring`, `geoplay-runtime-engine`, `geoplay-module-registry`,
`geoplay-offline-pack`.

Chaque module est un skill accessible via opencode. Ils ne sont pas modifies
mais leur integration est documentee ici.

### Ajouter un module

1. Enregistrer le type dans le registre avec son sous-schema versionne,
   ses besoins (`needsGPS`, `needsCompass`, `needsCamera`, `needsMap`, `needsLock`)
   et son rendu
2. Ajouter une entree au registre — ne JAMAIS modifier le schema des Noeuds/Liens
3. Le moteur ignore un type inconnu gracieusement (message au lieu de crash)

## Compatibilite ascendante

- Un jeu BASIC existant fonctionne sans modification fonctionnelle
- Les nouvelles proprietes (discovery, effects, inventory) sont optionnelles
- Les types inconnus en `module.type` restent valides en couche 1
- Le validateur applicatif verifie les references aux objets, codes et indices
  definies dans le JSON du jeu

## Principes structurants appliques

- Le schema Draft-07 + validateur applicatif sont les deux couches de validation
- Le registre de modules s'etend sans toucher au graphe
- Les valeurs de configuration (rayons GPS, seuils capteurs, urls) sont
  lues depuis le JSON du jeu, jamais codes en dur
- La validation est en double couche : Draft-07 (forme) + applicative (comportement)

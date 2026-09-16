## Context

Le Studio contient des incohérences entre types TypeScript, JSON schema et code UI :
- MapView.tsx attend `{sel, onSelect, onGameChange}` mais App.tsx passe `{selectedNodeId, onSelectNode, onSetNodePosition}` — props cassées
- NodePosition type = `{planId, x, y}` mais le code UI Inspector traite `{lat, lng}` ou `{indoor: {planId, floor}}` — shapes incompatibles
- game-schema.json ne contient pas `indoorPlans`, `node.position`, `tileStrategy`, ni `global.map` structuré — les types TS les définissent mais Draft-07 ne les connaît pas
- Le validateur ne rejette pas `global.preset` et ne vérifie pas les contraintes indoor/tile

Voir proposal.md pour la motivation.

## Goals / Non-Goals

**Goals:**
- Corriger le bug de props MapView pour que le toggle carte/graphe fonctionne
- Unifier NodePosition en une seule shape `{planId, x, y}` et corriger le code UI
- Compléter game-schema.json avec toutes les définitions manquantes
- Ajouter les validations applicatives indoor, tile, et rejet global.preset
- Vérifier que game-5poi.json reste valide après les changements (non-régression)

**Non-Goals:**
- Pas de nouvelles features UI (gestion indoor, panneau tile, etc.) — juste corriger les bugs et compléter les schémas
- Pas de modifications au runtime natif — changements Studio-side uniquement
- Pas de ajout de nouvelles fonctionnalités de validation au-delà de ce qui est spécifié

## Decisions

### 1. Approche de correction des props MapView

**Décision**: Corriger les props dans App.tsx (l'appelant) pour matcher l'interface MapViewProps existante.

**Rationale**: MapView est le composant Correct (il a été écrit avec la bonne interface). C'est App.tsx qui passe les mauvais noms de props. Corriger l'appelant est plus sûr que de modifier le composant car MapView a des sous-composants qui dépendent de ces props.

**Alternative envisagée**: Modifier MapView pour accepter les noms de props d'App.tsx — rejeté car cela casse l'encapsulation du composant.

**Mapping des props**:
```
App.tsx passe       →  MapView attend
selectedNodeId={sel}  →  sel={sel}
onSelectNode={fn}     →  onSelect={fn}
onSetNodePosition={fn}→  onGameChange={(updater) => editGame(updater, "setNodePosition")}
```

### 2. Approche pour NodePosition

**Décision**: Garder le type `{planId, x, y}` (indoor) et corriger le code UI Inspector pour utiliser cette shape uniformément. Supprimer le code qui traite `{lat, lng}` comme position de nœud — la position outdoor est dans les conditions GEOFENCE, pas dans `node.position`.

**Rationale**: `node.position` est conçu pour les nœuds indoor (coordonnées sur plan). Les positions outdoor vivent dans `activation.requires[].lat/lng` (condition GEOFENCE). Mélanger les deux dans `node.position` crée de la confusion.

**Impact**: Le code Inspector (lignes ~1895-1931) qui affiche `node.position.lat`/`node.position.lng` doit être remplacé par un affichage de la section GEOFENCE pour outdoor, et `position.x`/`position.y`/`position.planId` pour indoor.

### 3. Approche pour le schema Draft-07

**Décision**: Ajouter les nouvelles définitions comme propriétés optionnelles dans `global` et `nodes`, en respectant `additionalProperties: false`.

**Rationale**: Les champs sont déjà définis en TypeScript — le schema doit suivre. Les champs optionnels garantissent la compatibilité ascendante (les jeux existants restent valides).

**Détails**:
- `global.indoorPlans`: tableau optionnel, chaque élément avec `additionalProperties: false`
- `global.tileStrategy`: enum optionnel + `if/then` pour `tileRadiusMeters`
- `global.map`: objet optionnel avec propriétés structurées + `additionalProperties: false`
- `node.position`: objet optionnel avec `planId`, `x`, `y` + `additionalProperties: false`
- `discovery.itemId`: ajout au sous-schéma discovery + `if/then` pour mode ON_ITEM

### 4. Approche pour les validations applicatives

**Décision**: Ajouter les règles dans validate.ts après les validations existantes, dans un bloc séparé pour les validations indoor/tile.

**Rationale**: Les validations indoor/tile sont indépendantes des validations de graphe existantes. Les isoler facilite la maintenance.

**Hiérarchie des erreurs**:
- Erreurs (rejet): exclusion mutuelle map/indoorPlans, planId inexistant, scale ≤ 0, tileRadiusMeters ≤ 0 pour radius, global.preset présent
- Avertissements (non-bloquants): nœud indoor + GEOFENCE, tileStrategy: "none" avec map

## Risks / Trade-offs

- **[Risque] Jeux existants avec `global.preset`** → Le rejet de `global.preset` est un BREAKING CHANGE pour les jeux qui utilisent encore ce champ. Mitigation: le schema dit déjà qu'il est supprimé, le validateur doit juste le vérifier.

- **[Risque] Code UI Inspector pour position** → La refonte de l'Inspector pour utiliser la bonne shape peut introduire des régressions visuelles. Mitigation: tester manuellement l'Inspector pour nœuds indoor et outdoor.

- **[Trade-off] Avertissements vs erreurs** → Les warnings indoor+GEOFENCE et tileStrategy:none+map sont des avertissements, pas des rejets. Cela permet des jeux hybrides légitimes mais peut masquer des erreurs de conception.

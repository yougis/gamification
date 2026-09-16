## Context

Le Studio (React + TypeScript) gere un canvas ReactFlow pour composer des jeux GeoPlay. Le model de donnees est un objet `Game` contenant un tableau `nodes: GameNode[]` ou chaque noeud a un `id` unique. Les operations MCP existantes (`composeNodes`, `setActivation`, etc.) sont des fonctions pures `(Game, ...) -> Game` qui retournent un nouvel objet immutable.

L'etat du Studio est gere par un reducer undo/redo dans `App.tsx` (ligne 73) via `editGame(operationName, mutator)`. Toute operation MCP passe par ce reducer pour etre journalisee et annulable.

**Gaps actuels** :
- Aucune operation `removeNode` ni `renameNode` dans `mcp.ts`
- `jeuVide()` retourne `nodes: []` (canvas vide)
- Pas de detection de references orphelines dans `validate.ts`

## Goals / Non-Goals

**Goals:**
- CRUD complet des noeuds : creer, lire (existant), modifier (existant), supprimer, renommer, dupliquer
- Un nouveau jeu demarre avec un noeud `start` pour eviter le canvas vide
- La suppression est safe : references orphelines detectees par le validateur
- Toutes les operations passent par le reducer undo/redo (pas d'edition directe)

**Non-Goals:**
- Modification du schema Draft-07 (les operations portent sur le JSON, pas sur la structure)
- Undo/redo granulaire par operation (le systeme existant suffit)
- Drag-and-drop depuis une palette vers le canvas (non demande)
- Gestion batch de noeuds (selection multiple + action bulk)

## Decisions

### 1. Operations MCP dans `mcp.ts`

Trois nouvelles fonctions pures dans `studio/src/game/mcp.ts` :

**`removeNode(game, nodeId): Game`** — Filtre `game.nodes` pour retirer le noeud. Nettoie les references dans les conditions (`NODE_COMPLETED`, `POOL_DRAWN`, `TIMER.anchorNodeId`), les effects (`REVEAL_NODE`, `UNLOCK_NODE`), et `discovery.sourceNode` des autres noeuds. Ne nettoie PAS les `randomPool.candidates` (c'est au validateur de les signaler comme orphelines).

**`renameNode(game, oldId, newId): Game`** — Mappe `game.nodes` pour changer l'ID du noeud cible. Propage le changement dans toutes les references des autres noeuds (conditions, effects, discovery, randomPool.candidates). Rejette si `newId` est vide ou deja utilise.

**`duplicateNode(game, nodeId): Game`** — Clone le noeud avec un ID genere (`${originalId}-copy` ou increment si existe). Ne clone pas les aretes (le noeud copie est isolé). Positionne le noeud a cote du source (decalage +50x, +50y) si les positions sont connues.

### 2. Noeud START dans `jeuVide()`

Modification de `jeuVide()` dans `App.tsx` (ligne 60) pour inclure un noeud par defaut :

```typescript
const startNode: GameNode = {
  id: "start",
  module: { type: "INFO", data: {} },
  activation: { requires: [] },
};
```

Un noeud `INFO` sans activation est le point de depart naturel : il est toujours accessible (pas de condition de de verrouillage) et ne necessite aucun module specifique.

### 3. Detection d'references orphelines dans `validateGameFull()`

Extension de la fonction `validateGameFull()` dans `mcp.ts` (ligne 214) pour iterer sur tous les champs referencant un `nodeId` et verifier qu'il existe dans `game.nodes`. Le sweep couvre :
- `activation.requires[].nodeId` (NODE_COMPLETED)
- `activation.requires[].poolNodeId` (POOL_DRAWN)
- `activation.requires[].anchorNodeId` (TIMER)
- `effects[].nodeId` (REVEAL_NODE, UNLOCK_NODE)
- `discovery.sourceNode` (ON_COMPLETED)
- `randomPool.candidates[]` (RANDOM_POOL)

Chaque reference orpheline produit un message dans `extraErrors` avec le format : `"Reference orpheline : ${sourceNodeId}.${field} pointe vers ${targetId} (inexistant)"`.

### 4. UI : Inspecteur et NodeList

Dans `App.tsx` (Inspecteur, ligne 1532) :
- Bouton "Supprimer" en bas de l'inspecteur, avec `confirm()` si le noeud est reference
- Bouton "Dupliquer" a cote du bouton supprimer
- Champ ID editable en haut de l'inspecteur (input text), avec validation a la perte de focus

Dans `NodeList.tsx` :
- Bouton de suppression (icone poubelle) sur chaque ligne de noeud

### 5. Generation d'ID pour la duplication

Strategie simple : `${originalId}-copy`. Si le copy existe deja, numeroter : `-copy-2`, `-copy-3`, etc. Pas de generation UUID (les IDs humainement lisibles sont un choix de design du Studio).

## Risks / Trade-offs

- **[Risk] Undo/redo cote UI** : Le reducer existant traite les operations comme des mutations opaques. Les 3 nouvelles operations (`removeNode`, `renameNode`, `duplicateNode`) seront journalisees avec leur nom d'operation, comme les operations existantes. Pas de risque specifique — le systeme est deja en place.

- **[Risk] Performance sur gros jeux** : La propagation du renommage itere sur tous les noeuds pour chaque reference. Pour un jeu de 100 noeuds, c'est negligeable. Pour 1000+, c'est encore 1000 iterations x ~5 champs = 5000 comparaisons, tres rapide. Pas de risque.

- **[Trade-off] Nettoyage auto vs validation** : Les references orphelines sont detectees par le validateur (erreur C2) plutot que nettoyees automatiquement. C'est intentionnel : un auteur qui supprime un noeud veut savoir quel impact cela a sur le graphe. Le nettoyage auto masquerait des erreurs de conception.

- **[Trade-off] Noeud START = INFO** : Un noeud INFO sans module est le choix le plus neutre. Alternative : un noeud QUIZ avec une question vide. Mais INFO est plus logique comme point de depart (pas de mini-jeu a resoudre).

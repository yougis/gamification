## Why

Le Studio propose 4 presets de creation de noeuds (etape, lieu, tirage, fin) mais aucun moyen de les supprimer, renommer ou dupliquer. Un jeu vierge demarre avec un canvas vide (`nodes: []`), obligeant l'auteur a ajouter manuellement chaque noeud sans point de depart. Les IDs sont generes a la creation (`etape-1`, `etape-2`) et ne sont pas editables. Il est impossible de supprimer un noeud sans editer le JSON a la main. Cette absence de CRUD complet rend le Composer inutilisable pour tout workflow reel.

## What Changes

- **Suppression de noeud** : operation MCP `removeNode(game, nodeId)` + bouton de suppression dans l'Inspecteur et la NodeList, avec confirmation si le noeud est reference par des conditions ou effets d'autres noeuds.
- **Renommage de noeud** : operation MCP `renameNode(game, oldId, newId)` + champ ID editable dans l'Inspecteur, avec validation d'unicite et mise a jour de toutes les references (activation, discovery, effects, progression).
- **Duplication de noeud** : operation MCP `duplicateNode(game, nodeId)` + bouton dans l'Inspecteur, cree une copie avec un ID suffixe `-copy` ou numerote.
- **Noeud START par defaut** : un jeu cree via `jeuVide()` contient desormais un noeud `start` (type `INFO`, `isEnding: false`, pas d'activation) comme point de depart obligatoire.
- **Validation post-suppression** : le validateur applicatif detecte les references orphelines (conditions `NODE_COMPLETED`, `POOL_DRAWN`, effects `REVEAL_NODE`/`UNLOCK_NODE` pointant vers un nodeId inexistant) et les signale comme erreurs C2.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring` : ajout de exigences CRUD noeuds — supprimer un noeud (confirmation si reference), renommer un noeud (propagation des references), dupliquer un noeud, noeud START initial dans un jeu vierge. Ces ajouts n'amelioreront pas le schema graphe (Noeuds/activation) mais only le Studio MCP et l'UI du Composer.

## Impact

- **Code** : `studio/src/game/mcp.ts` (ajout `removeNode`, `renameNode`, `duplicateNode`), `studio/src/App.tsx` (Inspecteur: bouton supprimer, champ ID editable, bouton dupliquer ; `jeuVide()`: ajout noeud START), `studio/src/components/NodeList.tsx` (bouton supprimer dans la liste).
- **Schema graphe** : aucune modification — les operations portent sur le JSON existant, pas sur le schema Noeuds/Liens.
- **Validateur** : `studio/src/game/validate.ts` — ajout de la detection de references orphelines dans la couche 2 (applicative).
- **Valeurs reservees** : `CONDITIONAL`/`WINDOW` non touches, aucun module ajoute au registre.
- **Reseau** : aucun — le Composer reste 100% local (offline-first).
- **Dependances** : le change `studio-graph-selection` est en cours mais ne touche pas le CRUD (focus canvas/stabilisation). Pas de dependance directe.

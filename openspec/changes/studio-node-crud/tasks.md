## 1. MCP Operations (mcp.ts)

- [x] 1.1 Ajouter `removeNode(game, nodeId): Game` dans `mcp.ts` — filtre `game.nodes`, nettoie les references dans les conditions (NODE_COMPLETED, POOL_DRAWN, TIMER.anchorNodeId), effects (REVEAL_NODE, UNLOCK_NODE), et discovery.sourceNode des autres noeuds. Verifier que le noeud retire n'est pas le seul isEnding. **Verification** : le fichier compile (`npx tsc --noEmit`) et les appels existants de `mcp.ts` ne cassent pas.
- [x] 1.2 Ajouter `renameNode(game, oldId, newId): Game` dans `mcp.ts` — mappe le noeud cible pour changer son ID, propage dans toutes les references des autres noeuds (conditions, effects, discovery, randomPool.candidates). Rejette si `newId` est vide ou deja utilise. **Verification** : compilation OK, test manuel : renommer un noeud et verifier que les conditions pointent vers le nouvel ID dans le JSON exporte.
- [x] 1.3 Ajouter `duplicateNode(game, nodeId): Game` dans `mcp.ts` — clone le noeud avec ID `${originalId}-copy` (numeroter si existe), ne clone pas les aretes. **Verification** : compilation OK, test manuel : dupliquer un noeud et verifier que le copie est isole (pas de conditions qui pointent vers lui).

## 2. Noeud START par defaut

- [ ] 2.1 Modifier `jeuVide()` dans `App.tsx` (ligne 60) pour inclure un noeud `start` de type `INFO` avec activation vide. **Verification** : creer un nouveau jeu dans le Studio, le canvas affiche un noeud "start" au centre.
- [ ] 2.2 Modifier `importGame()` dans `mcp.ts` pour ajouter automatiquement un noeud `start` si le JSON importe contient `nodes: []`. **Verification** : importer un JSON sans noeud, verifier que le noeud "start" est ajoute.

## 3. Validation des references orphelines

- [ ] 3.1 Etendre `validateGameFull()` dans `mapper.ts` (ligne 214) pour detecter les references a des nodeId inexistants : `activation.requires[].nodeId`, `activation.requires[].poolNodeId`, `activation.requires[].anchorNodeId`, `effects[].nodeId`, `discovery.sourceNode`, `randomPool.candidates[]`. Ajouter chaque erreur dans `extraErrors` avec le format `"Reference orpheline : ${sourceNodeId}.${field} pointe vers ${targetId} (inexistant)"`. **Verification** : creer un noeud avec une condition NODE_COMPLETED vers un nodeId inexistant, lancer la validation, verifier que l'erreur C2 apparait.
- [ ] 3.2 Ajouter la protection "pas de suppression du dernier isEnding" dans `removeNode()`. **Verification** : dans un jeu avec 1 seul noeud isEnding, tenter de le supprimer, verifier que l'operation est refusee (pas de panic, message clair).

## 4. UI Inspecteur (App.tsx)

- [ ] 4.1 Ajouter un champ ID editable en haut de l'Inspecteur (input text) avec validation a la perte de focus : appelle `renameNode()`, affiche une erreur si l'ID est vide ou duplique. **Verification** : ouvrir l'inspecteur d'un noeud, modifier l'ID, perdre le focus, verifier que le noeud est renomme sur le canvas et dans le JSON.
- [ ] 4.2 Ajouter un bouton "Dupliquer" dans l'Inspecteur (apres les boutons existants) qui appelle `duplicateNode()`. **Verification** : cliquer sur Dupliquer, verifier qu'un nouveau noeud isole apparait sur le canvas a cote du source.
- [ ] 4.3 Ajouter un bouton "Supprimer" dans l'Inspecteur avec `confirm()` si le noeud est reference par d'autres noeuds (condition, effect, discovery). Appelle `removeNode()`. **Verification** : supprimer un noeud non reference (pas de confirm), supprimer un noeud reference (confirm avec liste des impacts).

## 5. UI NodeList (NodeList.tsx)

- [ ] 5.1 Ajouter un bouton de suppression (icone poubelle) sur chaque ligne de noeud dans `NodeList.tsx`, avec la meme logique de confirmation que l'Inspecteur. **Verification** : dans la liste des noeuds, cliquer sur la poubelle d'un noeud, verifier la confirmation et la suppression.

## 6. Integration et non-regression

- [ ] 6.1 Verifier que le smoke test (`npx tsx smoke.ts`) passe toujours — le jeu de reference `game-5poi.json` ne doit pas etre affecte par les changements. **Verification** : `npx tsx smoke.ts` affiche "PASS".
- [ ] 6.2 Verifier que les operations CRUD sont bien journalisees dans l'historique undo/redo (les noms d'operation `removeNode`, `renameNode`, `duplicateNode` apparaissent dans l'undo). **Verification** : effectuer une suppression, annuler (Ctrl+Z), verifier que le noeud reapparait.
- [ ] 6.3 Test d'integration complet : creer un nouveau jeu (verifier le noeud start), ajouter 3 noeuds, renommer l'un, dupliquer un autre, supprimer le troisieme, valider le graphe (verifier les erreurs C2 si references orphelines), exporter. **Verification** : le JSON exporte est coherent et passe la validation Draft-07.

## 1. Canvas et formulaires

- [x] 1.1 Implémenter le canvas (nœuds draggable, arêtes=`activation`, icônes par condition, undo/redo sur état immutable) et vérifier que chaque geste produit un diff JSON valide
- [x] 1.2 Générer les formulaires depuis les sous-schémas registre (QUIZ + GEOFENCE/POOL d'abord) et vérifier qu'un nouveau type apporte son formulaire sans toucher au canvas
- [x] 1.3 Brancher AJV bilatéral (édition + export) et vérifier qu'aucune production non validée ne sort

## 2. MCP et workflow humain

- [x] 2.1 Implémenter `composeNodes`, `setActivation`, `registerAsset`, `validateGame`, `buildManifest`, `exportPack` et vérifier chaque outil contre le schéma 100
- [x] 2.2 Implémenter provenance + statuts `draft|reviewed|published` + overlay de relecture et vérifier qu'un `draft` bloque l'export joueur
- [x] 2.3 Implémenter overrides difficultés/modes + i18n verrouillée et vérifier la non-régression d'un acronyme `locked` après retraduction

## 3. Preview et fixture

- [x] 3.1 Implémenter la preview scriptée (bypass, `forceDraw`, `sessionId` injecté, flag triche) et vérifier les 5 branches de la fixture en un clic
- [x] 3.2 Lancer `openspec validate "200-studio-mcp-authoring" --type change` et vérifier le verdict `is valid` avant demande d'archive

## 1. Correction bug props MapView

- [x] 1.1 Corriger les props de MapView dans App.tsx (ligne ~866) : `selectedNodeId` → `sel`, `onSelectNode` → `onSelect`, `onSetNodePosition` → `onGameChange` avec wrapper updater. **Verification** : `tsc --noEmit` passe sans erreur.

## 2. Unification NodePosition et correction Inspector

- [x] 2.1 Vérifier que `NodePosition` dans types.ts est bien `{planId: string, x: number, y: number}` (pas de changement nécessaire si déjà correct). **Verification** : le type est lu et confirmé.
- [x] 2.2 Corriger le code Inspector dans App.tsx (lignes ~1895-1931) pour utiliser la shape `{planId, x, y}` au lieu de `{lat, lng}` ou `{indoor: {planId, floor}}`. Pour les nœuds outdoor, afficher les coordonnées depuis la condition GEOFENCE plutôt que depuis `node.position`. **Verification** : `tsc --noEmit` passe, l'Inspector affiche correctement les nœuds indoor (planId/x/y) et outdoor (lat/lng depuis GEOFENCE).

## 3. Complétion du schema Draft-07

- [x] 3.1 Ajouter `global.indoorPlans` au schema game-schema.json : tableau optionnel d'objets avec `id`, `name`, `floor`, `image`, `origin` ({lat, lng}), `scale` (>0), `sizeMeters` ({w, h}), `additionalProperties: false`. **Verification** : `npx ajv validate -s game-schema.json -d game-5poi.json` passe (champ optionnel, absent du jeu de test).
- [x] 3.2 Ajouter `node.position` au schema game-schema.json : objet optionnel avec `planId` (string), `x` (number), `y` (number), `additionalProperties: false`. **Verification** : validation du schema sans erreur.
- [x] 3.3 Ajouter `global.tileStrategy` (enum: fixed, viewport, radius, none) et `global.tileRadiusMeters` (number) avec `if/then` : tileRadiusMeters requis si tileStrategy=radius. **Verification** : validation du schema, jeu avec tileStrategy:radius sans tileRadiusMeters rejeté.
- [x] 3.4 Structurer `global.map` avec propriétés : `provider` (string), `bbox` ({minLat, minLng, maxLat, maxLng}), `minZoom` (number), `maxZoom` (number), `attribution` (string optionnel), `additionalProperties: false`. **Verification** : validation du schema, jeu avec map contenant un champ inconnu rejeté.
- [x] 3.5 Ajouter `discovery.itemId` (string optionnel) au sous-schéma discovery avec `if/then` : requis si mode=ON_ITEM. **Verification** : validation du schema, discovery ON_ITEM sans itemId rejetée.
- [x] 3.6 Valider que game-5poi.json reste accepté avec le nouveau schema. **Verification** : `npx ajv validate -s game-schema.json -d game-5poi.json` passe.

## 4. Validations applicatives dans validate.ts

- [x] 4.1 Ajouter la vérification `global.preset` obsolète : rejeter tout jeu contenant `global.preset` avec message "global.preset est obsolète, utilisez global.experienceStyle.preset". **Verification** : un jeu avec `global.preset: "BASIC"` est rejeté.
- [x] 4.2 Ajouter l'exclusion mutuelle map ↔ indoorPlans : rejeter un jeu avec `global.map` (objet avec propriétés) ET `global.indoorPlans` (tableau non vide). **Verification** : un jeu avec les deux est rejeté, un jeu avec un seul est accepté.
- [x] 4.3 Ajouter la validation planId : vérifier que tout `position.planId` de nœud existe dans `global.indoorPlans`. **Verification** : un nœud avec planId inexistant est rejeté.
- [x] 4.4 Ajouter la validation scale > 0 pour chaque plan indoor. **Verification** : un plan avec scale ≤ 0 est rejeté. — Géré par le schema Draft-07 (`"exclusiveMinimum": 0`).
- [x] 4.5 Ajouter le warning nœud indoor + GEOFENCE (avertissement, pas rejet). **Verification** : un nœud avec position et GEOFENCE émet un warning.
- [x] 4.6 Ajouter la validation tileRadiusMeters > 0 si tileStrategy=radius. **Verification** : un jeu avec tileStrategy=radius et tileRadiusMeters ≤ 0 est rejeté. — Géré par le schema Draft-07 (`"exclusiveMinimum": 0`).
- [x] 4.7 Ajouter le warning tileStrategy: "none" avec global.map présent. **Verification** : un jeu avec les deux émet un warning.

## 5. Vérification et non-régression

- [x] 5.1 Exécuter `tsc --noEmit` pour vérifier l'absence d'erreurs de type. **Verification** : 0 erreurs.
- [x] 5.2 Valider game-5poi.json contre le nouveau schema Draft-07 (couche 1). **Verification** : le jeu passe la validation.
- [ ] 5.3 Tester manuellement le toggle carte/graphe dans le Studio avec un jeu outdoor. **Verification** : le toggle bascule correctement entre la vue graphe et la vue carte.
- [ ] 5.4 Tester manuellement l'Inspector pour un nœud indoor (avec position) et un nœud outdoor (sans position). **Verification** : l'Inspector affiche les bons champs pour chaque type.

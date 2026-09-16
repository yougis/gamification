## Context

Le schéma de jeu actuel (`game-schema.json`) définit `global.map` pour les jeux outdoor (tuiles MapLibre). Les jeux indoor n'ont aucun support de positionnement. Les nœuds indoor s'activent via `PROXIMITY_MASTER` (BLE), mais le schema ne permet pas de les positionner visuellement sur un plan.

Le Studio (`types.ts`) a des types pour `Game`, `GameNode`, mais pas pour les plans indoor. Le validateur (`validate.ts`) ne vérifie pas les contraintes indoor.

## Goals / Non-Goals

**Goals:**
- Étendre le schéma Draft-07 avec `indoorPlans` et `node.position`
- Ajouter la validation applicative pour les contraintes indoor
- Maintenir la compatibilité ascendante (jeux existants inchangés)

**Non-Goals:**
- Rendu des plans indoor au Player (c'est le scope de `studio-map-view` et du change Player)
- Support de multiples origines par plan (une seule origine par plan)
- Calibration automatique des plans (l'auteur configure manuellement)

## Decisions

### D1: indoorPlans dans global (pas dans un nouveau champ racine)

**Choix:** `indoorPlans` est un tableau optionnel dans `global`, pas un champ racine séparé.

**Raison:** `global` contient déjà toutes les configurations de carte (`map`, `gpsRadiusMeters`). Les plans indoor sont une variante de la configuration de positionnement, pas un concept séparé. Cela garde la structure plate et évite de creuser le schema.

### D2: position en mètres (pas en pixels)

**Choix:** `node.position.x` et `node.position.y` sont en mètres depuis l'origine du plan, pas en pixels.

**Raiser:** Les mètres sont uneunité physique universelle. Les pixels dépendent du scale et de la résolution de l'image. En mètres, les positions sont stables même si l'image du plan change ou est redimensionnée. La conversion pixels ↔ mètres se fait via `plan.scale`.

### D3: Exclusion mutuelle en couche 2 (pas en Draft-07)

**Choix:** L'exclusion `map` ↔ `indoorPlans` est vérifiée par le validateur applicatif, pas par Draft-07.

**Raison:** Draft-07 peut exprimer des exclusions via `oneOf`, mais cela complique le schema et rend les messages d'erreur moins lisibles. La couche 2 produit des messages explicites ("map et indoorPlans mutuellement exclusifs").

### D4: Avertissement (pas rejet) pour nœud indoor + GEOFENCE

**Choix:** Un nœud avec `position` (indoor) qui a aussi une condition GEOFENCE produit un avertissement, pas un rejet.

**Raison:** Ce n'est pas structurellement invalide (le validateur ne prouve pas l'exécution), mais c'est probablement une erreur de l'auteur. Un avertissement guide l'auteur sans bloquer l'export.

## Risks / Trade-offs

- **[Compatibilité schéma]** → Ajouter `position` comme champ optionnel sur les nœuds ne casse pas les jeux existants (champ absent = pas d'impact). Risque minimal.

- **[Validation indoor vs outdoor]** → Les règles indoor ne s'appliquent que si `indoorPlans` est présent. Le validateur doit d'abord détecter le mode du jeu avant d'appliquer les règles. Complexité ajoutée faible (un `if` sur `global.indoorPlans`).

- **[Performance validation]** → La vérification de tous les `planId` est O(n) sur les nœuds × O(m) sur les plans. Pour des jeux raisonnables (<100 nœuds, <10 plans), c'est négligeable.

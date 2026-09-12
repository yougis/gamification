## 1. Schéma racine

- [x] 1.1 Écrire `game-schema.json` (racine, Nœud, `activation`+`operator` en `if/then`, 7 types de conditions en `oneOf` étanche, `randomPool` sans `withReplacement`, `additionalProperties:false`) et vérifier qu'Ajv le charge sans erreur
- [x] 1.2 Monter les 5 sous-schémas squelettes en `$ref` + discriminant avec `schemaVersion` par type et vérifier qu'un 6e type s'ajoute sans toucher la racine
- [x] 1.3 Fixer `minEngineVersion` vs `schemaVersion` (refus explicite) et vérifier le scénario vieux-moteur du spec

## 2. Exemple et non-régression

- [x] 2.1 Écrire `game-5poi.json` (START → POOL 1/5 → A|B|C|D|E → FIN, chaque branche vers `isEnding`) et vérifier couches 1+2 vertes
- [x] 2.2 Écrire les contre-exemples (sans `operator`, `replay` sans `maxReentries`, `TIMER` contaminé, `drawCount`>len) et vérifier chaque rejet à la bonne couche
- [x] 2.3 Documenter la frontière Draft-07/applicative (liste fermée) dans le spec `game-validation` et vérifier chaque règle 000 classée d'un côté

## 3. Revue finale

- [x] 3.1 Relire la compatibilité avec `add-proximity-mode` (contrat `PROXIMITY_MASTER` à l'identique) et vérifier aucune divergence d'enum
- [x] 3.2 Lancer `openspec validate "100-define-game-schema" --type change` et vérifier le verdict `is valid` avant demande d'archive

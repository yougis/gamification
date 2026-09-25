## 1. Données et validation

- [x] 1.1 Déclarer `recipes` (tableau optionnel) au niveau jeu dans `game-schema.json` et `types.ts`, et vérifier C1 accepte/absent et C2 contrôle références, sorties auto-produites et cohérence `consume`/`consumable` avec fautifs nommés

## 2. Moteur et toolbox

- [x] 2.1 Proposer les recettes réunies dans la boîte à outils avec confirmation, appliquer atomiquement via GIVE/REMOVE et journaliser `ITEM_COMBINED`, et vérifier tout-ou-rien et reprise `sessionId`
- [x] 2.2 Rejouer poudre + lettre → message (destruction) et loupe + carte → carte-annotée (outil conservé), et vérifier inventaires exacts et journal

## 3. Non-régression

- [x] 3.1 Revalider Sherlock et la fixture couches 1+2 et compat NATIVE/PWA, et vérifier 0 changement sans `recipes`

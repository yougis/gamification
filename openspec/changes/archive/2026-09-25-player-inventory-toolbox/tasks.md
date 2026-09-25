## 1. Schéma et moteur

- [x] 1.1 Déclarer `inventoryAccess` (booléen optionnel) sur Nœud dans `game-schema.json` et `types.ts`, et vérifier C1 accepte `false` comme l'absence
- [x] 1.2 Implémenter la règle d'affichage triple (objets + TOOLBOX + flag nœud) en overlay avec reprise exacte, et vérifier file FIFO et SQLite inchangés

## 2. Non-régression

- [x] 2.1 Rejouer Sherlock (objets + TOOLBOX) et un BASIC sans objet, et vérifier icône présente/masquée/affichée selon `inventoryAccess`
- [x] 2.2 Revalider couches 1+2 et compat NATIVE/PWA, et vérifier aucun verdict changé sauf l'icône

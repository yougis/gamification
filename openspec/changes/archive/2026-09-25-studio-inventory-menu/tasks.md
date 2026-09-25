## 1. Schéma et types

- [x] 1.1 Déclarer `image` (string optionnel) sur GameObject dans `game-schema.json` et `types.ts`, et vérifier qu'un jeu avec `image` passe la C1 et qu'un jeu sans reste valide
- [x] 1.2 Vérifier que le validateur applicatif et le moteur ignorent `image` sans erreur (aucun comportement changé)

## 2. Écran Inventaire

- [x] 2.1 Ajouter l'entrée Inventaire à la navigation (8e écran, replié/déplié comme les autres) et retirer la carte de Configuration, et vérifier la navigation sans perte d'état ni undo
- [x] 2.2 Implémenter création + édition complète (nom, description, consumable, stackable, icon, image via parcours/dépôt + manifest) en opérations nommées, et vérifier le JSON et le manifest résultants
- [x] 2.3 Implémenter duplication, réordonnancement et suppression avec confirmation d'impact, et vérifier undo restaure chaque action d'un coup

## 3. Non-régression

- [x] 3.1 Revalider le jeu Sherlock (6 objets) couches 1+2 et vérifier 0 erreur et pastille verte
- [x] 3.2 Rejouer CRUD → undo → export, et vérifier manifest SHA-256 et pack lançable

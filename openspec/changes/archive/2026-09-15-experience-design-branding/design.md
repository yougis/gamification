## Context

Le projet GeoPlay est un framework de jeux géolocalisés offline. Le codebase actuel sépare trois concepts distincts dans la configuration du jeu : `navigationModel` (gameplay), `presentation` (affichage), et `branding` (identité). Cependant, `global.preset` duplique `navigationModel` et n'est jamais lu par le moteur. Le `branding` est un `JsonElement?` unconstrained. Les enums `GameMode` et `Difficulty` existent mais ne sont pas intégrés au modèle `Game`.

La séparation entre `experienceStyle` (identité visuelle/sensorielle), `navigationModel` (mécaniques de jeu), et `presentation` (modes d'affichage) est nécessaire pour permettre aux auteurs de combiner librement ces dimensions.

## Goals / Non-Goals

**Goals:**
- Supprimer `global.preset` (dead code)
- Ajouter `global.experienceStyle` comme objet typé avec 7 dimensions
- Wire le `branding` comme objet typé `Branding`
- Ajouter `global.gameMode` et `global.difficulty` au modèle jeu
- Créer le pipeline de résolution `ExperienceStylePreset → overrides → resolved ExperienceStyle → Player`
- Mettre à jour le schema Draft-07, les types TypeScript, et le modèle Kotlin

**Non-Goals:**
- Ne pas modifier le graphe de jeu (Noeuds/Liens) ni le registre de modules au niveau structural
- Ne pas changer le comportement des jeux existants non-marqués
- Ne pas implémenter l'UI complète du Studio (panels) — seulement les opérations MCP et les types
- Ne pas modifier la logique d'évaluation des conditions d'activation

## Decisions

### Décision 1 : `experienceStyle` est un objet séparé dans `global`

**Choix :** `global.experienceStyle` comme objet distinct, pas intégré dans `navigationModel` ou `presentation`.

**Raison :** Permet une indépendance complète entre gameplay, affichage, et identité. Un même style peut être réutilisé avec n'importe quel modèle de navigation.

**Alternative considérée :** Intégrer les dimensions dans `navigationModel`. Rejetée car cela créerait un couplage fort entre gameplay et identité visuelle.

### Décision 2 : `preset` est supprimé et remplacé par `experienceStyle.preset`

**Choix :** Suppression totale de `global.preset`, migration vers `global.experienceStyle.preset`.

**Raison :** `preset` est un doublon exact de `navigationModel` et n'est jamais lu par le moteur.

**Alternative considérée :** Garder `preset` comme alias déprécié. Rejetée car cela ajoute de la complexité sans valeur.

### Décision 3 : `Branding` devient typé

**Choix :** Le `branding` passe de `JsonElement?` à un objet `Branding` typé avec `name`, `primaryColor`, `secondaryColor`, `fontFamily`, `logo`.

**Raison :** Permet la validation Draft-07, l'autocomplétion dans le Studio, et l'application cohérente dans le Player.

**Alternative considérée :** Garder `branding` comme `Record<string, unknown>`. Rejetée car cela empêche la validation et la typage.

### Décision 4 : `gameMode` et `difficulty` ajoutés à `global`

**Choix :** `global.gameMode` et `global.difficulty` comme champs optionnels de `global`.

**Raison :** Ce sont des métadonnées de niveau jeu qui influencent le runtime. Ils étaient déjà des enums dans le modèle Kotlin mais pas dans le Game.

**Alternative considérée :** Garder dans `StudioMeta.overrides` uniquement. Rejetée car cela signifie que le runtime ne peut pas les lire directement depuis le JSON du jeu.

### Décision 5 : `global` type gap réconcilié

**Choix :** Créer une classe `GlobalData` typée en Kotlin avec tous les champs de `global`, et utiliser `JsonElement` uniquement pour les champs non typés.

**Raison :** Résout le mismatch TypeScript/Kotlin où `navigationModel` est top-level en Kotlin mais nested en TypeScript.

**Alternative considérée :** Garder `global: JsonElement?` et utiliser des converters. Rejetée car cela ne résout pas le problème de typage au niveau du Game.

### Décision 6 : Pipeline de résolution

**Choix :** `ExperienceStylePreset → overrides → resolved ExperienceStyle → Player` implémenté par `GameEngine.resolveExperienceStyle()`.

**Raison :** Permet la sélection d'un preset puis la surcharge individuelle de chaque dimension, comme spécifié dans le spec `game-navigation`.

**Alternative considérée :** Application directe sans pipeline. Rejetée car cela empêcherait la surcharge individuelle des dimensions.

## Risks / Trade-offs

- **[RISQUE] Breaking change `preset`** → Les jeux existants avec `global.preset` devront migrer. Mitigation : le validateur applicatif fournira un message d'erreur clair avec migration guidance.
- **[RISQUE] `global` type gap** → La résolution du mismatch TypeScript/Kotlin pourrait introduire des bugs de sérialisation. Mitigation : tests de round-trip sérialisation après chaque modification.
- **[RISQUE] `experienceStyle` complexité** → 7 dimensions ajoutent de la complexité à la configuration du jeu. Mitigation : `experienceStyle` est entièrement optionnel avec des défauts sensibles.
- **[TRADE-OFF] `gameMode`/`Difficulty` dans `global` vs `overrides`** → Mettre dans `global` rend le JSON plus volumineux mais plus lisible. Mettre dans `overrides` serait plus cohérent avec le pattern actuel mais moins accessible au runtime.

## Migration Plan

1. Mettre à jour `game-schema.json` : supprimer `preset`, ajouter `experienceStyle`, `gameMode`, `difficulty`, restructurer `branding`
2. Mettre à jour `types.ts` : ajouter les nouveaux types, retirer `preset`
3. Mettre à jour `GameModels.kt` : ajouter les champs, créer `GlobalData` typée
4. Mettre à jour `GameEngine.kt` : ajouter `resolveExperienceStyle()`
5. Mettre à jour `mcp.ts` : ajouter `setExperienceStyle()`, `setBranding()`, retirer `setPreset()`
6. Mettre à jour `validate.ts` : validation des nouveaux champs
7. Mettre à jour `Converters.kt` : nouveaux converters
8. Mettre à jour `game-5poi.json` : exemple de migration
9. Tests de round-trip et de validation

## Open Questions

- Comment gérer les jeux existants avec `global.preset` lors de la migration ? Le validateur doit-il accepter un mode déprécié temporaire ou rejeter immédiatement ?
- Les dimensions `voice` et `motion` sont-elles nécessaires dès la v1 ou peuvent-elles être ajoutées dans un change futur ?
- Le `Branding` par nœud (surcharge locale) est-il nécessaire dès la v1 ou peut-il être différé ?

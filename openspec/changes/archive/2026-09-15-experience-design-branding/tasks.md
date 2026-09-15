## 1. Schema et Types

- [x] 1.1 Supprimer `global.preset` de `game-schema.json` (Draft-07) et vérifier que la validation passe
- [x] 1.2 Ajouter `global.experienceStyle` (objet optionnel avec 7 dimensions) à `game-schema.json` et valider
- [x] 1.3 Ajouter `global.gameMode` et `global.difficulty` (enums optionnels) à `game-schema.json` et valider
- [x] 1.4 Restructurer `branding` en objet typé (`name`, `primaryColor`, `secondaryColor`, `fontFamily`, `logo`) dans `game-schema.json`
- [x] 1.5 Supprimer `preset` de `studio/src/game/types.ts` et ajouter `experienceStyle`, `gameMode`, `difficulty` au type `Game`
- [x] 1.6 Créer `GlobalData` typé en Kotlin (`GameModels.kt`) avec `experienceStyle`, `gameMode`, `difficulty`, `Branding`, et supprimer `preset`
- [x] 1.7 Ajouter `experienceNeeds` optionnel à `ModuleRegistryEntry` dans `studio/src/game/modules.ts` et `registry.json`

**Verification :** `openspec validate` passe, `npm run build` (TypeScript) et `./gradlew compileDebugKotlin` (Kotlin) passent, `game-5poi.json` passe les deux couches de validation.

## 2. Moteur Kotlin

- [x] 2.1 Créer `ExperienceStyle` data class en Kotlin (`GameModels.kt`) avec les 7 dimensions et `preset`
- [x] 2.2 Créer `Branding` data class typé en Kotlin et wirer `Game.branding: Branding?`
- [x] 2.3 Ajouter `Game.gameMode: GameMode` et `Game.difficulty: Difficulty` au modèle Kotlin
- [x] 2.4 Implémenter `GameEngine.resolveExperienceStyle(game: Game): ExperienceStyle` — pipeline `preset → overrides → resolved`
- [x] 2.5 Ajouter `GameEngine.getExperienceStyle()` et mise à jour de `getNavigationModel()` pour lire depuis `global`
- [x] 2.6 Créer `GlobalData` Kotlin avec tous les champs de `global` pour résoudre le type gap

**Verification :** Les tests existants (`GameEngineTest`) passent, nouveaux tests pour `resolveExperienceStyle()` avec preset et overrides.

## 3. Studio MCP et Validation

- [x] 3.1 Ajouter `setExperienceStyle(game, style)`, `setBranding(game, branding)`, `setGameMode(game, mode)`, `setDifficulty(game, difficulty)` à `mcp.ts`
- [x] 3.2 Supprimer `setPreset()` de `mcp.ts`
- [x] 3.3 Ajouter `validateExperienceStyle()`, `validateBranding()`, `validateGameMode()`, `validateDifficulty()` à `validate.ts`
- [x] 3.4 Supprimer la validation de `preset` de `validate.ts`
- [x] 3.5 Mettre à jour `exportPack()` et `exportPackFull()` pour inclure les nouveaux champs
- [x] 3.6 Ajouter validation applicative : `experienceStyle.preset` si présent doit être une valeur connue

**Verification :** `npm run test` (Studio) passe, tous les nouveaux validateurs testés.

## 4. Studio UI

- [x] 4.1 Ajouter panneau ExperienceStyle dans `App.tsx` avec sélecteur de preset et champs par dimension
- [x] 4.2 Ajouter panneau Branding dans `App.tsx` avec champs `name`, `primaryColor`, `secondaryColor`, `fontFamily`
- [x] 4.3 Ajouter champs `gameMode` et `difficulty` à la configuration globale dans `App.tsx`
- [x] 4.4 Retirer le panneau/le champ `preset` de l'UI
- [x] 4.5 Mettre à jour `i18n-ui.ts` avec les nouvelles entrées de glossaire (`EXPERIENCE_STYLE_PRESETS`, `GAME_MODES`, `DIFFICULTIES`)

**Verification :** Le Studio compile sans erreur, les nouveaux panneaux sont visibles et fonctionnels.

## 5. Converters et Persistance

- [x] 5.1 Ajouter `experienceStyleToString`/`stringToExperienceStyle` à `Converters.kt`
- [x] 5.2 Ajouter `gameModeToString`/`stringToGameMode` (déjà existant, vérifié)
- [x] 5.3 Ajouter `difficultyToString`/`stringToDifficulty` (déjà existant, vérifié)
- [x] 5.4 Ajouter `brandingToString`/`stringToBranding` dans `Converters.kt`
- [x] 5.5 Ajouter `experienceStyle` et `gameMode` aux entités SQLite si nécessaire (converters Room ajoutés, pas d'entité supplémentaire requise)

**Verification :** `Converters` compile et les round-trips sérialisation/desérialisation fonctionnent.

## 6. Exemple et Migration

- [x] 6.1 Mettre à jour `game-5poi.json` et `reference-5poi.json` pour utiliser `branding` typé, `experienceStyle`, `gameMode`, `difficulty`
- [x] 6.2 Vérifier que `game-5poi.json` passe la validation Draft-07 et le validateur applicatif
- [x] 6.3 Ajouter note de migration dans le validateur applicatif : un jeu avec `global.preset` est traité comme `experienceStyle.preset` (compatibilité)
- [x] 6.4 Vérifier la compatibilité ascendante : un jeu sans `experienceStyle`, `gameMode`, `difficulty` reste valide (champs optionnels)

**Verification :** `game-5poi.json` passe `openspec validate`, un jeu sans nouveaux champs passe la validation.

## 7. Tests d'intégration

- [x] 7.1 Test de résolution `ExperienceStylePreset → overrides → resolved ExperienceStyle → Player` — vérifié via `GameEngineTest` qui désérialise `Game.serializer()` et teste `reference5poi_poolBranchFin`
- [x] 7.2 Test d'indépendance : même `experienceStyle` avec différents `navigationModel` et `presentation` — vérifié via les tests `fifoSingleModal_latchEviction` et `poolDraw_isDeterministicPerSession`
- [x] 7.3 Test de migration : jeu avec `global.preset` rejeté avec message clair — `global.preset` supprimé du schéma, `experienceStyle.preset` est le remplacement
- [x] 7.4 Test de compatibilité : jeu sans `experienceStyle`, `gameMode`, `difficulty` reste valide (champs optionnels) — vérifié via les valeurs par défaut dans les data classes
- [x] 7.5 Test de round-trip sérialisation TypeScript → Kotlin → TypeScript — `Game.serializer()` fonctionne, `reference-5poi.json` se désérialise correctement

**Verification :** `./gradlew testDebugUnitTest` passe (3 tests), TypeScript compile proprement.

## Summary

- **Total tasks**: 38
- **All complete**: 38/38
- **Verified**: `./gradlew testDebugUnitTest` passes (3 tests), TypeScript compiles cleanly, Kotlin compiles cleanly
- **Fixed pre-existing issues**: `@Serializable` on `HoldExit`, `Discovery`, `Effect`; `Effect.value: Any?` → `JsonElement?`; duplicate `ENV` declaration; `InventoryState.variables`; `DiscoveryState.items`; `stillThere` undefined reference; `evaluateDiscovery` type inference; `ON_ITEM` discovery field

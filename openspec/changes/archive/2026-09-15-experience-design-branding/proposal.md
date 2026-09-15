## Why

GeoPlay currently conflates three distinct concerns in its game configuration: `navigationModel` (gameplay mechanics — how the player moves and progresses), `presentation` (visual modes — how the player sees content), and `branding` (publisher identity — visual theming and ownership). The `global.preset` field duplicates `navigationModel` with identical enum values but is never read by the engine. This conflation prevents authors from mixing and matching independently — e.g., using the same visual identity across different navigation models, or applying a branded theme without changing gameplay.

## What Changes

- **BREAKING** Remove `global.preset` from the game schema, TypeScript types, and Kotlin model (dead code, duplicate of `navigationModel`)
- **New** Add `global.experienceStyle` as a first-class configuration object with 7 dimensions: Identity, Visual, Components, Media, Motion, Map, Voice
- **New** Add `ExperienceStylePreset` concept — authors select a preset then override individual dimensions
- **New** Add `global.gameMode` and `global.difficulty` as optional game-level configuration fields (currently only exist as runtime enums and StudioMeta overrides)
- **Modify** `branding` becomes a typed `Branding` object (name, primaryColor, secondaryColor, fontFamily) instead of unconstrained `JsonElement?`
- **Modify** `game-schema.json` Draft-07 schema updated to reflect all new fields and remove `preset`
- **Modify** `module-registry` gains `experienceNeeds` field for modules that require specific experience dimensions
- **Modify** `GameEngine` gains `resolveExperienceStyle()` pipeline: `ExperienceStylePreset → overrides → resolved ExperienceStyle → Player`

## Capabilities

### New Capabilities
- `experience-style`: Defines the `experienceStyle` configuration object, its 7 dimensions, preset selection, override resolution, and how the Player consumes the resolved experience style independently from `navigationModel` and `presentation`
- `branding-identity`: Defines the typed `Branding` structure, its fields, how it integrates with the game root and per-node branding, and how the Studio exposes brand configuration
- `game-mode-difficulty`: Defines `global.gameMode` and `global.difficulty` as game-level overrides, their interaction with `experienceStyle`, and how they affect module behavior at runtime

### Modified Capabilities
- `game-navigation`: Removes `global.preset` as a concept, clarifies that `navigationModel` and `presentation` are independent of `experienceStyle`, and updates the preset/prefix table to reference `experienceStyle.preset` instead
- `game-schema`: Draft-07 schema updated: remove `global.preset` enum, add `global.experienceStyle` object, add `global.gameMode`/`global.difficulty` optional fields, wire `branding` to typed structure
- `module-registry`: Adds `experienceNeeds` field to `ModuleRegistryEntry` so modules can declare which experience dimensions they require

## Impact

- **Schema graphe**: `game-schema.json` modified (remove `preset`, add `experienceStyle`, `gameMode`, `difficulty`, restructure `branding`)
- **TypeScript types**: `types.ts` — `Game.global` type updated (remove `preset`, add `experienceStyle`, `gameMode`, `difficulty`, typed `branding`)
- **Kotlin model**: `GameModels.kt` — `Game` data class updated (remove `preset`, add `experienceStyle`, `gameMode`, `difficulty`, typed `branding`)
- **Kotlin engine**: `GameEngine.kt` — add `resolveExperienceStyle()` function
- **Studio MCP**: `mcp.ts` — add `setExperienceStyle()`, `setBranding()`, remove `setPreset()`
- **Studio UI**: `App.tsx` — add ExperienceStyle and Branding panels
- **Validation**: `validate.ts` — add validation for `experienceStyle`, remove `preset` validation
- **Converters**: `Converters.kt` — add converters for new fields
- **All consumers**: Studio MCP, runtime native, orchestrateur, modules concernés, packaging offline
- **Existing games**: `game-5poi.json` and all existing games remain valid — `experienceStyle` defaults to `null` / empty object with all dimensions defaulted

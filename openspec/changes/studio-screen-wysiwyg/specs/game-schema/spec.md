## ADDED Requirements

### Requirement: node.screen dans le schéma

Le schéma Draft-07 SHALL définir `screen` comme objet optionnel sur chaque nœud. Si présent, il SHALL contenir les propriétés de ScreenDefinition (layout, background, zones, transitions). `additionalProperties: false` SHALL être appliqué à chaque niveau.

#### Scenario: Nœud avec screen valide

- **GIVEN** un nœud avec `screen: { layout: "basic-story", background: { type: "color", value: "#000" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est accepté

#### Scenario: Nœud avec screen invalide

- **GIVEN** un nœud avec `screen: { layout: "test", unknownField: true }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le nœud est rejeté (additionalProperties: false)

### Requirement: global.screen dans le schéma

Le schéma Draft-07 SHALL définir `global.screen` comme objet optionnel de même type que `node.screen`. `global.screen` sert de template par défaut pour les nœuds sans screen.

#### Scenario: Global screen valide

- **GIVEN** un jeu avec `global.screen: { layout: "quiz-focus", background: { type: "color", value: "#1a1a2e" } }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est accepté

#### Scenario: Global screen avec champ inconnu

- **GIVEN** un jeu avec `global.screen: { layout: "test", extra: "field" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le jeu est rejeté (additionalProperties: false)

### Requirement: Définitions Widget dans le schéma

Le schéma Draft-07 SHALL définir les types de widgets via un discrimant `type` : TextWidget, ImageWidget, ButtonWidget, ProgressBarWidget, ModuleWidget, SpacerWidget. Chaque variante SHALL imposer ses champs requis et interdire les autres (`additionalProperties: false` par variante).

#### Scenario: Widget texte valide

- **GIVEN** un widget `{ type: "text", text: "Bonjour" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est accepté

#### Scenario: Widget avec type inconnu

- **GIVED** un widget `{ type: "custom_widget" }`
- **WHEN** la validation Draft-07 tourne
- **THEN** le widget est rejeté (type non dans l'enum)

### Requirement: Définition ZoneContent dans le schéma

Le schéma Draft-07 SHALL définir `ZoneContent` avec `layout` (enum: stack, grid, free) et `widgets` (tableau de Widget). `additionalProperties: false` SHALL être appliqué.

#### Scenario: Zone content valide

- **GIVEN** une zone avec `layout: "stack"` et un tableau de widgets
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée

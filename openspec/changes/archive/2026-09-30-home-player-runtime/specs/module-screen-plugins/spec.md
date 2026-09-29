## ADDED Requirements

### Requirement: Renderers selon mode vue

`editorPreview` SHALL rester statique. `playerRenderer` SHALL supporter `apercu | jouable | relecture | rejeu`, avec `onComplete` uniquement en jouable/rejeu et sortie triche en apercu.

#### Scenario: Quiz en relecture
- **WHEN** un COMPLETED s'ouvre en relecture
- **THEN** questions visibles sans Valider actif

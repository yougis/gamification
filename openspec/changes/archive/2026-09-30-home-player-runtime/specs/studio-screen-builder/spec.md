## ADDED Requirements

### Requirement: HOME carte nominal sans fuite

HOME-carte SHALL etre declare cas nominal. Une carte dans `global.screen` SHALL ne pas fuiter : une etape sans `content` propre SHALL garder un content neutre documente, jamais la carte globale.

#### Scenario: Etape sans carte heritee
- **WHEN** HOME porte une carte et l'etape n'a pas de content
- **THEN** l'etape n'affiche pas la carte globale

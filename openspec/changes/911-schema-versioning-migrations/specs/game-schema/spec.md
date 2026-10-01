# schema-versioning — delta sur game-schema (change 911)

## ADDED Requirements

### Requirement: schemaVersion requis et migrations

Chaque jeu SHALL porter `schemaVersion` (entier, jeux sans version = v1 implicite). Chaque evolution du schema SHALL livrer une migration pure testee `vN -> vN+1`, enchainables. Le Studio SHALL migrer a l'ouverture (avec sauvegarde et undo quand destructeur) ; le runtime SHALL refuser un jeu de `schemaVersion` superieure a son `minEngineVersion` avec un message clair de mise a jour (code `E_SCHEMA_TOO_NEW`), jamais de lecture partielle.

#### Scenario: Vieux jeu migre
- **GIVEN** un jeu v1 ouvert par un Studio v3
- **WHEN** la migration chainee tourne
- **THEN** le jeu est editable en v3 sans perte, migrations journalisees

#### Scenario: Jeu trop recent refuse
- **GIVEN** un jeu `schemaVersion` 5 ouvert par un runtime supportant jusqu'a 3
- **WHEN** le runtime charge le pack
- **THEN** il refuse avec le message de mise a jour et le code `E_SCHEMA_TOO_NEW`

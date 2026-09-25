## ADDED Requirements

### Requirement: Panneau triche de la coquille PWA

La coquille PWA SHALL offrir un panneau triche regroupant bypass GEOFENCE, `forceDraw` par branche et position simulée. Chaque event simulé SHALL porter visuellement et en journal le flag triche (badge distinct) et SHALL ne jamais ressembler à un event réel. La triche SHALL être une simulation locale : elle ne modifie jamais le JSON source et ne nécessite aucun réseau.

#### Scenario: Bypass débloque sans GPS

- **GIVEN** une PWA sans position GPS (fallback) devant un nœud GEOFENCE
- **WHEN** l'animateur active le bypass GEOFENCE
- **THEN** le nœud devient UNLOCKED comme en présence réelle, chaque event portant le flag triche

#### Scenario: Event simulé distinct du réel

- **WHEN** l'animateur consulte le journal après un `forceDraw`
- **THEN** l'event porte le badge triche et est distinguable des events réels

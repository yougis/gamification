## ADDED Requirements

### Requirement: Validation indoor

Le validateur applicatif SHALL vérifier les règles spécifiques aux jeux indoor :

1. **Exclusion mutuelle** : si `global.indoorPlans` est présent, `global.map` ne doit pas l'être (et inversement). Rejet en couche 2.
2. **planId valide** : tout nœud avec `position.planId` doit référencer un plan existant dans `global.indoorPlans`. Rejet en couche 2.
3. **Cohérence scale** : chaque plan doit avoir `scale > 0`. Rejet en couche 2.
4. **Cohérence origin** : chaque plan doit avoir `origin.lat` dans [-90, 90] et `origin.lng` dans [-180, 180]. Rejet en couche 2.
5. **Nœuds sans activation GPS** : un nœud avec `position` ne doit pas avoir de condition GEOFENCE dans son `activation` (activation indoor = PROXIMITY_MASTER ou autres). Avertissement en couche 2 (pas de rejet).

#### Scenario: Exclusion map + indoorPlans
- **GIVEN** un jeu avec `global.map` ET `global.indoorPlans`
- **WHEN** le validateur applicatif controle
- **THEN** le jeu est rejeté avec erreur "map et indoorPlans mutuellement exclusifs"

#### Scenario: Nœud indoor avec GEOFENCE
- **GIVEN** un jeu indoor avec un nœud ayant `position` ET une condition GEOFENCE
- **WHEN** le validateur applicatif controle
- **THEN** un avertissement est émis (le nœud a une position plan mais une activation GPS)

#### Scenario: Jeu outdoor inchangé
- **GIVEN** un jeu outdoor sans `indoorPlans`
- **WHEN** le validateur applicatif controle
- **THEN** les règles indoor ne s'appliquent pas, le jeu est validé normalement

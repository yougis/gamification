## ADDED Requirements

### Requirement: Regroupement des échecs oneOf en constat unique

Quand une condition d'activation (`requires[i]`) ne matche AUCUNE variante du `oneOf` du schéma (ni GEOFENCE, ni NODE_COMPLETED, ni TIMER, ni POOL_DRAWN, ni PROXIMITY_MASTER, ni CONDITIONAL, ni WINDOW, ni variantes fonctionnelles), le validateur SHALL émettre UN SEUL constat structuré au lieu des erreurs brutes AJV par branche : code dédié, nœud et index fautifs, et le champ manquant le plus probable nommé (ex. `predicate` quand `type: "GEOFENCE"` sans `predicate`, `questions` non concernée — conditions seules). Le constat SHALL passer par le glossaire fermé existant (« déclencheur », jamais « condition ») et proposer l'action « Voir » vers le nœud fautif. Les autres erreurs C1 (forme hors oneOf) SHALL rester inchangées, une par une.

#### Scenario: GEOFENCE sans predicate repliée

- **GIVEN** une étape avec `requires: [{type: "GEOFENCE", lat: 48.01, lng: 2.01, radiusMeters: 30}]` (sans `predicate`)
- **WHEN** la validation couche 1 tourne
- **THEN** un unique constat « Le déclencheur 0 de l'étape ne correspond à aucune variante (manque probablement « predicate »). » est émis avec « Voir », au lieu d'une cinquantaine d'erreurs AJV

#### Scenario: Autres erreurs intactes

- **GIVEN** un jeu avec la condition ci-dessus PLUS un quiz sans question
- **WHEN** la validation tourne
- **THEN** le constat replié coexiste avec l'erreur `questions` (une par une), chacune navigable vers son fautif

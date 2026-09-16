## ADDED Requirements

### Requirement: Vue carte/plan dans le Composer

Le Composer SHALL offrir un toggle entre la vue graphe et la vue carte/plan, visible en permanence dans la barre d'outils. Le toggle SHALL être opérationnel uniquement lorsque le jeu a une configuration de carte (`global.map` pour outdoor) ou de plans (`global.indoorPlans` pour indoor). Sans ces配置, le toggle SHALL être masqué ou désactivé.

La vue carte/plan SHALL supporter les mêmes interactions de sélection et d'édition que la vue graphe : sélection de nœud, undo/redo, édition via l'inspecteur. La sélection de nœud SHALL être synchronisée entre les deux vues (sélectionner un nœud dans la carte le sélectionne aussi dans le graphe).

#### Scenario: Toggle visible avec configuration carte
- **GIVEN** un jeu avec `global.map` configuré
- **WHEN** l'auteur ouvre le Composer
- **THEN** le toggle Carte/Graphe est visible et activé

#### Scenario: Toggle masqué sans configuration
- **GIVEN** un jeu sans `global.map` ni `global.indoorPlans`
- **WHEN** l'auteur ouvre le Composer
- **THEN** le toggle Carte/Graphe est masqué

#### Scenario: Sélection synchronisée carte → graphe
- **GIVEN** le Composer en vue carte avec un nœud sélectionné
- **WHEN** l'auteur bascule vers la vue graphe
- **THEN** le même nœud reste sélectionné dans la vue graphe

### Requirement: Section position dans l'inspecteur

L'inspecteur de nœud SHALL afficher une section `position` pour les nœuds ayant des coordonnées géographiques :
- **Outdoor** : champs `lat` et `lng` (liés à la condition GEOFENCE)
- **Indoor** : champs `planId`, `x`, `y` (liés à `node.position`)

La section position SHALL être placée après la section `activation` dans l'inspecteur. Les champs SHALL être éditables manuellement (saisie directe) ET mis à jour par interaction carte/plan (click/drag).

#### Scenario: Section position outdoor
- **GIVEN** un nœud avec condition GEOFENCE (lat: 48.01, lng: 2.01)
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** une section "Position" affiche les champs lat et lng avec les valeurs actuelles

#### Scenario: Section position indoor
- **GIVEN** un nœud avec position (planId: "plan-rdc", x: 5.0, y: 3.0)
- **WHEN** l'auteur ouvre l'inspecteur du nœud
- **THEN** une section "Position" affiche les champs planId, x et y avec les valeurs actuelles

#### Scenario: Modification manuelle met à jour la carte
- **GIVEN** un nœud avec GEOFENCE (lat: 48.01, lng: 2.01) en vue carte
- **WHEN** l'auteur modifie lat à 48.02 dans l'inspecteur
- **THEN** le marqueur se déplace sur la carte vers la nouvelle position

## ADDED Requirements

### Requirement: HOME carte cas nominal

HOME SHALL pouvoir etre une carte plein ecran + position + points, avec volet (titre + bouton) et retour HOME systematique apres Valider/Abandon. Aller vers ou quitter HOME SHALL ne produire ni transition ni event.

#### Scenario: Parcours carte bouclee
- **WHEN** le joueur valide une etape depuis la carte
- **THEN** il revient sur la carte et peut ouvrir un autre point

### Requirement: Proposition tete de file

A defaut de choix joueur, la tete des eligibles SHALL etre proposee comme ouverture suggeree, sans ouverture auto.

#### Scenario: Suggestion sans auto
- **WHEN** deux points sont UNLOCKED
- **THEN** aucun ne s'ouvre seul et la tete est proposee

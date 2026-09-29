## MODIFIED Requirements

### Requirement: Indicateur d'état des nœuds sur la carte

Les marqueurs de nœuds sur la carte/plan SHALL refléter leur état dans la machine à états :
- `LOCKED` : marqueur gris, désactivé
- `UNLOCKED` : marqueur coloré, prêt (pulsation quand l'écran est ouvert)
- `COMPLETED` : marqueur avec checkmark

L'indicateur d'état SHALL être calculé en temps réel à partir de l'état du jeu (mode preview).

#### Scenario: Nœud completed sur la carte
- **GIVEN** un nœud en état COMPLETED
- **WHEN** l'auteur affiche la vue carte
- **THEN** le marqueur affiche un checkmark vert

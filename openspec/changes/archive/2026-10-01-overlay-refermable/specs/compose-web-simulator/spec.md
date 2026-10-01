## ADDED Requirements

### Requirement: Contrôle de masquage simu systématique

Dans le simulateur, tout overlay affiché SHALL proposer le contrôle de masquage (icône message, badge SIMULÉ), que `fermable` vaille `true` ou non : aucun écran simu SHALL rester bloqué derrière un voile sans sortie. Le masquage SHALL suivre la même sémantique que côté joueur (état conservé en mémoire, reprise = affichée, aucune transition, aucun event).

#### Scenario: Overlay non fermable masquée en simu
- **GIVEN** un écran simu avec overlay sans `fermable` par-dessus une carte en fond
- **WHEN** l'auteur touche le contrôle de masquage puis la carte
- **THEN** l'overlay se masque et la carte panne, sans écriture au JSON

#### Scenario: Réaffichage simu
- **GIVEN** le même écran avec l'overlay masquée
- **WHEN** l'auteur touche l'icône « message »
- **THEN** l'overlay réapparaît avec son état conservé

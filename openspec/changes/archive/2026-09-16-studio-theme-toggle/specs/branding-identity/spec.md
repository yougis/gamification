## MODIFIED Requirements

### Requirement: Studio configuration branding

Le Studio SHALL offrir un panneau de configuration du branding accessible depuis l'éditeur de jeu. Le panneau SHALL permettre de modifier `name`, `primaryColor`, `secondaryColor`, `fontFamily`, et `logo`.

En complément du panneau, le Studio SHALL afficher le `branding.name` comme champ éditable inline dans la barre globale (header), entre le nom de l'écran et les statistiques de nœuds. Le champ SHALL utiliser le même mécanisme `edit` + `setBranding` que le panneau.

Toute modification du branding SHALL garantir un export JSON conforme au schema Draft-07.

#### Scenario: Modification du branding dans le Studio
- **GIVEN** un jeu en édition
- **WHEN** l'auteur modifie `branding.primaryColor` dans le panneau
- **THEN** le JSON exporté contient la nouvelle couleur et passe la validation

#### Scenario: Nom éditable dans la barre globale
- **GIVEN** un jeu en édition avec `branding.name: "Chasse au Trésor"`
- **WHEN** l'auteur modifie le nom dans le champ de la barre globale
- **THEN** `game.branding.name` est mis à jour, le panneau Configuration globale reflète la modification, et le JSON exporté contient le nouveau nom

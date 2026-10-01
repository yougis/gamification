# style-tokens — delta sur branding-identity (change 910)

## ADDED Requirements

### Requirement: Branding par affectation de roles

`branding.primaryColor`/`secondaryColor` SHALL s'interpreter comme affectations des roles d'accent du theme actif (avec valeurs par defaut du theme quand absentes), jamais comme des couleurs collees aux widgets. Les widgets SHALL continuer de consommer les roles, de sorte qu'un changement de theme rebrande sans toucher aux ecrans.

#### Scenario: Rebranding par theme
- **GIVEN** un jeu avec branding pose et deux themes (clair neutre, sombre)
- **WHEN** l'auteur change de theme
- **THEN** les accents suivent le nouveau theme sans modification des widgets

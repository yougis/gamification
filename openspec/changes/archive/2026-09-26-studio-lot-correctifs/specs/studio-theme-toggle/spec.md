## ADDED Requirements

### Requirement: Textes des écrans lisibles sur tout fond et tout thème

Tout texte d'écran sans couleur explicite (canvas WYSIWYG, terminal joueur simulé) SHALL être lisible quel que soit le thème du Studio et le fond de l'écran : sans fond coloré, le texte hérite du thème actif (sombre→clair, clair→sombre) ; sur fond de couleur posée par le jeu (templates `quiz-focus`, puzzle, cadenas, écran par défaut `#1a1a2e`), le texte SHALL prendre une couleur à contraste calculé (fond sombre→texte clair, fond clair→texte sombre). Une couleur explicite posée par l'auteur (widget, branding) SHALL rester verbatim et prime sur tout calcul. Aucun texte d'écran SHALL rester figé sur une couleur codée en dur d'un seul thème.

#### Scenario: Template sombre en thème clair

- **GIVEN** un nœud QUIZ (fond template `#14141f`, textes sans couleur explicite) affiché en thème clair
- **WHEN** le canvas rend l'écran
- **THEN** les textes sont clairs et lisibles sur le fond sombre (pas de texte sombre sur fond sombre)

#### Scenario: Sans fond, suivi du thème

- **GIVEN** un écran sans fond coloré affiché en thème sombre puis clair
- **WHEN** l'auteur bascule de thème
- **THEN** les textes suivent le thème (clairs puis sombres) par héritage

#### Scenario: Couleur auteur conservée

- **GIVEN** un widget texte avec une couleur explicite `#ff4400`
- **WHEN** le canvas rend l'écran sur n'importe quel fond et thème
- **THEN** ce texte garde `#ff4400` (choix auteur), tout le reste suit la règle


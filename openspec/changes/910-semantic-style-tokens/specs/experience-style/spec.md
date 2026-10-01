# style-tokens — delta sur experience-style (change 910)

## ADDED Requirements

### Requirement: Roles de tokens semantiques

Le jeu SHALL exprimer toute couleur/typo/rayon/espacement/relief/mouvement par un role de token (`color.background`, `color.surface`, `color.surfaceVariant`, `color.text.primary|secondary|onAccent|disabled`, `color.accent|hover|border|danger|success`, `font.family.heading|body`, `font.size.scale`, `radius.sm|md|lg`, `spacing.unit`, `elevation.0..3`, `motion.duration.*`), jamais par une valeur litterale dans un widget. Un theme SHALL fournir `{id, version, tokens:{light,dark}, widgetVariants?, assets?}` et l'heritage SHALL suivre `global.theme` -> `screen.theme` -> widget.

#### Scenario: Litteral detecte sans bloquer
- **GIVEN** un widget avec une couleur litterale
- **WHEN** la validation C2 tourne
- **THEN** un avertissement nomme le widget (export reste possible apres confirmation)

### Requirement: Mode sombre par selection

Le mode sombre SHALL selectionner `tokens.dark` du theme actif. Aucun texte SHALL rester illisible apres bascule (contraste >= 4,5 pour texte normal, verifie par le test visuel clair/sombre des jeux de reference).

#### Scenario: Bascule verifiee
- **WHEN** le test visuel tourne sur `sherlock-holmes` en clair et en sombre
- **THEN** chaque texte affiche un contraste >= 4,5 dans les deux modes

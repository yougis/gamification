## ADDED Requirements

### Requirement: Strate fond et strate flottante

Un écran MAY déclarer un widget `pleinEcran` en strate FOND (arrière-plan interactif) ; les widgets des zones header/content/footer se rendent alors en strate FLOTTANTE par-dessus, la zone overlay restant au sommet comme aujourd'hui. La strate fond SHALL occuper tout le cadre téléphone ; la strate flottante SHALL laisser voir le fond dans les creux (conteneur transparent sauf sur les widgets eux-mêmes, qui restent sélectionnables et éditables). Sans déclaration de fond, le rendu SHALL rester strictement identique à l'actuel (aucune superposition).

#### Scenario: Carte en fond, texte par-dessus

- **GIVEN** un écran avec un widget carte `pleinEcran` en strate fond et un widget texte en content
- **WHEN** le canvas affiche l'écran
- **THEN** la carte remplit le cadre, le texte flotte par-dessus lisible, et les zones vides laissent voir la carte

#### Scenario: Sans fond déclaré, inchangé

- **GIVEN** un écran sans strate fond déclarée
- **WHEN** le canvas affiche l'écran
- **THEN** zones empilées en flux comme aujourd'hui, sans superposition ni changement visuel

### Requirement: Sélection de calque auteur

Le Studio SHALL offrir un sélecteur de calque (fond / flottant / overlay, même pattern que l'œil de la surimpression) permettant de basculer la sélection et l'édition entre strates superposées, chaque strate restant masquable/isolable sans modifier le JSON. Le calque actif SHALL être signalé visuellement ; les calques non actifs SHALL rester visibles en arrière-plan.

#### Scenario: Édition du texte sur fond carte

- **GIVEN** un écran avec carte en fond et texte flottant, calque flottant actif
- **WHEN** l'auteur clique le texte
- **THEN** le texte est sélectionné et éditable, la carte reste visible derrière sans intercepter le clic

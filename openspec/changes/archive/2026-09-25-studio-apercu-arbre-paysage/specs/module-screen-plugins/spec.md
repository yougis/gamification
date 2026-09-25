## MODIFIED Requirements

### Requirement: Aperçu éditeur (editorPreview)

L'`editorPreview` SHALL afficher un aperçu statique et non interactif du module dans le canvas WYSIWYG. L'aperçu SHALL montrer la structure visuelle du module (ex. pour QUIZ : une question avec des options) sans interaction possible. L'aperçu SHALL être cliquable pour sélectionner le widget dans le canvas.

L'aperçu SHALL rendre visuellement les images configurées du module (image puzzle découpée, source 7-erreurs avec zones, marqueur et fallback RA, QCM avec vignettes) : l'auteur SHALL voir le rendu de l'image importée sans ouvrir le panneau de propriétés. L'aperçu SHALL NE contenir aucune mécanique de mini-jeu : aucun déplacement de tuile, aucun clic de validation d'erreur, aucun état de jeu (score, essais, sélection) ne SHALL exister dans le canvas auteur — la mécanique vit exclusivement dans le `playerRenderer`.

L'aperçu SHALL s'adapter à la taille disponible dans la zone content du screen. Si le module n'a pas de données (ex. quiz sans questions configurées), l'aperçu SHALL afficher un état vide avec un message incitatif.

#### Scenario: Quiz avec questions

- **GIVEN** un module QUIZ avec 5 questions configurées
- **WHEN** le canvas affiche l'aperçu du QUIZ
- **THEN** l'aperçu montre un aperçu d'une question avec des options

#### Scenario: Quiz sans questions

- **GIVEN** un module QUIZ sans question configurée
- **WHEN** le canvas affiche l'aperçu du QUIZ
- **THEN** l'aperçu affiche "Aucune question configurée — cliquez pour ajouter"

#### Scenario: Image importée rendue sans mécanique

- **GIVEN** un module PUZZLE avec image source et découpe 3×3
- **WHEN** le canvas affiche l'aperçu du module
- **THEN** l'image découpée est visible et aucune tuile ne peut être déplacée ni sélectionnée

#### Scenario: Écran de recherche d'erreur rendu sans clic

- **GIVEN** un module DIFFERENCE_GAME avec source et zones tracées
- **WHEN** le canvas affiche l'aperçu du module
- **THEN** la source et les zones sont visibles et aucun clic ne déclenche de validation

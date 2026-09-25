## ADDED Requirements

### Requirement: Découpage en sous-pages explicites

La zone content SHALL se découper en sous-pages visibles par l'auteur : chaque widget `module` ou `image` SHALL ouvrir une nouvelle sous-page (sauf s'il est le premier widget de la zone) ; les widgets `text`, `button`, `progress` et `spacer` SHALL appartenir à la sous-page courante. Une sous-page SHALL contenir au plus un média (`module`/`image`) : un module ne partage jamais sa page avec un autre média, le texte d'accompagnement restant avec lui. Un contenu sans widget `module`/`image` SHALL former une seule sous-page (compatibilité ascendante).

#### Scenario: Ajout d'image créant une page

- **GIVEN** une zone content avec un widget `module` seul (1 sous-page)
- **WHEN** l'auteur ajoute un widget `image` après le module
- **THEN** une 2e sous-page apparaît avec l'image, la 1re garde le module, comme l'ajout d'une question au quiz

#### Scenario: Texte d'accompagnement avec son média

- **GIVEN** une zone content avec [texte, module, texte, image]
- **WHEN** le découpage s'applique
- **THEN** les sous-pages sont [texte], [module, texte] et [image] : un seul média par page

#### Scenario: Contenu sans média inchangé

- **GIVEN** une zone content avec uniquement des widgets `text` et `button`
- **WHEN** le découpage s'applique
- **THEN** une seule sous-page existe et le rendu est identique à avant

### Requirement: Prévisualisation active dans le canvas

Le canvas SHALL afficher la sous-page courante avec onglets ou pastilles de navigation et boutons Suivant/Précédent visibles (comme le prévisualisateur). L'auteur SHALL pouvoir naviguer entre sous-pages par clic ou swipe (état local d'édition, jamais persisté). La sélection de widget SHALL suivre la sous-page affichée.

#### Scenario: Navigation entre sous-pages en construction

- **GIVEN** un écran de 3 sous-pages affiché en canvas, sous-page 1 visible
- **WHEN** l'auteur touche « Suivant »
- **THEN** la sous-page 2 s'affiche avec ses widgets sélectionnables, le JSON est inchangé

### Requirement: Fit par type, portrait et paysage

Les widgets `image` et `module` SHALL se rendre en entier dans le viewport (canvas comme joueur) : réduction à la taille disponible en respectant le ratio H/L, jamais de rognage. Le widget `text` long SHALL garder le défilement vertical. La règle SHALL s'appliquer aux 4 viewports (portrait et paysage).

#### Scenario: Image panoramique en viewport portrait

- **GIVEN** une image 2:1 dans un viewport téléphone portrait
- **WHEN** la sous-page s'affiche
- **THEN** l'image est visible en entier (bandes éventuelles, ratio conservé), sans rognage ni scroll horizontal

#### Scenario: Minijeu en viewport paysage

- **GIVEN** un module PUZZLE dans un viewport téléphone paysage
- **WHEN** la sous-page s'affiche
- **THEN** le minijeu tient intégralement dans le cadre réduit, ratio conservé

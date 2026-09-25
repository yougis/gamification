## ADDED Requirements

### Requirement: Aperçu éditeur puzzle en tuiles mélangées

L'`editorPreview` du PUZZLE SHALL montrer l'image source réellement découpée en `tileRows` × `tileCols` tuiles (fonds positionnés pour reconstituer l'image) affichées dans un ordre mélangé aléatoire, avec le compteur de pièces, au lieu d'une grille numérotée. L'aperçu SHALL rester statique et non interactif. Sans image source, l'état vide incitatif existant SHALL être conservé.

#### Scenario: Aperçu mélangé

- **GIVEN** un PUZZLE avec image source et découpe 3×3
- **WHEN** le canvas affiche l'aperçu
- **THEN** 9 tuiles d'image sont visibles dans un ordre mélangé (pas 1 à 9 en ordre)

#### Scenario: Aperçu sans image inchangé

- **GIVEN** un PUZZLE sans image source
- **WHEN** le canvas affiche l'aperçu
- **THEN** l'état vide « aucune image — cliquez pour configurer » s'affiche

### Requirement: Plugin CODE_INPUT comme référence cadenas

Le screenPlugin du module CODE_INPUT SHALL servir de deuxième référence (après QUIZ) avec :
- Un defaultScreen content-only portant le ModuleWidget (zoneNeeds content uniquement).
- Un editorPreview affichant un cadenas générique dessiné en CSS/SVG (aucun asset) avec le code masqué et le nombre d'essais.
- Un propertiesPanel reprenant le formulaire du module (code attendu, longueur, indice, essais via défauts globaux) plus les 9 familles de l'Inspecteur.
- Un playerRenderer affichant le cadenas, le pavé de saisie et la vérification, avec les accents du branding résolu.
- Des customizableStyles pour backgroundColor et textColor.

L'ajout NE SHALL pas modifier le schéma Noeuds/Liens ; seul le registre gagne la propriété `screenPlugin` sur l'entrée CODE_INPUT existante.

#### Scenario: Nœud CODE_INPUT dans le WYSIWYG

- **GIVEN** un nœud avec le module CODE_INPUT
- **WHEN** l'auteur l'ouvre dans le canvas
- **THEN** un cadenas s'affiche (pas un placeholder générique) et le panneau propose code, indice et essais

#### Scenario: Cadenas sans asset

- **GIVEN** un jeu sans aucun asset image
- **WHEN** le cadenas CODE_INPUT s'affiche (éditeur ou joueur)
- **THEN** le rendu est complet sans requête réseau ni fichier du pack

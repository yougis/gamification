## MODIFIED Requirements

### Requirement: Plugin 7-erreurs avec tracé de polygones

Le screenPlugin du module DIFFERENCE_GAME SHALL fournir : un `ImagePicker` pour `source`, un pour `derivee`, le champ `touchDilatation` (minimum 44 px rappelé), et un traceur de zones sur l'image source affichée à son ratio réel (dimensions naturelles, jamais de cadre imposé). Le traceur SHALL offrir deux outils : rectangle (clic-glissé, minimum 1 %) et polygone (clic = ajout d'un sommet en %, fermeture = zone d'au moins 3 points), avec liste des zones et suppression par zone. L'`editorPreview` SHALL montrer la source au même ratio avec les deux formes superposées. Les zones SHALL rester exprimées en % (responsive) comme au schéma.

#### Scenario: Zone tracée au clic

- **GIVEN** un 7-erreurs avec image source et 0 zone
- **WHEN** l'auteur clique 4 points sur l'image puis ferme le polygone
- **THEN** une zone en % est ajoutée à `module.data.polygons` et affichée en overlay

#### Scenario: Images manquantes signalées

- **GIVEN** un 7-erreurs sans `source`
- **WHEN** l'auteur ouvre le panneau
- **THEN** un appel explicite à déposer les deux images s'affiche (pas de rejet silencieux)

#### Scenario: Aperçu non déformé

- **GIVEN** une image source carrée (1:1) et une zone en bas à droite
- **WHEN** l'aperçu s'affiche dans un volet étroit
- **THEN** l'image reste carrée en taille réduite et la zone couvre toujours le même détail (jamais étirée en 16:9)

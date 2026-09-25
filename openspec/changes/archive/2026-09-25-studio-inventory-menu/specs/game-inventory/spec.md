## MODIFIED Requirements

### Requirement: Objet du jeu

Chaque objet dans l'inventaire SHALL être défini dans le JSON du jeu avec les propriétés suivantes :
- `id` (string unique dans le jeu)
- `name` (string, nom affiché au joueur)
- `icon` (string optionnel, référence à un asset visuel — pictogramme de la boîte à outils)
- `image` (string optionnel, référence à un asset du pack — illustration grande de la fiche objet)
- `description` (string optionnel)
- `consumable` (booléen, défaut `false`)
- `stackable` (booléen, défaut `true`)

Toutes ces propriétés SHALL être éditables après création (aucune n'est figée à la naissance de l'objet). La définition de l'objet SHALL être lue depuis le JSON du jeu, jamais codée en dur.

#### Scenario: Définition d'objet dans le JSON
- **GIVEN** un jeu avec un objet défini dans le JSON
- **WHEN** le moteur charge le jeu
- **THEN** l'objet est disponible dans le registre de l'inventaire

#### Scenario: Objet avec image
- **GIVEN** un objet avec `icon: "assets/cle.svg"` et `image: "assets/cle-grande.png"`
- **WHEN** le joueur ouvre la fiche de l'objet
- **THEN** la grande illustration s'affiche, tandis que la boîte à outils garde le pictogramme

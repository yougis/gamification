## ADDED Requirements

### Requirement: Import d'objet depuis le catalogue

L'écran Inventaire SHALL proposer « Importer depuis le catalogue » : l'auteur SHALL choisir un jeu publié (liste du catalogue), puis un objet de ce jeu, puis valider la copie. En cas de collision d'`id`, un nouvel `id` SHALL être proposé (`id-importé`) avant validation, jamais écrasé silencieusement. L'import SHALL passer par une opération MCP nommée et journalisée.

#### Scenario: Import sans collision
- **GIVEN** l'écran Inventaire et le jeu « Chasse » publié avec l'objet `boussole-antique`
- **WHEN** l'auteur importe `boussole-antique`
- **THEN** l'objet apparaît à l'identique (nom, description, réglages) avec son icône ré-enregistrée au manifest

#### Scenario: Collision d'identifiant
- **GIVEN** le jeu courant contenant déjà `cle`
- **WHEN** l'auteur importe `cle` depuis un autre jeu
- **THEN** `cle-importé` est proposé, modifiable avant validation, l'objet d'origine est intact

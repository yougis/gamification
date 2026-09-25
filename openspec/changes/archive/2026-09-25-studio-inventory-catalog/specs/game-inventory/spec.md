## ADDED Requirements

### Requirement: Objet importé avec provenance et asset

Un objet importé depuis un autre jeu SHALL conserver la provenance d'origine (`providerId`, licence, `sourceUrl` référençant le jeu source) dans les métas du Studio, et son `icon`/`image` SHALL être ré-enregistrée comme asset du pack courant (nouvelle entrée manifest avec son SHA-256, jamais de référence vers le pack source). Après import, l'objet SHALL être validé et référençable exactement comme un objet natif.

#### Scenario: Traçabilité conservée
- **GIVEN** un objet importé du jeu « Chasse »
- **WHEN** l'auteur ouvre la relecture
- **THEN** la provenance affiche le jeu source et sa licence, et l'export inclut l'asset dans le pack courant

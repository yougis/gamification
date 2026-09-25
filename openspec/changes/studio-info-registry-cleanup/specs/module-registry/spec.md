## ADDED Requirements

### Requirement: Types proposés sans doublon depuis le registre

La liste des types de modules proposés à la création d'une étape SHALL dériver des entrées du registre (plus `RANDOM_POOL` structurel, hors registre par nature) et SHALL contenir chaque type exactement une fois. Aucune liste fermée codée en dur dans l'UI SHALL diverger du registre : l'enregistrement d'un nouveau type l'y fait apparaître, sans autre retouche.

#### Scenario: INFO enregistré une seule fois

- **GIVEN** le registre contenant `INFO` (entre autres types)
- **WHEN** l'auteur ouvre le sélecteur de mini-jeu à la création
- **THEN** « Info » n'apparaît qu'une fois, et React n'émet aucun avertissement de clé dupliquée

#### Scenario: Nouveau type sans retouche UI

- **GIVEN** un 8e type enregistré au registre
- **WHEN** l'auteur ouvre le sélecteur de mini-jeu
- **THEN** le nouveau type y figure sans modification du code du sélecteur

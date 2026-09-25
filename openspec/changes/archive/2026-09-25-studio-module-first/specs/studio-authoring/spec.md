## ADDED Requirements

### Requirement: Création d'étape avec choix du module premier

Le choix du Module mini-jeu SHALL être le premier choix à la création d'une étape : l'auteur SHALL sélectionner le type de Module (parmi les types du registre, jamais une liste fermée en dur) avant toute composition d'écran. Le Nœud créé SHALL porter le `screen` issu du `defaultScreen` du Module choisi, avec un widget `{ type: "module" }` présent dans la zone content dès la création.

#### Scenario: Création avec module choisi

- **GIVEN** l'auteur crée une étape en choisissant le module PUZZLE
- **WHEN** l'étape est créée
- **THEN** son écran affiche le content par défaut du PUZZLE avec le widget du mini-jeu, sans action supplémentaire

#### Scenario: Création avec type sans plugin

- **GIVEN** l'auteur crée une étape en choisissant le module INFO (sans screenPlugin)
- **WHEN** l'étape est créée
- **THEN** son écran contient un widget `{ type: "module" }` générique dans la zone content

### Requirement: Changement de type de mini-jeu destructif

Changer le type du Module d'un Nœud via le dropdown « Mini-jeu » de la famille épreuve SHALL afficher un message indiquant que les modifications seront perdues et SHALL exiger une confirmation explicite. Sur confirmation, les `module.data` SHALL être détruites et seule la zone content SHALL être remplacée ; sur refus, le Nœud SHALL rester strictement inchangé.

#### Scenario: Changement confirmé

- **GIVEN** un Nœud QUIZ avec questions et content customisé
- **WHEN** l'auteur choisit PUZZLE dans le dropdown et confirme le message « modifications perdues »
- **THEN** les data du QUIZ sont détruites, les data par défaut du PUZZLE sont appliquées, et seule la zone content est remplacée (header/footer préservés)

#### Scenario: Changement refusé

- **GIVEN** un Nœud QUIZ avec questions
- **WHEN** l'auteur choisit PUZZLE dans le dropdown mais refuse la confirmation
- **THEN** le Nœud reste QUIZ avec ses data et son screen inchangés

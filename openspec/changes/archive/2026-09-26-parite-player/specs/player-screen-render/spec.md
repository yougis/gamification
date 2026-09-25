## Purpose

Rendre dans le player partagé (les 3 canaux) les écrans composés dans le Studio, afin que le joueur voie l'habillage auteur au lieu d'une liste d'étapes générique.

## ADDED Requirements

### Requirement: Écran effectif résolu global vers nœud

Le player SHALL parser `node.screen` et `global.screen` (miroir du schéma Draft-07, champs optionnels). L'écran effectif d'un nœud SHALL être : son `screen` s'il est défini, sinon `global.screen`, sinon un écran par défaut (fond uni, zone content-only). Les zones SHALL fusionner par nom (une zone définie au nœud remplace celle du global, les autres sont héritées). Les styles SHALL se résoudre par héritage global → écran → widget, chaque niveau ne surchargeant que les propriétés renseignées.

#### Scenario: Nœud sans screen hérite du global

- **WHEN** un nœud sans `screen` est affiché dans un jeu avec `global.screen`
- **THEN** le joueur voit le fond, les zones et les styles du global

#### Scenario: Jeu sans aucun screen

- **WHEN** un jeu sans `screen` ni global ni nœud est joué (compatibilité ascendante)
- **THEN** chaque nœud s'affiche avec l'écran par défaut, sans erreur

### Requirement: Rendu des zones et widgets

L'écran du nœud ACTIVE SHALL être rendu avec ses zones (header, content, footer, overlay) et leurs widgets : texte (avec style résolu), image (asset du pack, jamais réseau), bouton (libellé + action), progression, espacement. Le widget `{ type: "module" }` SHALL afficher le renderer du module du nœud avec les données du jeu et le branding résolu. Un module sans renderer SHALL afficher un état explicite non bloquant (terminer/abandonner par triche).

#### Scenario: Écran quiz-focus complet

- **WHEN** le joueur ouvre un nœud ACTIVE avec header (titre), content (texte + module QUIZ) et footer
- **THEN** les trois zones s'affichent avec le quiz interactif, la validation du quiz fait progresser la partie comme sans écran

#### Scenario: Module sans renderer non bloquant

- **WHEN** le joueur ouvre un nœud ACTIVE dont le module n'a pas de renderer joueur
- **THEN** un état explicite propose terminer/abandonner et la partie continue

### Requirement: Ouverture par type de module

Tout nœud ACTIVE SHALL s'ouvrir selon le type de son module (via le registre, jamais de liste fermée) : QUIZ, PUZZLE, INFO, CODE_INPUT et suivants. Un type inconnu SHALL dégrader le nœud avec message, jamais crasher le jeu.

#### Scenario: Nœud INFO jouable

- **WHEN** le joueur touche un nœud INFO ACTIVE
- **THEN** son écran (récit paginé) s'ouvre au lieu de rester sur la liste

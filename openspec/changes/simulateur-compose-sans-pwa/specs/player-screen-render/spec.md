## MODIFIED Requirements

### Requirement: Rendu des zones et widgets

L'écran d'un nœud ouvert (`UNLOCKED`, écran affiché) SHALL être rendu avec ses zones (header, content, footer, overlay) et leurs widgets : texte (avec style résolu), image (asset du pack, jamais réseau), bouton (libellé + action), progression, espacement. Le widget `{ type: "module" }` SHALL afficher le renderer du module du nœud avec les données du jeu et le branding résolu. Un module sans renderer SHALL afficher un état explicite non bloquant (terminer/abandonner par triche).

#### Scenario: Écran quiz-focus complet

- **WHEN** le joueur ouvre un nœud `UNLOCKED` avec header (titre), content (texte + module QUIZ) et footer
- **THEN** les trois zones s'affichent avec le quiz interactif, la validation du quiz fait progresser la partie comme sans écran

#### Scenario: Module sans renderer non bloquant

- **WHEN** le joueur ouvre un nœud `UNLOCKED` dont le module n'a pas de renderer joueur
- **THEN** un état explicite propose terminer/abandonner et la partie continue

### Requirement: Ouverture par type de module

Tout nœud ouvert SHALL s'ouvrir selon le type de son module (via le registre, jamais de liste fermée) : QUIZ, PUZZLE, INFO, CODE_INPUT et suivants. Un type inconnu SHALL dégrader le nœud avec message, jamais crasher le jeu.

#### Scenario: Nœud INFO jouable

- **WHEN** le joueur touche un nœud INFO `UNLOCKED`
- **THEN** son écran (récit paginé) s'ouvre au lieu de rester sur la liste

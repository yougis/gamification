# sherlock-holmes Specification

## Purpose

Habiller le jeu de démonstration Sherlock Holmes avec des écrans WYSIWYG et
des images embarquées, pour prouver de bout en bout la chaîne auteur vers jeu
jouable offline tout en gardant le jeu valide, exportable et fonctionnellement
inchangé.

## Requirements

### Requirement: Écran global du jeu

Le jeu SHALL déclarer `global.screen` comme template de base de tous ses
Nœuds, aux couleurs de son branding (`#8B0000` / `#DAA520`, police Georgia)
lus depuis le JSON du jeu, avec des styles globaux (`fontFamily`, `fontSize`,
`color`) dont héritent les écrans des Nœuds puis leurs widgets.

#### Scenario: Nœud sans screen hérite du global

- **GIVEN** le jeu avec `global.screen` déclaré et un Nœud sans `screen`
- **WHEN** le moteur résout l'écran du Nœud
- **THEN** le Nœud affiche le fond, les zones et les styles du global

### Requirement: Écran par Nœud joueur

Chaque Nœud joueur du jeu (start, baker, scotland, strand, stbarts, holmes,
moriarty, fin) SHALL déclarer un `node.screen` conforme à ScreenDefinition
(Draft-07) : un `layout` issu des templates embarqués, un `background`, et
des zones `header`/`content`/`footer` peuplées de widgets `text` (titres et
textes d'ambiance de l'enquête) et d'un widget `module` portant le Module du
Nœud (QUIZ, PUZZLE, CODE_INPUT, BOUSSOLE, AR_MARKER, DIFFERENCE_GAME, INFO).
Le Nœud structurel `pool` (RANDOM_POOL, jamais ACTIVE) SHALL rester sans
screen et utiliser l'écran par défaut.

#### Scenario: Nœud QUIZ avec écran quiz-focus

- **GIVEN** le Nœud `baker` (Module QUIZ) avec `screen.layout: "quiz-focus"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le Nœud est accepté et son Module reste rendu dans la zone content

#### Scenario: Pool sans écran

- **GIVEN** le Nœud `pool` (RANDOM_POOL) sans `screen`
- **WHEN** le moteur charge le jeu
- **THEN** le pool se résout sans écran joueur et le tirage reste persisté

### Requirement: Images embarquées et widgets image

Chaque écran de Nœud SHALL afficher au moins un widget `image` dont le `src`
référence un asset du pack (`assets/…`). Les assets existants SHALL être
réutilisés (baker-street, scotland-yard, marqueur et fallback Holmes, icônes
d'objets) et de nouveaux assets SHALL être créés pour les Nœuds sans visuel
(baker, strand, stbarts, moriarty, fin). Toute image référencée SHALL être
enregistrée au manifest du pack (`path`, `size`, `sha256`) ; aucune image ne
SHALL être chargée depuis le réseau pendant le jeu (offline-first).

#### Scenario: Widget image vers asset du pack

- **GIVEN** un widget `{ type: "image", src: "assets/baker-street.jpg" }`
  sur le Nœud `start` et l'entrée correspondante au manifest avec son SHA-256
- **WHEN** le joueur ouvre le Nœud offline
- **THEN** l'image s'affiche depuis les fichiers locaux

#### Scenario: Image hors-pack refusée

- **GIVEN** un widget image référençant une URL réseau ou un fichier absent
  du manifest
- **WHEN** l'export du pack tourne
- **THEN** l'export est refusé avec le fichier fautif nommé

### Requirement: Données modules complétées pour la jouabilité

Les `module.data` SHALL porter les champs requis pour jouer chaque étape :
le Nœud `moriarty` (DIFFERENCE_GAME) SHALL déclarer `source` et `derivee`
vers les nouveaux assets (les polygones `%` existants restant inchangés) et
le Nœud `scotland` (PUZZLE) SHALL déclarer son découpage `tileRows` ×
`tileCols` (2 à 6) pour son image existante. Les autres Modules (QUIZ,
CODE_INPUT, BOUSSOLE, AR_MARKER) conservent leurs `data` actuels.

#### Scenario: Moriarty jouable en 7-différences

- **GIVEN** `moriarty` avec `source`, `derivee` et ses polygones
- **WHEN** le joueur atteint le Nœud avec la poudre consommée
- **THEN** les deux images s'affichent et les zones tactiles sont validées

#### Scenario: Puzzle découpé

- **GIVEN** `scotland` avec `tileRows: 3, tileCols: 3`
- **WHEN** le Module démarre
- **THEN** 9 pièces sont mélangées et la complétion exige les 9 bien placées

### Requirement: Validité, export et jouabilité préservés

Après habillage, le jeu SHALL rester accepté par la validation double couche
(Draft-07 forme, puis applicative : cycles, atteignabilité d'un `isEnding`
sous hypothèse d'environnement favorable, AND-sur-branches-exclusives,
pools, cohérence HOLD) et SHALL rester exportable en pack offline
(manifest SHA-256 par fichier vérifié). Le graphe (activation, effets,
inventaire, pools, terminaison) SHALL être inchangé : seule la présentation
(screens, widgets, images, `data` de jouabilité ci-dessus) évolue.

#### Scenario: Non-régression validation

- **GIVEN** le jeu habillé (screens + images + manifest régénéré)
- **WHEN** les couches 1 puis 2 tournent
- **THEN** les deux passent avec 0 erreur, comme la baseline avant habillage

#### Scenario: Partie de bout en bout

- **GIVEN** le pack exporté et vérifié fichier par fichier
- **WHEN** le joueur joue start → tirage → branche → fin offline
- **THEN** chaque état suit `LOCKED → UNLOCKED → ACTIVE → COMPLETED` et
  chaque écran de Nœud s'affiche avec ses widgets et images

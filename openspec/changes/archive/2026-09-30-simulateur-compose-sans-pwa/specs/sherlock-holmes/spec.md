## MODIFIED Requirements

### Requirement: Écran par Nœud joueur

Chaque Nœud joueur du jeu (start, baker, scotland, strand, stbarts, holmes,
moriarty, fin) SHALL déclarer un `node.screen` conforme à ScreenDefinition
(Draft-07) : un `layout` issu des templates embarqués, un `background`, et
des zones `header`/`content`/`footer` peuplées de widgets `text` (titres et
textes d'ambiance de l'enquête) et d'un widget `module` portant le Module du
Nœud (QUIZ, PUZZLE, CODE_INPUT, BOUSSOLE, AR_MARKER, DIFFERENCE_GAME, INFO).
Le Nœud structurel `pool` (RANDOM_POOL, jamais ouvert comme étape) SHALL rester sans
screen et utiliser l'écran par défaut.

#### Scenario: Nœud QUIZ avec écran quiz-focus

- **GIVEN** le Nœud `baker` (Module QUIZ) avec `screen.layout: "quiz-focus"`
- **WHEN** la validation Draft-07 tourne
- **THEN** le Nœud est accepté et son Module reste rendu dans la zone content

#### Scenario: Pool sans écran

- **GIVEN** le Nœud `pool` (RANDOM_POOL) sans `screen`
- **WHEN** le moteur charge le jeu
- **THEN** le pool se résout sans écran joueur et le tirage reste persisté

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
- **THEN** chaque état suit `LOCKED → UNLOCKED → COMPLETED` et
  chaque écran de Nœud s'affiche avec ses widgets et images

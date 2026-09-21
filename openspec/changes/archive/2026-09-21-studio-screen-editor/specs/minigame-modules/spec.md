## MODIFIED Requirements

### Requirement: QUIZ avec temps interne

`QUIZ` SHALL porter questions, options, index correct, explication, points,
`timeLimitSeconds` + `onTimeout` (validation interne, jamais condition graphe).
Chaque option SHALL pouvoir être texte et/ou image (`{ text?: string, image?: string }`, au moins l'un des deux requis) ; une question SHALL porter 2 à 6 options et désigner exactement une bonne réponse.
`QUIZ` SHALL porter `maxAttempts` (entier ≥ 1) : au-delà, le module applique `onTimeout`.
L'auto-validation triche SHALL être traçée par flag.

#### Scenario: Timeout module sans toucher le graphe
- **GIVEN** un Quiz `timeLimitSeconds:30` non répondu à temps
- **WHEN** le délai expire
- **THEN** le module applique `onTimeout`, le Nœud reste `ACTIVE` jusqu'à sa décision

#### Scenario: QCM avec réponses images
- **GIVEN** un Quiz dont une question porte 4 options dont 2 avec `image`
- **WHEN** le module s'affiche
- **THEN** les 4 options sont rendues (texte et/ou vignettes) et une seule est valide

#### Scenario: Essais épuisés
- **GIVEN** un Quiz `maxAttempts:2` avec 2 mauvaises réponses données
- **WHEN** le joueur échoue une 2e fois
- **THEN** le module applique `onTimeout` comme à l'expiration du temps

### Requirement: PUZZLE tactile et clavier

`PUZZLE` SHALL porter image + découpage + configuration, jouable au tactile et
au clavier (accessibilité de base), progression sauvegardée en SQLite.
Le découpage SHALL être exprimé en lignes × colonnes (`tileRows`, `tileCols`, entiers 2 à 6) ; le nombre de pièces SHALL égaler lignes × colonnes.
`PUZZLE` SHALL porter `maxAttempts` (entier ≥ 1) et `timeLimitSeconds` (entier ≥ 0, 0 = illimité), résolus via les défauts globaux sauf surcharge locale.

#### Scenario: Reprise puzzle
- **GIVEN** un puzzle à moitié fait puis app tuée
- **WHEN** le joueur rouvre le Nœud
- **THEN** l'état est restauré depuis SQLite

#### Scenario: Puzzle 3×3
- **GIVEN** un PUZZLE avec `tileRows:3, tileCols:3`
- **WHEN** le module démarre
- **THEN** 9 pièces sont mélangées et la complétion exige les 9 bien placées

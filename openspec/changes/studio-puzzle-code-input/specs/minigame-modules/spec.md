## MODIFIED Requirements

### Requirement: PUZZLE tactile et clavier

`PUZZLE` SHALL porter image + découpage + configuration, jouable au tactile et
au clavier (accessibilité de base), progression sauvegardée en SQLite.
Le découpage SHALL être exprimé en lignes × colonnes (`tileRows`, `tileCols`, entiers 2 à 6) ; le nombre de pièces SHALL égaler lignes × colonnes.
`PUZZLE` SHALL porter `maxAttempts` (entier ≥ 1) et `timeLimitSeconds` (entier ≥ 0, 0 = illimité), résolus via les défauts globaux sauf surcharge locale.
Au démarrage, les pièces SHALL être mélangées aléatoirement (jamais déjà résolu, sauf cas trivial 1 pièce exclu par les bornes).
Le déplacement des tuiles SHALL suivre `module.data.mode` : `slide` (tap-à-tap : sélectionner une tuile puis une destination, échange des deux) ou `drag` (glisser-déposer direct) ; à défaut de `mode`, `slide` SHALL s'appliquer.
La complétion SHALL exiger toutes les pièces bien placées et SHALL appeler `onComplete` ; essais épuisés ou temps écoulé SHALL appliquer `onTimeout` comme les autres mini-jeux.

#### Scenario: Reprise puzzle

- **GIVEN** un puzzle à moitié fait puis app tuée
- **WHEN** le joueur rouvre le Nœud
- **THEN** l'état est restauré depuis SQLite

#### Scenario: Puzzle 3×3

- **GIVEN** un PUZZLE avec `tileRows:3, tileCols:3`
- **WHEN** le module démarre
- **THEN** 9 pièces sont mélangées et la complétion exige les 9 bien placées

#### Scenario: Déplacement slide par échange

- **GIVEN** un PUZZLE en `mode: "slide"` avec 2 tuiles mal placées
- **WHEN** le joueur tape la première puis la seconde
- **THEN** les deux tuiles sont échangées et la complétion est réévaluée

#### Scenario: Déplacement drag

- **GIVEN** un PUZZLE en `mode: "drag"`
- **WHEN** le joueur glisse une tuile sur une autre position
- **THEN** la tuile suit le pointeur puis s'ancre, et la complétion est réévaluée

#### Scenario: Complétion du puzzle

- **GIVEN** un PUZZLE dont la dernière tuile mal placée vient d'être posée
- **WHEN** la grille est complète
- **THEN** `onComplete` est appelé et le Nœud peut passer COMPLETED

## ADDED Requirements

### Requirement: CODE_INPUT cadenas

`CODE_INPUT` SHALL porter `code` (chaîne attendue non vide), `maxAttempts` (entier ≥ 1) et `timeLimitSeconds` (entier ≥ 0, 0 = illimité), résolus via les défauts globaux sauf surcharge locale, plus un `hint` optionnel et des messages `successMessage` / `failureMessage` optionnels.
La mécanique SHALL être : pavé de saisie (clavier + boutons tactiles 0-9/A-Z selon le code), vérification à la validation, succès → `onComplete`, échec → essais décrémentés, essais épuisés ou temps écoulé → `onTimeout` comme les autres mini-jeux.
Le sous-schéma `code-input.json` SHALL imposer `code` non vide et `additionalProperties: false`, monté en AJV comme les 5 schémas socle sans toucher au schéma racine.
Le validateur applicatif SHALL rejeter un module CODE_INPUT sans `code` (symétrique de la règle condition existante).

#### Scenario: Code correct

- **GIVEN** un module CODE_INPUT avec `code: "1947"`
- **WHEN** le joueur saisit « 1947 » et valide
- **THEN** le succès est affiché et `onComplete` est appelé

#### Scenario: Code incorrect puis épuisement

- **GIVEN** un module CODE_INPUT avec `code: "1947"` et `maxAttempts: 2`
- **WHEN** le joueur échoue 2 fois
- **THEN** `onTimeout` est appliqué comme à l'expiration du temps

#### Scenario: Module sans code rejeté

- **GIVEN** un module CODE_INPUT sans `code`
- **WHEN** la validation tourne
- **THEN** le jeu est rejeté avec le nœud fautif nommé

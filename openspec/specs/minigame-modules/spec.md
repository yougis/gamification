# minigame-modules Specification

## Purpose

Donne aux 5 modules socle des contrats rendables, validables et dégradables, prouvant que le registre s'étend sans toucher au graphe.

## Requirements

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

### Requirement: 7-erreurs polygones + dilatation

`DIFFERENCE_GAME` SHALL consommer source + dérivée + polygones % (+
`touchDilatation` minimale 44 px) ; le masque Alpha brut ne SHALL jamais être
embarqué. Zones exprimées en % (responsive). Chaque zone SHALL être un
rectangle `{x, y, w, h}` OU un polygone `{points: [{x, y}, ...]}` (au moins 3
points) ; les deux formes coexistent dans le même tableau (les rectangles
existants restent valides sans migration). Relecture overlay avec statuts.
Le test de tap (`hitTest` + dilatation) SHALL valider l'intérieur des deux
formes (point-dans-polygone pour les polygones).

#### Scenario: Tap ganté à côté

- **GIVEN** une zone de 4 px avec dilatation 12 px
- **WHEN** le joueur tape à 10 px du bord exact
- **THEN** le tap est validé dans la zone

#### Scenario: Tap dans un polygone

- **GIVEN** une zone polygonale à 5 sommets avec dilatation
- **WHEN** le joueur tape à l'intérieur du polygone
- **THEN** le tap est validé, sans exiger de rectangle englobant

#### Scenario: Rectangle existant toujours valide

- **GIVEN** un jeu avec une zone `{x: 10, y: 10, w: 5, h: 5}` (format historique)
- **WHEN** la validation Draft-07 tourne
- **THEN** la zone est acceptée (union, pas de migration)

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

### Requirement: AR_MARKER avec fallback 2D

`AR_MARKER` SHALL porter marqueur + modèle 3D + fallback 2D obligatoire,
rendu ARKit/ARCore avec lissage anti-saut. Sans caméra/permission/WebGL
indisponible : le fallback SHALL permettre de compléter l'étape.

#### Scenario: Soleil aveuglant sur marqueur

- **GIVEN** une détection AR impossible en plein soleil
- **WHEN** le joueur bascule en fallback
- **THEN** l'étape reste complétable et le flag capteur est journalisé

### Requirement: BOUSSOLE validante en interne

`BOUSSOLE` SHALL porter `toleranceDeg`, durée de stabilisation, `onTimeout` et
fallback non-capteur, lire le service heading partagé et valider en interne.
L'orchestrateur ne SHALL jamais recevoir de cap.

#### Scenario: Cap instable près d'une grille

- **GIVEN** un heading instable et un fallback code animateur
- **WHEN** la stabilisation échoue avant `onTimeout`
- **THEN** le module propose le fallback au lieu de bloquer

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

### Requirement: Indices sur événements d'inventaire

Tout mini-jeu socle (QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE, CODE_INPUT — via le registre, jamais de liste fermée en dur dans le moteur) MAY déclarer `inventoryHints: [{ event, itemId?, hint }]` dans son `module.data`, où `event` appartient au vocabulaire fermé des événements d'inventaire et `hint` est le texte d'indice à afficher. Quand un événement correspondant survient pendant que le Nœud est ACTIVE, le renderer SHALL afficher `hint` sans changer l'état du jeu (ni transition, ni effet, ni score). Les abonnements sans `itemId` réagissent à tout objet pour ce type d'événement.

#### Scenario: Indice sur sélection
- **GIVEN** un QUIZ avec `inventoryHints: [{event: "ITEM_SELECTED", itemId: "loupe", hint: "Regarde le coin supérieur droit."}]`, Nœud ACTIVE
- **WHEN** le joueur sélectionne `loupe` dans la boîte à outils
- **THEN** l'indice s'affiche dans le quiz, le Nœud reste ACTIVE, aucun event de progression n'est émis

#### Scenario: Abonnement large
- **GIVEN** un PUZZLE avec `inventoryHints: [{event: "ITEM_USED", hint: "Bien utilisé, continue."}]`
- **WHEN** le joueur utilise n'importe quel objet pendant le Nœud ACTIVE
- **THEN** l'indice s'affiche

#### Scenario: Référence orpheline rejetée
- **GIVEN** un `inventoryHints` avec `itemId: "objet_inexistant"` et aucun objet de cet `id` dans le jeu
- **WHEN** la validation applicative tourne
- **THEN** le jeu est rejeté avec l'objet fautif nommé

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
- **THEN** le module applique `onTimeout`, le Nœud restant `UNLOCKED` jusqu'à sa décision

#### Scenario: QCM avec réponses images

- **GIVEN** un Quiz dont une question porte 4 options dont 2 avec `image`
- **WHEN** le module s'affiche
- **THEN** les 4 options sont rendues (texte et/ou vignettes) et une seule est valide

#### Scenario: Essais épuisés

- **GIVEN** un Quiz `maxAttempts:2` avec 2 mauvaises réponses données
- **WHEN** le joueur échoue une 2e fois
- **THEN** le module applique `onTimeout` comme à l'expiration du temps

### Requirement: Indices sur événements d'inventaire

Tout mini-jeu socle (QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE, CODE_INPUT — via le registre, jamais de liste fermée en dur dans le moteur) MAY déclarer `inventoryHints: [{ event, itemId?, hint }]` dans son `module.data`, où `event` appartient au vocabulaire fermé des événements d'inventaire et `hint` est le texte d'indice à afficher. Quand un événement correspondant survient pendant que l'écran du Nœud est ouvert (`UNLOCKED`, écran affiché), le renderer SHALL afficher `hint` sans changer l'état du jeu (ni transition, ni effet, ni score). Les abonnements sans `itemId` réagissent à tout objet pour ce type d'événement.

#### Scenario: Indice sur sélection
- **GIVEN** un QUIZ avec `inventoryHints: [{event: "ITEM_SELECTED", itemId: "loupe", hint: "Regarde le coin supérieur droit."}]`, écran du Nœud ouvert
- **WHEN** le joueur sélectionne `loupe` dans la boîte à outils
- **THEN** l'indice s'affiche dans le quiz, le Nœud reste `UNLOCKED`, aucun event de progression n'est émis

#### Scenario: Abonnement large
- **GIVEN** un PUZZLE avec `inventoryHints: [{event: "ITEM_USED", hint: "Bien utilisé, continue."}]`
- **WHEN** le joueur utilise n'importe quel objet pendant que l'écran du Nœud est ouvert
- **THEN** l'indice s'affiche

#### Scenario: Référence orpheline rejetée
- **GIVEN** un `inventoryHints` avec `itemId: "objet_inexistant"` et aucun objet de cet `id` dans le jeu
- **WHEN** la validation applicative tourne
- **THEN** le jeu est rejeté avec l'objet fautif nommé

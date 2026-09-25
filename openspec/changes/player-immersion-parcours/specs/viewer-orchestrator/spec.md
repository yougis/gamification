## ADDED Requirements

### Requirement: Arrivée immersive sur le nœud à jouer

Au chargement d'une partie (pack importé, nouvelle session ou reprise), le player SHALL ouvrir directement l'écran du nœud à jouer au lieu de la liste, selon la règle : si `HOME` est présent dans `presentation`, le tableau de bord s'affiche et pilote (sa proposition d'ouverture existante fait foi) ; sinon, le player ouvre le premier nœud non terminé sans parent — aucune dépendance `NODE_COMPLETED`/`POOL_DRAWN` entrante — avec préférence au nœud nommé `start` quand il est éligible. Si aucun nœud n'est éligible, le player affiche la liste actuelle (repli inchangé). L'ouverture SHALL être une présentation d'éligible existant : aucune transition d'état, aucun event de progression.

#### Scenario: Arrivée avec HOME

- **GIVEN** un jeu avec `presentation: ["HOME", "TOOLBOX"]` et `baker` en tête de file
- **WHEN** le joueur charge le pack
- **THEN** le tableau de bord s'affiche avec « Ouvrir : baker », jamais la liste brute

#### Scenario: Arrivée sans HOME sur le start

- **GIVEN** un jeu sans `HOME` dont `start` (sans parent) est éligible et non terminé
- **WHEN** le joueur charge le pack
- **THEN** l'écran de `start` s'ouvre directement

#### Scenario: Arrivée sans éligible

- **GIVEN** un jeu sans `HOME` et sans nœud éligible (ex. attente géorepérage)
- **WHEN** le joueur charge le pack
- **THEN** la liste actuelle s'affiche (repli inchangé), sans erreur

#### Scenario: Reprise au milieu du parcours

- **GIVEN** une reprise (`sessionId` existant) avec `scotland` non terminé et éligible
- **WHEN** le joueur rouvre la partie
- **THEN** le player ouvre l'écran de `scotland` (progression relue, pas le début)

### Requirement: Enchaînement des écrans après validation

Valider une étape (module `onComplete`, Terminer, Abandonner exclu) SHALL avancer automatiquement vers l'écran éligible suivant de la file FIFO : même file, aucune transition ajoutée, aucun event ajouté. À défaut d'éligible, le player revient au tableau de bord (si `HOME`) ou à la liste (repli). Si un nœud `isEnding` passe `COMPLETED`, l'écran de fin existant s'affiche.

#### Scenario: Validation enchaîne

- **GIVEN** le joueur validant `baker` avec `scotland` éligible ensuite
- **WHEN** la complétion est enregistrée
- **THEN** l'écran de `scotland` s'ouvre sans repasser par la liste

#### Scenario: Fin de parcours

- **GIVEN** le joueur validant le nœud `fin` (`isEnding`)
- **WHEN** la complétion est enregistrée
- **THEN** l'écran de fin s'affiche (comportement existant, non modifié)

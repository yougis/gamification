## MODIFIED Requirements

### Requirement: Configuration globale dédiée

La configuration globale SHALL vivre dans un panneau dédié (hors nœuds), structuré en sous-sections correspondant 1:1 aux opérations MCP : navigation & présentation, `experienceStyle` (sélecteur de preset + champs par dimension, avec indication visible si le preset a été modifié manuellement après sélection), branding typé (validé à la saisie, pas seulement à l'export), `gameMode`/`difficulty`, HOLD (`holdMode`, `holdExit`), GPS/carte.

La sous-section navigation & présentation SHALL exposer les 7 modes (`MAP`, `LIST`, `STORY`, `CLUE`, `TOOLBOX`, `TIMELINE`, `HOME`) en cases à cocher écrivant `global.presentation` via l'opération MCP `setPresentation` (traçée undo/redo), avec rappel du preset `navigationModel` et avertissement si un `presentationNeeds` de module n'est pas couvert. Quand `HOME` est coché, le panneau SHALL proposer un aperçu du tableau de bord (même contenu que côté player : temps écoulé, comptes à rebours, états, étape à ouvrir).

Changer `holdMode` SHALL déclencher un recalcul visible des nœuds qui en dépendent.

#### Scenario: Changement de holdMode recalcule les dépendances
- **GIVEN** un jeu avec un module `needsLock` et `holdMode == "none"`
- **WHEN** l'auteur passe `holdMode` à `"guidedAccess"`
- **THEN** le nœud concerné affiche immédiatement son nouvel état de dépendance satisfaite

#### Scenario: Preset modifié signalé
- **GIVEN** un `experienceStyle` avec `preset: "BASIC"`
- **WHEN** l'auteur modifie manuellement `visual.primaryColor`
- **THEN** l'UI indique que le preset a divergé de sa référence

#### Scenario: Présentations cochées via MCP
- **GIVEN** un jeu avec `presentation: ["MAP"]`
- **WHEN** l'auteur coche `HOME` et `TOOLBOX`
- **THEN** le JSON porte `["MAP", "HOME", "TOOLBOX"]` via `setPresentation`, annulable par undo, et l'aperçu du tableau s'affiche

#### Scenario: Besoin non couvert averti
- **GIVEN** un jeu avec un module à `presentationNeeds: ["CLUE"]` et `presentation: ["MAP"]`
- **WHEN** l'auteur ouvre la sous-section navigation & présentation
- **THEN** un avertissement « CLUE non couvert » s'affiche sans bloquer (même calcul que l'inspecteur)

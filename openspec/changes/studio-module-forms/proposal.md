## Why

Seuls QUIZ, PUZZLE et CODE_INPUT possèdent un panneau de propriétés — et encore, rendu uniquement dans le WYSIWYG quand un widget module est sélectionné (`modulePanel`, vue screen). Sous le dropdown « Mini-jeu » de la famille épreuve de l'Inspecteur, là où l'auteur s'attend à configurer son étape comme pour le QCM et ses questions, seul QUIZ a un inline ; PUZZLE, CODE_INPUT et tous les autres n'offrent que le sélecteur de type et le textarea « Données expertes (JSON) ». DIFFERENCE_GAME, AR_MARKER et BOUSSOLE n'ont même pas de screenPlugin : leurs champs requis au schéma (`polygons`, `marker` + `fallback2D`, `toleranceDeg`) sont impossibles à renseigner sans écrire du JSON à la main, et la validation rejette après coup. Ce change donne à chaque mini-jeu un vrai formulaire sous le choix du module.

## What Changes

- La famille épreuve de l'Inspecteur affiche sous le dropdown « Mini-jeu » le panneau de configuration du module (le même `propertiesPanel` que le WYSIWYG) pour tout type en disposant ; l'inline questions QUIZ historique est remplacé par ce panneau unique (fin du doublon).
- Nouveaux screenPlugins `DIFFERENCE_GAME`, `AR_MARKER`, `BOUSSOLE` (aperçu éditeur + panneau de propriétés, même pattern que QUIZ/PUZZLE/CODE_INPUT) : 7-erreurs (images source/dérivée, dilatation tactile, tracé des polygones % sur l'image source), RA (marqueur, modèle 3D + taille, fallback 2D obligatoire), boussole (tolérance, stabilisation, secours, timeout via défauts globaux).
- Sans plugin (INFO, RANDOM_POOL, futurs types), le comportement actuel est conservé (placeholder / famille tirage / JSON expert).
- Aucun changement du schéma racine ni des sous-schémas modules : seules des entrées registre gagnent un `screenPlugin`.

## Capabilities

### New Capabilities

- (aucune)

### Modified Capabilities

- `module-screen-plugins`: le `propertiesPanel` est affiché sous le choix du module dans l'Inspecteur en plus du WYSIWYG ; nouveaux plugins 7-erreurs (avec tracé de polygones), RA et boussole.
- `studio-authoring`: la famille épreuve de l'Inspecteur présente le formulaire du module sous le dropdown (fini le JSON-only pour les champs requis).

## Impact

- `studio/src/App.tsx` : famille épreuve de l'Inspecteur (rendu `PanneauModule` réutilisé, retrait de l'inline QUIZ).
- `studio/src/components/wysiwyg/plugins/` : `difference-game.tsx`, `ar-marker.tsx`, `boussole.tsx` (nouveaux) + branchement dans `studio/src/game/modules.ts` (une ligne par type, pattern existant).
- Aucune modification du schéma graphe, des sous-schémas modules ou du registre de données : consommateurs (Studio MCP, runtime natif, orchestrateur, modules, packaging offline) inchangés.
- Aucune valeur réservée CONDITIONAL/WINDOW touchée ; aucun module au-delà des 3 manquants.
- Aucune connexion réseau (tracé polygones côté client en %, assets via `registerAsset` existant, offline-first préservé).
- Aucune dépendance à un change non archivé.

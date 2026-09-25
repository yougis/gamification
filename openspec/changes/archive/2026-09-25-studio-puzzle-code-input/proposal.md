## Why

Deux modules ne sont pas jouables dans le Studio aujourd'hui. Le PUZZLE possède sa configuration (image source, découpe 2–6) et un aperçu grille numérotée, mais son rendu joueur n'est qu'un alias de l'aperçu : pas d'image découpée en tuiles mélangées, pas de déplacement, pas de complétion. CODE_INPUT existe comme condition et entrée registre, mais sans fichier schéma (`code-input.json` référencé, absent), sans panneau de propriétés et sans rendu joueur : impossible de créer une étape cadenas jouable. Ce change termine les deux pour débloquer les jeux de type escape game / chasse au trésor.

## What Changes

- PUZZLE : l'aperçu éditeur montre l'image source réellement découpée en tuiles mélangées aléatoirement (pas une grille numérotée) ; le rendu joueur devient interactif avec déplacement des tuiles selon `module.data.mode` (`slide` : tap-à-tap sélection/placement avec échange ; `drag` : glisser-déposer), détection de complétion (toutes les tuiles bien placées) appelant `onComplete`, essais/temps via les défauts globaux existants.
- CODE_INPUT : nouveau fichier schéma `code-input.json` (code attendu, longueur, tentatives, message de succès/échec) branché comme les 5 schémas socle ; nouveau screenPlugin (`plugins/code-input.tsx`) avec aperçu éditeur visuel cadenas, panneau de propriétés (code attendu, indices, essais), et rendu joueur interactif (pavé de saisie, vérification, succès → `onComplete`, échec → essais décrémentés puis `onTimeout`).
- Le visuel cadenas est dessiné en CSS/SVG générique (aucun asset, offline-first préservé, réutilisable par tous les jeux).
- Aucun changement du schéma racine Noeuds/Liens : seul le registre gagne une entrée effective, conformément à la règle d'extension.

## Capabilities

### New Capabilities

- (aucune)

### Modified Capabilities

- `minigame-modules`: contrat PUZZLE complété (tuiles mélangées, modes `slide`/`drag`, complétion) et contrat CODE_INPUT créé (schéma + mécanique saisie/vérification/essais).
- `module-screen-plugins`: screenPlugin CODE_INPUT de référence cadenas ; `playerRenderer` PUZZLE interactif (l'aperçu éditeur montre la découpe mélangée).

## Impact

- `studio/src/components/wysiwyg/plugins/puzzle.tsx` : aperçu tuiles mélangées + `PuzzlePlayerRenderer` interactif.
- `studio/src/components/wysiwyg/plugins/code-input.tsx` (nouveau) + branchement dans `studio/src/game/modules.ts` (même pattern que QUIZ/PUZZLE).
- `studio/src/game/schema/code-input.json` (nouveau) + montage AJV dans `validate.ts` (même pattern `addSchema` que les 5 socle) ; `registry.json` déjà à jour (référence existante).
- Validateur C2 : règle CODE_INPUT-module (code attendu requis) symétrique de la règle condition existante.
- Aucune modification du schéma racine Noeuds/activation/registre : consommateurs (Studio MCP, runtime natif, orchestrateur, packaging offline) inchangés.
- Aucune valeur réservée CONDITIONAL/WINDOW touchée ; aucun module au-delà de CODE_INPUT.
- Aucune connexion réseau (tuiles découpées côté client, cadenas CSS/SVG, offline-first préservé).
- Aucune dépendance à un change non archivé.

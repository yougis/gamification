## Why

Le simulateur auteur montre les écrans mais 4 interactions/rendus y sont cassés : la carte ne se panne pas (capture pointeur posée sur la cible au lieu du cadre + `touch-action` manquant sur tactile), les marqueurs ne permettent jamais d'ouvrir (états d'essai non transmis au terminal → tout retombe LOCKED), les aperçus d'un même viewport n'ont pas la même taille (`ApercuAccueil` sans mise à l'échelle), et le puzzle joueur affiche des tuiles vides (chemin d'asset brut au lieu de l'URL résolue). Sans ces correctifs, l'essai auteur ne permet ni de naviguer, ni d'ouvrir depuis la carte, ni de contrôler le rendu.

## What Changes

- Carte simu : capture du pointeur sur le cadre (les mouvements restent reçus pendant le glissé quelle que soit la cible de départ) + `touch-action: none` sur le cadre pour le tactile.
- Terminal : transmission des lignes d'essai (`lignesApercu`) jusqu'à la carte simu, pour que chaque marqueur reflète son état simulé et propose Ouvrir quand éligible.
- Aperçus : même calcul de mise à l'échelle plein-cadre pour tous les rendus d'un viewport (Screen, terminal, `ApercuAccueil`).
- Puzzle joueur : résolution de l'image source via le même mécanisme que l'aperçu éditeur (`urlAssetSession`).

## Capabilities

### New Capabilities
Aucune.

### Modified Capabilities
- `compose-web-simulator`: navigation carte et marqueurs ouvrables dans le simulateur, cohérence des tailles de viewport entre aperçus, image puzzle résolue dans le renderer joueur.

## Impact

- Code Studio uniquement : `CarteInteractiveSimu.tsx`, `PlayerTerminal.tsx` (+ prop `lignesApercu`), `ApercuAccueil.tsx` (mise à l'échelle), `puzzle.tsx` (`PuzzlePlayerRenderer`).
- Aucun changement moteur, schéma, validation, offline-first ; clutch budget d'interaction inchangé (aucune écriture ajoutée).
- Non-couvert : tuiles hors-ligne et proxy `/tiles` (comportement inchangé), aperçu auteur statique (inchangé).

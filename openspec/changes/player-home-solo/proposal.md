## Why

Un jeu « HOME seul » (tableau de bord sans étapes : vitrine, kiosque d'info, accueil d'événement) est aujourd'hui impossible : le schéma C1 exige `nodes ≥ 1` avec un `isEnding`, la C2 exige un `isEnding` atteignable, l'import refuse le fichier, et le bouton ▶ Mode Jeux reste désactivé sans file. Pourtant le player sait déjà afficher un tableau vide valide. Il faut lever ces cinq verrous pour le seul cas dégénéré légitime, sans affaiblir les garanties des jeux à étapes.

## What Changes

- **Cas dégénéré valide ssi HOME** : `nodes: []` accepté C1 + C2 **si et seulement si** `HOME` figure dans `global.presentation`. Retirer `HOME` d'un jeu vide redevient invalide. Les jeux à étapes gardent toutes leurs règles (isEnding obligatoire, atteignabilité, etc.).
- **Session sans fin assumée** : sans `isEnding`, la partie ne se termine jamais ; la sortie se fait par Quitter (player) / fermeture du terminal (Studio). Documenté, pas de nouveau mécanisme.
- **Studio** : suppression du dernier nœud autorisée quand HOME est présent (avec confirmation rappelant l'invalidité sans HOME) ; import d'un JSON à `nodes: []` accepté via la validation assouplie ; bouton ▶ Mode Jeux actif quand HOME est présent même sans file ni actif (il ouvre le terminal sur le tableau).
- **Player** : aucun changement moteur (tableau vide déjà valide : temps, pas de POI, pas de bouton Ouvrir) ; l'arrivée avec HOME affiche le tableau comme aujourd'hui.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `game-schema`: `nodes: []` accepté quand `HOME` est présent (via `if/then`, comme `tileStrategy`/`radius`).
- `game-validation`: exemption `isEnding`/atteignabilité quand `HOME` présent et `nodes` vide.
- `viewer-orchestrator`: Mode Jeux lançable sans étape quand HOME est actif ; session sans fin, sortie par Quitter.
- `studio-authoring`: suppression du dernier nœud autorisée sous HOME ; import tolérant via la validation.

## Impact

- **Code** : schéma JSON, validateur C1/C2, Studio (garde suppression, bouton Mode Jeux, import — ce dernier suit la validation) ; moteur et players inchangés (déjà tolérants).
- **Compatibilité** : jeux existants inchangés (règles ajoutées en `if/then` + exemptions conditionnelles, jamais relâchées globalement).
- **Hors périmètre** : gabarit « nouveau jeu d'accueil » (on y arrive par suppression ; gabarit = suivi éventuel) ; personnalisation du tableau vide au-delà de l'écran global.

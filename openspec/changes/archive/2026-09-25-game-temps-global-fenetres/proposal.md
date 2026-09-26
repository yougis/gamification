## Why

Le temps GeoPlay ne sait que déverrouiller (`TIMER` = délai après ancre) : aucune durée globale de partie, aucun verrouillage temporel d'étape. Les jeux à contrainte horaire (soirée, borne, scolaire) doivent donc bricoler avec des timers d'épreuves, qui mesurent le temps *dans* l'épreuve et jamais la disponibilité *des* étapes ni la fin de partie.

## What Changes

- **Durée globale en config jeu** : `global.dureeTotale` (secondes, optionnel) + `global.finDeTemps: "terminer"|"continuer"` (requis si durée posée) : à l'échéance, fin imposée (scores figés, écran de fin, comme `isEnding`) ou poursuite avec flag « hors délai » sur score et journal. Absence = pas de limite (comportement actuel).
- **`WINDOW` défini comme fenêtre relative** : le type réservé `WINDOW` devient `{ apresSecondes?, avantSecondes? }` (temps écoulé depuis `GAME_START`, au moins un des deux, offline-cohérent). Échéance = retour `LOCKED` (toujours, même `latch:true`, comme les révocables `GEOFENCE`/`WINDOW`) ; file purgée ; modale ACTIVE déjà ouverte : l'épreuve en cours se termine, puis le nœud retombe `LOCKED` (pas d'expulsion, pas de ré-entrée).
- **Dashboard étendu** : rebours global + mention « se verrouille dans … » par POI (mêmes briques `timerRemainingMs`).
- **C2 minimale** : fenêtre non vide (`apres < avant` quand les deux posés) ; la faisabilité temporelle complète reste hors socle (même limite documentée que la fermeture transitive).

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `game-schema`: `global.dureeTotale`, `global.finDeTemps`, variante `WINDOW` relative.
- `game-triggers`: sémantique `WINDOW` (fenêtre relative, révocabilité, combinaison AND/OR).
- `game-validation`: règles C2 fenêtres (non-vacuité) + hypothèse d'environnement étendue sans promesse de faisabilité temporelle.
- `viewer-orchestrator`: rebours global et mentions de verrouillage dans le tableau de bord (présuppose le tableau de `player-home-dashboard`, non archivé : rebaser à l'archive si son texte bouge).

## Impact

- Code : schéma Draft-07, moteurs (Studio `evaluate.ts`, shared KMP, PWA : boucle d'évaluation + fin de partie + flag), dashboard (shared + miroir TS), Studio (config globale : champs durée + fin ; inspecteur : famille activation `WINDOW`).
- Schéma graphe : `global` + variante `WINDOW` (optionnels, rétrocompatibles) ; consommateurs : validateur AJV des deux côtés, moteurs, Studio.
- `CONDITIONAL` reste réservé et ignoré ; aucun module ajouté au registre.
- Aucun besoin réseau (temps écoulé local) ; offline-first préservé.
- `player-home-dashboard` non archivé : ordre d'archive recommandé d'abord, rebase sinon.

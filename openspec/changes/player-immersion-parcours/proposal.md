## Why

Après chargement d'un pack, le player (PWA comme natif) atterrit sur la liste des nœuds : aucune immersion, aucun guidage vers l'étape à jouer. Le joueur doit deviner par où commencer, puis revenir à la liste après chaque étape. Le moteur connaît pourtant la file d'éligibilité (FIFO) et le tableau de bord HOME sait déjà proposer l'ouverture en tête de file — mais rien n'ouvre automatiquement. Il faut une mécanique d'arrivée et d'enchaînement : atterrir sur l'écran à jouer, valider, passer au suivant.

## What Changes

- **Nœud principal à l'arrivée** : au chargement d'une partie (nouvelle ou reprise), le player ouvre directement l'écran du nœud à jouer selon la règle : si `HOME` est présent, le tableau de bord pilote (il propose déjà la tête de file) ; sinon, le premier nœud non terminé sans parent (aucune dépendance `NODE_COMPLETED`/`POOL_DRAWN` entrante), avec préférence au nœud nommé `start` s'il est éligible.
- **Enchaînement** : valider une étape (module `onComplete`, Terminer) avance automatiquement vers l'écran éligible suivant (même file FIFO, aucune transition ajoutée) ; à défaut d'éligible, retour au tableau de bord (si `HOME`) ou à la liste (repli actuel) ; partie terminée (`isEnding`) → écran de fin existant.
- **Aucun état ajouté** : ouverture = présentation d'un éligible existant, jamais de transition moteur, jamais d'event de progression ; fermer/revenir = reprise exacte.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `viewer-orchestrator`: mécanique d'arrivée immersive et d'enchaînement des écrans (nœud principal, avance auto, replis).

## Impact

- **Code** : player partagé (`GeoPlayApp` : route initiale + avance auto à la complétion) + natif Android (même règle sur l'écran de partie) ; PWA hérite via le partagé ; iOS hérite via le partagé. Moteur d'évaluation inchangé (lecture seule de la file).
- **Schéma graphe** : inchangé (zéro nouvelle donnée auteur ; le « principal » est dérivé du graphe + états).
- **Hors périmètre assumé** : parité visuelle des images du pack et renderers joueurs manquants (PUZZLE/INFO/CODE_INPUT…) — suivi dédié à proposer, sans quoi l'immersion reste partielle ; rien n'est silencieusement-narrowé ici, c'est documenté comme limite.
- **Réseau** : aucun (mécanique 100 % locale).

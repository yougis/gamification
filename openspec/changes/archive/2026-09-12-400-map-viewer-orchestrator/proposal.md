## Why

Le graphe 000 et le schéma 100 décrivent les règles, mais aucun runtime ne les
exécute : sans orchestrateur, pas d'évaluation des activations, pas de file de
modales, pas de guidance terrain. Ce change donne au framework son moteur
d'exécution joueur : boucle d'évaluation, présentation et capteurs sobres.

## What Changes

- Boucle d'évaluation : `activation` évaluée en continu (GPS + horloge + graphe),
  résolution des pools `ON_GAME_START` en ordre topo à l'init, tirages persistés
  aussitôt.
- Présentation **FIFO** : 1 modale `ACTIVE` max, file d'attente FIFO (tranChe la
  question ouverte du 000), auto (`GEOFENCE`/`TIMER`) vs choix (`NODE_COMPLETED`/
  `POOL_DRAWN`), `ACTIVE` latché, file suivant le `latch`.
- Capteurs sobres : GPS haute précision adaptatif (ralenti hors épreuve),
  gating `maxAccuracyM` + `dwell` + hystérésis depuis le JSON, boussole service
  (heading nord vrai lissé + accuracy, flèche + distance texte + haptique),
  caméra AR à la demande.
- Carte : rendu MapLibre + trace GPX display + position + flèche, fond uni si
  tuiles absentes.
- Triche/test in-app : bypass `GEOFENCE`, auto-validation, `forceDraw`, flag
  sur chaque event.

## Capabilities

### New Capabilities

- `viewer-orchestrator`: boucle d'évaluation, file FIFO, GPS/boussole sobres,
  rendu carte + trace, triche in-app.

### Modified Capabilities

- Aucune (exécute les specs 000/100 sans les modifier ; fige la question ouverte
  file en FIFO, documentée comme décision d'exécution).

## Impact

- Nouveau runtime natif ; consommateurs : modules du registre (hôte dynamique
  isolé), packs 300 (lecture progression/tirages), Studio preview (même bypass).
- Réseau : 0 en parcours joueur ; capteurs via permissions OS justifiées.
- Dépend de : `100` (schéma), `300` (stockage), `000` (archivé).

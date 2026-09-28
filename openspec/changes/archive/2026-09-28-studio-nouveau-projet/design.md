## Context

Voir `proposal.md` (Why). État observé : `jeuVide()` (`App.tsx:83`) construit le `start` avec `requires: []` et sans `isEnding` ; la spec `studio-authoring` impose « activation vide », contredisant le schéma (`minItems: 1`). Le bouton « Effacer le brouillon » (`App.tsx:508`, handler + `confirm`) existe mais vit dans Importer → Avancé. `importerFichier` (`App.tsx:1000`) charge tel quel, sans le `start` automatique pourtant SHALL par la spec.

## Goals / Non-Goals

**Goals:**
- Jeu vierge sans erreur auto-infligée (reste : FIN manquante, by design).
- Porte d'entrée « Nouveau projet » visible, destructive avec confirmation, undoable.
- Import sans nœud conforme à la spec existante (ajout `start`).

**Non-Goals:**
- Pas de changement du schéma, des presets de création (brouillon transitoire assumé) ni du comportement FIN-manquante.
- Pas de suppression du bouton enterré d'Importer (doublon assumé).
- Pas de retouche du message C1 trompeur (sujet séparé).

## Decisions

- **TIMER GAME_START 0 plutôt que GEOFENCE ou NODE_COMPLETED** : seule convention « toujours vrai à l'ouverture » déjà validée par la non-régression (`game-5poi.json` START) ; aucun capteur, aucune dépendance.
- **`isEnding: false` explicite** plutôt qu'absent : la branche `else` du schéma exige la propriété présente ; l'absence produit l'erreur cryptique « must have required property ».
- **Bouton réutilisant `effacerBrouillon`** (même `confirm`, même reset draft/sélection/session/export, même op d'historique) : pas de second chemin de réinitialisation à maintenir. Style `btn-danger`, désactivé en lecture seule comme le reste de la barre.
- **Ajout du `start` à l'import via op nommée** (même patron que les migrations : avant validation, chargement restant une étape undoable unique).

## Risks / Trade-offs

- [Jeux existants avec `start` à `requires: []`] → Mitigation : hors périmètre (l'auteur ajoute un déclencheur ; la pastille le guide). Seuls `jeuVide()` et l'import vide sont couverts.
- [Bouton destructif trop visible] → Mitigation : `confirm` bloquant + undo restaurant le jeu précédent + désactivation en lecture seule.

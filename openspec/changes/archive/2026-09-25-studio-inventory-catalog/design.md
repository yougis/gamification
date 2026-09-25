## Context

Voir `proposal.md`. Existant : `catalog.ts` (`listGames`, `fetchPack` → pack avec `gameJson` + assets), écran Inventaire (change 1), circuit manifest (`registerAsset`), métas provenance par objet déjà affichées en Relire.

## Goals / Non-Goals

**Goals:**
- Import en 3 temps (jeu → objet → validation id) sans quitter l'écran Inventaire.
- Zéro référence externe dans le pack (offline-first préservé à l'export).

**Non-Goals:**
- Synchronisation continue avec le jeu source (copie ponctuelle, aucun lien).
- Import de nœuds ou de jeux entiers (objet seul).

## Decisions

- **Copie, pas référence** : le `gameJson` sourcé est lu en mémoire, l'objet est cloné avec nouvel `id` si besoin. Alternative écartée : référence `sourceJeu + objetId` — casserait l'offline-first et la validation locale.
- **Assets re-téléchargés** : icône/`image` récupérées depuis le pack source puis enregistrées comme assets courants (même déduplication par SHA que `prendreImage`). Le pack reste autonome.
- **Provenance héritée puis éditable** : `providerId`/licence copiés, `sourceUrl` = jeu source ; l'auteur peut les corriger (relecture `reviewedBy` inchangée).
- **Catalogue indisponible** : action désactivée avec message (même pattern que la publication), jamais de blocage du reste de l'écran.

## Risks / Trade-offs

- [Licence incompatible] → affichée avant validation, l'auteur décide ; la relecture garde la trace.
- [Gros assets] → taille affichée avant validation (pattern du manifest existant).
- [Catalogue vide/injoignable] → état vide explicite, pas d'erreur bloquante.

## Migration Plan

Aucune (fonction ajoutée, jeux existants inchangés). Rollback = retirer l'action.

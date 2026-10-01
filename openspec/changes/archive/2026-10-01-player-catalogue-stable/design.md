## Context

Voir proposal.md (Why). État actuel : dossiers `packs/<ts>` (zip/catalogue) ou `packs/<gameId>_<ts>` (JSON) créés à chaque import sauf catalogue-identique ; seed testant `"reference-5poi" !in dirNames` ; aucune suppression ; reprise `last_session_<gameId>` sans sortie ; historique SQLite (sessions, tirages, completions, scores) lié par `sessionId`+`gameId`.

## Goals / Non-Goals

**Goals:**
- 1 entrée par `gameId`, créée uniquement par import, stable aux redémarrages.
- Supprimer et recommencer (triche) sans perdre l'historique.
- Seed une fois, suppression respectée.

**Non-Goals:**
- Renommage, purge auto, limite de taille, partage inter-appareils.
- Déduplication inter-`gameId` (contenus égaux, ids distincts = 2 entrées).

## Decisions

- **Clé d'unicité = `gameId`** (décision actée) : identique → réutilise ; même id contenu différent → remplace le dossier en place (nouveau contenu + manifest, date à jour) ; suppression de l'ancien dossier après installation réussie du nouveau.
- **Comparaison par SHA du `game.json`** : réutilise `computeSha256` + `findIdenticalPack` existants, étendus à tous les chemins d'import (zip : compare le `game.json` extrait ; JSON : compare le texte).
- **Seed par `gameId` lu + flag prefs `seed_reference_done`** : le test lit les `game.json` installés ; le flag empêche toute re-création après suppression volontaire.
- **Suppression = `deleteRecursive` du dossier + confirmation** : SQLite intact (sessions orphelines rejouables au réimport) ; documenté, pas de cascade.
- **Reset = nouvelle session** (`UUID`, `last_session_<gameId>` remplacé) : aucun effacement ; visibilité conditionnée à la pref `cheat_mode` (absent sinon, jamais grisé).

## Risks / Trade-offs

- [Risk] Remplacement en place pendant une partie en cours sur ce jeu → Mitigation : confirmation explicite avant remplacement.
- [Risk] `lastModified` comme date d'installation (mutable par l'OS) → Mitigation : indicatif seulement ; l'unicité repose sur `gameId`, pas sur la date.
- [Risk] Sessions orphelines accumulées → Mitigation : assumé et documenté ; purge hors périmètre.

## Migration Plan

Nettoyage au premier démarrage post-installation : dossiers doublons (même `gameId`) fusionnés vers le plus récent, `reference-5poi` surnuméraires réduits à un, flag seed posé. Packs et SQLite existants préservés. Rollback = revert.

## Open Questions

Aucune.

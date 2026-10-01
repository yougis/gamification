## Context

Voir proposal.md (Why). État actuel : export Studio en fichiers séparés (jamais de zip) ; `manifest.json` `{path, version, size, sha256}` par fichier (intégrité) ; `TilePackMeta` (config + compteurs, sans liste de tuiles) ; import Android créant un dossier par import (unicité par `gameId` traitée dans `player-catalogue-stable`, à réutiliser) ; tuiles lues par stratégies bbox/radius/viewport sans index dédié.

## Goals / Non-Goals

**Goals:**
- Un fichier transférable offline (zip) contenant tout le jouable.
- Mises à jour au différentiel (jeu, images, tuiles : ajouts, modifications, retraits).
- Index spatial normalisé (TileJSON-compatible) comme source de l'univers des tuiles.

**Non-Goals:**
- Rendu natif des tuiles (change dédié déjà acté).
- Diff côté serveur ou format de patch sur le fil (le Studio produit du complet, le player diffe en local).
- Compression exotique, chiffrement, signature auteur (hors périmètre).

## Decisions

- **Zip assemblé côté Studio (client-side)** plutôt que serveur : cohérent avec l'offline-first du Studio (aucun backend requis) ; bibliothèque zip JS standard, streaming pour les gros packs.
- **TileJSON-compatible plutôt que XML/VRT/MBTiles** : le pack est déjà 100 % JSON avec parsers des deux côtés ; TileJSON est le standard SIG des sets de tuiles (MapLibre le lit tel quel le jour du rendu natif) ; MBTiles/SQLite compliquerait le diff fichier par fichier qui fait la force du manifest.
- **Manifest = intégrité, `tiles.json` = univers** : pas deux sources concurrentes — le manifest dit si un fichier est sain, l'index dit quelles tuiles existent ; la cohérence croisée est vérifiée aux deux bouts.
- **Diff local, pas de patch réseau** : comparer deux manifests coûte rien et marche offline (zip) comme online (service) ; aucun endpoint de diff à opérer.
- **Bascule atomique avec ancien pack conservé** : appliquer dans un dossier temporaire puis permuter ; un échec laisse le jouable intact.

## Risks / Trade-offs

- [Risk] Zip de plusieurs centaines de Mo sur mobile bas de gamme → Mitigation : taille annoncée + confirmation, streaming, stratégies existantes pour limiter.
- [Risk] `tiles.json` volumineux (une entrée par tuile) → Mitigation : `{z,x,y}` compacts (tableau de triplets), suffisant à l'échelle associative (milliers de tuiles).
- [Risk] Divergence manifest/index si un producteur tiers écrit le pack → Mitigation : contrôle croisé bloquant des deux côtés, fichier fautif nommé.

## Migration Plan

Packs existants sans `tiles.json` : traités comme univers vide de tuiles (pas de retrait calculé, comportement actuel) ; régénérés avec index au prochain export. Rollback = revert (aucun format auteur modifié).

## Open Questions

Aucune.

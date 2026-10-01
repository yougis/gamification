## Context

Voir proposal.md (Why). État actuel : `fragment_import.xml` racine `ConstraintLayout` non scrollable ; `loadGame()` (`GameFragments.kt`) ouvre `getInstalledPacks().firstOrNull()` (ordre `listFiles()` indéfini) avec repli `assets/reference-5poi.json` ; `PackManager` installe sous `packs/<gameId>_<ts>` (zip vérifié) ou `packs/<gameId>_<ts>` (JSON brut, manifest reconstruit) sans métadonnées d'installation ni tri.

## Goals / Non-Goals

**Goals:**
- Toutes les voies d'import atteignables partout.
- Le pack ouvert après import est toujours le pack installé.
- Rejouer un jeu installé sans réseau ni réimport, avec garantie d'intégrité à l'ouverture.

**Non-Goals:**
- Suppression/renommage de packs (pas de gestion de bibliothèque).
- Doublons : réimporter un pack identique garde le comportement actuel (dossier horodaté, réutilisation si identique côté catalogue).
- Catalogue distant (inchangé).

## Decisions

- **Identifiant de pack en argument de navigation** plutôt que « dernier installé deviné » : déterministe, sans état global ; `firstOrNull()` reste le défaut à froid.
- **Tri par date de modification du dossier** (`lastModified`, descendant) pour `getInstalledPacks()` : pas de fichier d'index à maintenir ; dossier horodaté déjà existant.
- **Métadonnées lues, pas stockées** : `gameId` (lu de `game.json`), version (schéma), date (`lastModified` du dossier), état (re-vérification SHA-256 live à l'ouverture via `verifyFiles` existant).
- **Re-vérification à l'ouverture du catalogue local** : même `verifyFiles` que l'import (refus + fichier nommé), jamais de lancement aveugle.
- **`NestedScrollView` autour du contenu existant** : layout uniquement, aucune logique touchée.

## Risks / Trade-offs

- [Risk] `lastModified` du dossier mutable par l'OS (copie, backup) → Mitigation : tri indicatif seulement ; l'ouverture après import passe par l'argument, jamais par le tri.
- [Risk] Re-vérification coûteuse sur gros packs → Mitigation : SHA-256 local rapide, pas de réseau ; acceptable à l'ouverture explicite.
- [Risk] Doublons visuels si même jeu réimporté → Mitigation : affichage `gameId` + date, l'utilisateur distingue ; déduplication hors périmètre assumée.

## Migration Plan

Aucune migration : packs existants déjà sous `packs/<gameId>_<ts>` avec `game.json` lisible. Rollback = revert.

## Open Questions

Aucune.

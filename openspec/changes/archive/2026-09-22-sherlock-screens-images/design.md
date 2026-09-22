## Context

Voir proposal.md (Why). État observé : `game-sherlock-holmes.json` valide
C1+C2 (vérifié via `validateGame`), 9 Nœuds dont 8 joueurs sans `screen`,
pas de `global.screen`. Types TS (`ScreenDefinition`, widgets, styles) et
templates (`basic-story`, `quiz-focus`, `map-fullscreen`, `clue-focus`,
`inventory-view`) existent dans `studio/src/game/`. 10 assets présents ;
manquent les visuels baker, strand, stbarts, moriarty (source+dérivée) et
fin. Manifest `{path, size, sha256}` à régénérer. Sous-schémas : `source` /
`derivee` optionnels pour DIFFERENCE_GAME, `tileRows`/`tileCols` supportés
pour PUZZLE. Contrainte : graphe et schéma inchangés, tout asset embarqué.

## Goals / Non-Goals

**Goals:**

- Habiller les 8 Nœuds joueurs + `global.screen` avec écrans, widgets et
  images, manifest régénéré, jeu vert C1+C2 et partie jouable offline.
- Méthode reproductible et vérifiable (garde-fous automatiques, pas
  d'édition aveugle).

**Non-Goals:**

- Aucune évolution du schéma, du registre, du runtime ou du Studio (ils
  sont seulement consommés) ; aucun changement de graphe, de difficulté ou
  de mode ; aucune traduction i18n des nouveaux textes.

## Decisions

- **D1 — Habillage par édition JSON outillée + `validateGame` en garde-fou**
  plutôt qu'édition manuelle dans le Studio : le format persisté est
  identique (le Studio écrit le même JSON), et chaque étape est revalidée
  C1+C2 immédiatement. Alternative (tout faire au clic dans le WYSIWYG)
  rejetée : non rejouable et sans diff relisible.
- **D2 — Templates embarqués comme points de départ, puis déclinaison par
  Nœud** (titres/textes, images, styles) : respecte la sémantique
  modèle→déclinaison des specs ; les templates restent intacts.
- **D3 — `global.screen` de type `basic-story` aux couleurs du branding**
  avec styles globaux (Georgia, tailles, couleurs) : les Nœuds qui n'ont
  besoin que d'une surcharge partielle héritent du reste (global → écran →
  widget), ce qui minimise le JSON.
- **D4 — Mapping Nœud → template** : start→`basic-story` (fond
  baker-street), baker→`quiz-focus`, scotland→`clue-focus`,
  strand→`clue-focus`, stbarts→`map-fullscreen`, holmes→`basic-story`,
  moriarty→`clue-focus`, fin→`quiz-focus`. Le `pool` structurel reste sans
  screen (jamais ACTIVE, jamais rendu).
- **D5 — Nouveaux assets sobres et offline** (jpg/svg légers, pas de 7 Mo
  comme baker-street si possible) + manifest régénéré avec SHA-256 réels ;
  toute image non-image ou hors-pack est refusée avant export.
- **D6 — Compléter `moriarty.source`/`derivee` et `scotland.tileRows`×
  `tileCols` (3×3)** : sans eux les étapes existent mais ne sont pas
  réellement jouables ; les polygones `%` existants sont conservés tels quels.

## Risks / Trade-offs

- [Risk] Un nouveau visuel ne correspond pas à l'ambiance victorienne →
  consigne de style dans les tasks (palette du branding, trait sobre) et
  relecture visuelle avant export.
- [Risk] Poids total du pack (baker-street.jpg ≈ 7 Mo) → préférer des
  assets légers pour les nouveautés ; afficher la taille totale avant
  téléchargement reste possible via le manifest.
- [Risk] Dérive du graphe pendant l'habillage (édition accidentelle
  d'activation/effets) → diff JSON restreint aux clés `screen`, `data`
  visuels et `global.screen` ; `validateGame` C1+C2 après chaque étape.
- [Trade-off] Textes d'ambiance rédigés par l'implémenteur, pas par un
  auteur métier : qualité littéraire fonctionnelle mais perfectible, sans
  impact sur la validité.

## Migration Plan

Non applicable (contenu de démonstration, pas de déploiement) : le jeu
habillé remplace le fichier existant, l'ancien graphe étant inchangé tout
rejeu reste compatible ; rollback = `git checkout` du JSON et des assets.

## Open Questions

- Source exacte des 6 nouveaux visuels (génération IA vs fourniture par
  l'auteur) : sans effet sur specs, approche ou découpage — les tasks
  prévoient les deux voies avec validation du format/poids à l'intégration.

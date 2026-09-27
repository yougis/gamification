## Why

Le HOME doit devenir un écran-hub : un écran composé comme les étapes, point de base du jeu (arrivée et entre les POI), donnant accès à la carte. Aujourd'hui il n'existe que deux moitiés non fusionnées — le canvas `global.screen` (contenu auteur) et le tableau de bord dérivé (contenu moteur) — et aucune carte n'est affichable depuis HOME ni depuis un écran d'étape. Ce change introduit le premier widget lié (strate 2) : la cartographie.

## What Changes

- Nouveau variant de widget `map` (strate 2, strictement passif : zéro transition, zéro event) :
  - `source: steps` (filtre par défaut : étapes découvertes uniquement, jamais de fuite discovery).
  - Fonds interchangeables **pack-only** (tuiles pré-chargées / plan indoor / fond uni), jamais de réseau.
  - Styles POI par état moteur (`LOCKED` / `UNLOCKED` / `ACTIVE` / `COMPLETED`) via icônes configurables avec défauts.
  - Clic marqueur → volet **composé par l'auteur** dans l'écran (widgets strate 1 + contexte POI sélectionné) ; un **volet par défaut** (texte + bouton d'accès au POI, actif seulement si le POI est déverrouillé) est créé de base à la pose du widget.
  - Bouton à état lié : label/activation dérivés de l'éligibilité (`Ouvrir` / `Verrouillé`), action = présenter l'éligible (zéro event, comme la proposition tête-de-file actuelle).
- Invariant 3 strates verrouillé en spec : seul le widget `module` (strate 3) a des effets moteur ; tous les autres widgets sont passifs. Le champ `source` reste ouvert par construction pour les futurs widgets liés (tableau, messages, timer) — **hors périmètre** de ce change.
- Schéma graphe Noeuds/Liens **inchangé** ; extension du schéma écrans (variante `map` au discriminant Widget, `additionalProperties: false`).

## Capabilities

### New Capabilities

- Aucune (pas de nouveau spec top-level ; le widget vit dans les specs écrans existantes).

### Modified Capabilities

- `studio-screen-builder`: variante `MapWidget` (source steps, fonds, styles POI par état, volet composé + volet par défaut, bouton à état lié), invariant 3 strates, champ `source` ouvert.
- `viewer-orchestrator`: rendu joueur du widget carte (fond pack, marqueurs + états, position, sélection → volet, bouton Ouvrir/Verrouillé passif), règles plein écran / retour Accueil si applicables au périmètre.
- `studio-authoring`: canvas auteur du widget carte (réutilise le moteur carto de la vue Composer, aperçu statique non interactif), panneau propriétés (source, fonds, styles POI, volet), volet par défaut à la pose.

## Impact

- **Schéma Draft-07** (`studio/src/game/schema/game-schema.json`) : +1 variante Widget ; consommateurs : Studio MCP (validation AJV), runtime natif/PWA (rendu), validateur applicatif (cohérence source/filtre), packaging offline (fonds = assets manifest, tuiles déjà couvertes).
- **Studio** : `types.ts` (union Widget), renderer canvas + propriétés, réutilisation `MapView.tsx` (marqueurs/cercles/positions) en mode statique auteur.
- **Players** : renderer interactif PWA + Compose (position, sélection → volet) ; tuiles pack partagées avec la carte standalone.
- **Réseau** : aucun à aucun moment du parcours joueur (fonds pack-only) — pas d'exception à l'offline-first.
- **Compatibilité** : jeux existants sans widget `map` inchangés ; widget inconnu sur vieux moteur = placeholder non bloquant (politique ignore gracieux des types inconnus, comme les modules).
- Aucune dépendance à un change non archivé ; pas de touche à `CONDITIONAL`/`WINDOW` ni au registre de modules.

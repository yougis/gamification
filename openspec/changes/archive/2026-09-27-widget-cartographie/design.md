## Context

- Widgets existants (`studio/src/game/types.ts` : union `text | image | button | progress | module | spacer`), `ButtonWidget` portant déjà `action?` et `icon?`. Schéma Draft-07 (`studio/src/game/schema/game-schema.json`) avec discriminant Widget + `additionalProperties: false` par variante.
- Moteur carto auteur existant (`studio/src/components/MapView.tsx` : marqueurs depuis conditions `GEOFENCE`, cercles, tuiles `/tiles`, plans indoor, sélection synchronisée). Tableau dérivé existant (`apercu-accueil.ts`, `BlocsAcces.tsx` : règle carte si `MAP` en présentation).
- Invariants : offline-first (manifest SHA-256, fonds pack-only), passivité du hub (zéro transition/event hors `module`), exclusivité des vues, compat ascendante (types inconnus = placeholder non bloquant).

## Goals / Non-Goals

**Goals:**
- Variante `MapWidget` strate 2 au schéma, avec `source steps` (filtre `discovered` défaut), fonds pack-only, `poiStyle` par état, volet composé + défaut (texte + bouton à état lié).
- Aperçu auteur statique réutilisant le moteur carto ; panneau propriétés complet via opérations MCP nommées (undo/redo).
- Rendu joueur passif (sélection → volet → présentation d'éligible, zéro event) + plein écran depuis HOME avec retour Accueil.

**Non-Goals:**
- Widgets tableau, messages, timer, sac-à-dos (changes futurs ; seul le champ `source` reste ouvert).
- Bouton générique `open-widget` inter-écrans (le bouton du volet est lié au POI sélectionné, pas un renvoi arbitraire).
- Modification du graphe Noeuds/Liens, du registre de modules, du cycle d'états, de la file FIFO.

## Decisions

1. **Variante schéma, pas module registre** : la carte est présentation pure sans complétion — un type Widget discriminant (`type: "map"`) plutôt qu'une entrée registre. Alternative (module `MAP`) rejetée : elle aurait imposé activation/COMPLETED à un affichage et exigé un nœud, alors que HOME est global.
2. **Filtre `discovered` par défaut** : protège la mécanique discovery (escape/treasure-hunt) ; `all` explicite + avertissement C2. Alternative (tout afficher) rejetée : éventement des étapes cachées.
3. **Fonds en enum fermée pack-only** : `pack-tiles | indoor-plan | solid`, pas de champ URL — l'offline-first est structurel, pas une option. Réutilise tuiles/plan déjà couverts par le manifest.
4. **Volet composé + défaut** : `volet.widgets` (strate 1 + contexte POI sélectionné) ; défaut texte + bouton créé à la pose, jamais réappliqué. Compromis entre composabilité (A) et immédiateté (B) explorés : le défaut donne B au départ, l'édition donne A ensuite.
5. **Bouton à état lié, pas nouveau type** : le bouton du volet dérive label/activation de l'éligibilité du POI contexte ; `Ouvrir` = présentation d'éligible existant (zéro event). Pas d'action `open-widget` générique dans ce change (identifiants stables de widgets inexistants — repoussé avec les widgets plein écran génériques).
6. **Plein écran navigation (pas overlay)** : depuis HOME, remplace HOME, retour via entrée Accueil ; un seul à la fois (remplacement) ; inaccessible pendant modale ACTIVE (vues exclusives). Réutilise les contrats existants (icône toolbox, overlay fermable) adaptés en navigation.
7. **Auteur = moteur carto en statique** : `MapView` réutilisé sans interaction joueur (sélection canvas = sélection d'édition existante, pas sélection joueur). Aucune mécanique dans le canvas auteur (règle déjà portée par les screenPlugins).

## Risks / Trade-offs

- **Contexte POI dans le volet** : champs liés (`nom`, `état`, `rebours`) à définir au niveau implémentation — risque de mini-langage de templates ; mitigé en restreignant aux 3 champs nommés.
- **Parité 3 renderers** (canvas auteur, PWA, Compose) : tout écart visuel est un bug de contrat — les scenarios de la spec font foi, le terminal simulé Studio sert de référence en attendant le renderer natif (constat de périmètre existant).
- **Icônes par état sans couleur seule** : les défauts doivent rester distinguables en monochrome (a11y) — à vérifier à l'implémentation.
- **`filter: all` + discovery** : avertissement seulement (pas de rejet) — un auteur peut volontairement éventer ; c'est assumé et tracé.

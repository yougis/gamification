## Context

Voir proposal.md (Why). État actuel observé :
- `studio/src/App.tsx:2287` : famille épreuve = dropdown `TYPES_MODULE` + résumé besoins registre + inline questions QUIZ (`2317`) + textarea JSON expert (`2339`). Rien d'autre par type.
- `studio/src/App.tsx:2114` `PanneauModule` : rend le `propertiesPanel` du plugin câblé sur `node.module.data` (opération `modifierNoeud`), props `globalDefaults` / `onPickFile` / `lectureSeule`.
- `PanneauModule` n'est consommé qu'en un point (`App.tsx:1260`, `modulePanel` du `PropertiesPanel` WYSIWYG, vue screen, widget module sélectionné).
- Plugins existants : `quiz.tsx`, `puzzle.tsx`, `code-input.tsx` (+ `minigame-params.tsx` pour essais/temps hérités). Branchés dans `studio/src/game/modules.ts` (une ligne par type).
- Schémas : `difference-game.json` (`source`, `derivee`, `polygons`, `touchDilatation`), `ar-marker.json` (`marker`, `model`, `fallback2D` requis), `boussole.json` (`toleranceDeg` requis, `stabilizationMs`, `fallback`). Relecture overlay polygones existante (`ReviewOverlay`, lecture seule).

## Goals / Non-Goals

**Goals:**
- Chaque champ requis au schéma de chaque mini-jeu est renseignable en formulaire sous le dropdown, sans JSON et sans WYSIWYG.
- Un seul formulaire par module (fini l'inline QUIZ en double).
- Les formulaires existants (WYSIWYG) et nouveaux partagent le même composant.

**Non-Goals:**
- Rendre jouables les 3 modules dans le terminal « Jeux » (`playerRenderer` : aperçus statiques, `PlayerFallback` conservé — chantier séparé).
- Persistance/versioning au-delà du JSON courant (`modifierNoeud`, undo/redo existants).
- Refonte du tracé polygones côté relecture (l'overlay reste lecture seule).

## Decisions

- **Réutiliser `PanneauModule` tel quel dans la famille épreuve**, sous le bloc besoins registre, avec les mêmes props (`globalDefaults={game.global?.minigameDefaults}`, `onPickFile={prendreImage}`, `lectureSeule`, `editGame`). Alternative écartée : dupliquer les champs dans l'Inspecteur (double maintenance, divergence garantie avec le WYSIWYG).
- **Supprimer l'inline questions QUIZ** de l'Inspecteur (remplacé par le panneau registre, qui couvre questions + options + score + timer). Alternative écartée : garder les deux (c'est le doublon actuel, source de confusion signalée).
- **Nouveaux plugins calqués sur `code-input.tsx`** (accordéon + `ImagePicker` + `MinigameParamsAccordeon`), une ligne de branchement chacun dans `modules.ts`. Aperçus éditeur statiques : source + polygones (7-erreurs), marqueur + fallback (RA), rose des vents + tolérance (boussole).
- **Traceur polygones pragmatique** : clics sur l'image source convertis en % via le rectangle affiché, polygone fermé par bouton/double-clic, liste avec suppression, coordonnées stockées en % (responsive, dilatation inchangée). Pas de drag de sommets ni d'édition affine (reportés : la relecture overlay suffit à contrôler).
- **Ordre d'implémentation** : surface d'abord (tâche 1 : les 3 modules existants deviennent configurables sous le dropdown), puis boussole, RA, 7-erreurs (croissant en taille).

## Risks / Trade-offs

- [Risk] Conversion clic → % faussée par le redimensionnement CSS (letterboxing `object-fit`) → Mitigation : mesurer le rectangle réellement affiché (`getBoundingClientRect` de l'image rendue) et normaliser dessus, pas sur le conteneur.
- [Risk] `PanneauModule` dans l'Inspecteur double le montage du même panneau (WYSIWYG + Inspecteur) → Mitigation : un seul est visible à la fois (vues exclusives), état local par instance, écritures via la même opération `modifierNoeud`.
- [Risk] Régression tsc (baseline ~99) → Mitigation : compteur avant/après, zéro nouvelle erreur.

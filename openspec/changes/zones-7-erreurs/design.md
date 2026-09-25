## Context

Voir `proposal.md`. État observé : `ZoneTracer` (rectangles clic-glissé en %, `min 1 %`, liste + suppression) utilisé dans `DifferencePropertiesPanel` ; `ReviewOverlay` en lecture seule avec cadre 16:9 imposé (`paddingTop: "56%"`) ; schéma `difference-game.json` rects `{x,y,w,h}` stricts ; `hitTest(rects, px, py, dilatation)` côté Studio, à porter côté player ; `ECRANS` extensible (précédent : Inventaire 8e écran).

## Goals / Non-Goals

**Goals:**
- Atelier de zonage utilisable : grand format, ratio vrai, deux outils.
- Détail léger mais fidèle + renvoi (pas d'édition au rabais dans un volet de 300 px).
- Polygones supportés de bout en bout (schéma → traceur → hitTest → player).

**Non-Goals:**
- Édition multi-nœuds comparée, magnétisme/accrochage, édition au clavier des sommets.
- Autres éditeurs par module dans l'écran Modules (l'écran est créé pour le 7-erreurs ; l'extension suivra le même pattern plus tard).

## Decisions

- **Union rect | polygone, pas remplacement** : les rectangles existants (Sherlock) restent valides ; le validateur et le joueur gèrent les deux (point-dans-polygone + dilatation en marge). Alternative écartée : polygones seuls avec migration — casse inutile pour un gain nul.
- **Ratio depuis les dimensions naturelles** (`naturalWidth/Height` au chargement, fallback 16:9 si non chargée) : une seule source de vérité, détail/éditeur/Relire partagent le même composant d'aperçu proportionné. Alternative écartée : ratio saisi à la main — donnée en dur déguisée.
- **Écran Modules, pas onglet du détail** : tracer des polygones au doigt/souris exige de la surface ; le détail garde l'aperçu + le renvoi (deep-link : écran + nœud sélectionné). Relire reste lecture seule (séparation valider/éditer du socle).
- **Même op nommée partout** : ajout/suppression de zone (rect ou polygone) = une entrée undo, quel que soit l'écran d'origine.

## Risks / Trade-offs

- [Polygones auto-croisés] → acceptés au tracé (le point-dans-polygone reste défini par parité), signalés en validation souple sans bloquer ; durcir plus tard si besoin réel.
- [Image lourde en grand format] → l'éditeur affiche le fichier pack tel quel (déjà manifesté) ; pas de miniature intermédiaire dans ce change.
- [KMP hitTest polygones] → à implémenter en miroir (tâche dédiée) ; en attendant, le fallback existant s'applique.

## Migration Plan

Aucune (union rétrocompatible). Rollback = retirer l'écran Modules et l'outil polygone (les polygones tracés entre-temps seraient rejetés en C1 — cas dev-only documenté).

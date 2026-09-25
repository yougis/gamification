## Why

L'édition des zones du 7-erreurs est à l'étroit et incomplète : le traceur (clic-glissé, rectangles seuls) vit dans l'étroit volet détail sans aperçu proportionné à la source, l'overlay de Relire fige les zones en 16:9 quel que soit le ratio réel (zones déformées), et le schéma n'accepte que des rectangles `{x,y,w,h}` alors que les différences réelles sont souvent polygonales. Il faut un vrai atelier de zonage : aperçu proportionné, outillage rectangle + polygone, et un écran dédié.

## What Changes

- Nouveau menu Studio « Modules » (entrée nav) hébergeant l'éditeur de zones du 7-erreurs en grand format : image source à son ratio réel, calque de zones superposé en %, outils rectangle (clic-glissé, existant) ET polygone (clic = sommet en %, fermeture = zone, liste + suppression), le tout via l'opération nommée existante (undo natif).
- Le volet détail du Composer garde un aperçu réduit STRICTEMENT proportionné à la source (ratio conservé depuis les dimensions naturelles de l'image, zones en %) + un bouton « Éditer les zones » renvoyant vers l'écran Modules avec le bon nœud sélectionné.
- L'overlay de Relire reste en lecture seule (la relecture valide, elle n'édite pas) mais adopte le même rendu proportionné (fini le cadre 16:9 imposé).
- Schéma `difference-game.json` : les items de `polygons` deviennent une union `rectangle {x,y,w,h}` OU `polygone {points: [{x,y}...]}` (au moins 3 points, `additionalProperties: false` des deux côtés) ; `hitTest` (avec `touchDilatation`) gère les deux formes, côté Studio comme côté player. Rétrocompatible : les rectangles existants (Sherlock : 1 zone) restent valides sans migration.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `studio-authoring` : écran Modules (nav + éditeur 7-erreurs), aperçu réduit proportionné + bouton de renvoi dans le détail, overlay Relire proportionné en lecture seule.
- `module-screen-plugins` : traceur rectangle + polygone, aperçu proportionné avec dimensions naturelles.
- `minigame-modules` : zones 7-erreurs rectangulaires OU polygonales, validation des deux formes.

## Impact

- Studio : nouvel écran (`ECRANS`), `ZoneTracer` étendu (mode polygone), `DifferencePropertiesPanel` (aperçu + renvoi), `ReviewOverlay` (ratio réel), `difference-game.json`, `hitTest`.
- Schéma graphe : racine Noeuds/Liens inchangée (sous-schéma monté en `$ref`) ; C1 7-erreurs étendue (union) — consommateurs : validateur AJV des deux côtés, renderers/players (hitTest polygones à porter côté KMP), jeu Sherlock (valide inchangé, rectangle conservé).
- Ne touche pas aux valeurs réservées CONDITIONAL/WINDOW, n'ajoute aucun module au registre.
- Aucune connexion réseau (images/assets locaux + manifest).
- Aucune dépendance à un change précédent non archivé.

## Context

État vérifié dans le code : `MapWidgetRenderer.tsx` (canvas auteur, `pointer-events-none`) affiche la pastille « Pack actif » ; `MapView` (Composer) est déjà navigable (MapLibre + NavigationControl) ; côté player partagé, `MapWidgetBlock` (`player/shared/.../ui/map/MapWidget.kt`) possède sélection, `VoletCarte` (titre + Ouvrir/Verrouillé + Fermer) et plein écran, mais viewport fixe bbox-fit et paramètre `position` jamais alimenté par `GeoPlayNav` ni `ScreenRenderer` ; `PlayerTerminal` ne rend aucun widget carte. Voir proposal.md (Why) et les deltas de specs pour le contrat.

## Goals / Non-Goals

**Goals:**
- Phase 1 : retirer la pastille auteur visible + amender le delta avant archive.
- Phase 2 : viewport navigable + GPS alimenté côté player partagé (natif + PWA via même contrat).
- Phase 3 : carte interactive simulée dans le terminal (position simulée, volet simu).

**Non-Goals:**
- Fond raster offline player depuis les octets (différé, schématique conservé).
- Canvas auteur interactif (passivité spec'd, inchangée).
- Nouveau provider, nouveau fond, nouveau widget.

## Decisions

### D1: Pastille retirée, titre et badge conservés

**Choix:** Supprimer uniquement le `<span puce>` visible ; garder le `title` « Pack actif » et le badge « aperçu en ligne ».

**Raison:** La demande vise le bruit visuel du screen, pas l'information (titre/badge restent utiles au survol et pour la phase B). Amendement du delta `pack-tuiles-effectif` avant archive, smoke mis à jour.

### D2: Viewport = état local Compose, gestes standard

**Choix:** `offset + zoom` en `remember` dans `MapWidgetBlock`, drag/pinch via `transformable` (ou pointerInput), boutons +/- et recentrage en overlay, marqueurs repositionnés par projection sur le viewport (même math que `positionRelative`, paramétrée par la fenêtre visible).

**Raison:** Zéro changement de contrat strate 2 (aucun event/transition, comme sélection/volet) ; même code natif + PWA via le partagé ; accessibilité desktop via boutons (le tactile seul est exclu par les règles du Studio).

### D3: GPS via le paramètre `position` existant

**Choix:** Alimenter `position: Pair<Double, Double>?` depuis la source plateforme (`LocationProvider` natif expect/actual, Geolocation PWA), avec absence gracieuse (`null` = carte complète sans point).

**Raison:** Le paramètre et le point existent déjà (cercle bleu) ; seuls les deux appelants l'ignorent. Pas de nouveau modèle, pas de permission exigée (refus = `null`, jamais bloquant).

### D4: Preview Studio = nouveau composant dédié, pas MapView réutilisée

**Choix:** Nouveau composant interactif dans le terminal (tuiles proxy `/tiles`, position simulée de l'état d'essai, volet simu), plutôt que réemploi de `MapView`.

**Raison:** `MapView` est orientée édition (sélection inspecteur, calibration, onglets étages) ; la détourner mélangerait les concerns auteur/joueur. Le composant preview lit le même état simu que le reste du terminal (file, tirages, journal inchangés).

## Risks / Trade-offs

- **[Amendement pré-archive]** → `pack-tuiles-effectif` est `complete` : retoucher son delta exige de re-valider avant archive. Mitigation : amendement minimal (une exigence), re-`validate` immédiat.
- **[Gestes vs clic POI]** → Le drag peut avaler le tap sur marqueur. Mitigation : seuil de déplacement (tap = clic si < 8dp), même pattern que le puzzle (`presse`/`taper`).
- **[Position simulée vs réelle]** → Risque de confusion auteur. Mitigation : badge SIMULÉ permanent sur le point (même langage que les events simulés), jamais le GPS du poste.
- **[Perf viewport]** → Reprojection à chaque frame de geste sur <100 marqueurs : négligeable ; les cercles suivent la même projection.

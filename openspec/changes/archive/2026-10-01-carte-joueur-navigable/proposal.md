## Why

Le widget carte côté player affiche aujourd'hui une vue figée (bbox-fit, aucun déplacement, aucun zoom) et ne montre jamais la position GPS du joueur (`position` jamais alimentée par les deux appelants de `MapWidgetBlock`) ; le terminal simulé du Studio ne rend aucun widget carte. Pendant ce temps, la pastille auteur « Pack actif » pollue le canvas. Ce change rend la carte jouable des deux côtés : navigable et géolocalisée côté natif/PWA, prévisualisable avec position simulée dans le Studio, sans toucher au canvas auteur passif.

## What Changes

- **Phase 1 — pastille auteur** : retrait du `<span puce>` « Pack actif » de `MapWidgetRenderer` (titre et badge conservés) + amendement du delta `studio-screen-builder` de `pack-tuiles-effectif` avant son archive + mise à jour du smoke.
- **Phase 2 — player natif/PWA navigable** : état viewport local (pan drag + pinch, boutons +/-, recentrage) dans `MapWidgetBlock`, sans transition ni event (même passivité que sélection/volet) ; alimentation GPS via le paramètre `position` existant (source `LocationProvider` natif, point + recentrage optionnel, absence gracieuse hors GPS).
- **Phase 3 — prévisualisation Studio** : rendu interactif du widget carte dans `PlayerTerminal` (tuiles via proxy `/tiles` existant, position simulée depuis l'état d'essai, clic POI → volet simu avec Ouvrir présentant l'étape comme le simu existant).
- **Différé (hors périmètre)** : fond raster offline depuis les octets du pack côté player (le schématique reste correct en attendant).

## Capabilities

### Modified Capabilities
- `viewer-orchestrator`: carte joueur navigable (viewport pan/zoom tactile + boutons, sans event) et position GPS du joueur alimentée sur la carte.
- `studio-authoring`: prévisualisation interactive du widget carte dans le terminal simulé (position simulée, volet simu).

## Impact

- `player/shared/.../ui/map/MapWidget.kt` (`MapWidgetBlock`, `GeoPlayNav.kt`, `ScreenRenderer.kt`) : viewport + feed GPS (phase 2) ; contrat strate 2 inchangé (zéro transition/event).
- Natif Android/iOS : source `LocationProvider` (expect/actual, stubs existants à vérifier) alimentant `position` ; PWA : Geolocation navigateur avec même contrat.
- `studio/src/components/wysiwyg/widgets/MapWidgetRenderer.tsx` : retrait pastille (phase 1) ; canvas auteur restant passif par spec.
- `studio/src/components/wysiwyg/PlayerTerminal.tsx` (+ nouveau composant preview carte) : phase 3, position simulée depuis l'état d'essai.
- Amendement du delta `specs/studio-screen-builder/spec.md` de `pack-tuiles-effectif` (terminé, non archivé) : retrait de l'exigence pastille avant archive.
- Aucune modification du schéma graphe ; aucun réseau côté joueur (tuiles d'aperçu Studio uniquement, comme la phase B de `pack-tuiles-effectif`).
- Dépend de `pack-tuiles-effectif` (terminé, en attente d'archive) pour pack actif, résolveurs de fond et octets serveur.

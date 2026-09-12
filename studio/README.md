# Studio GeoPlay — spike (change 200)

Maquette fonctionnelle du Studio d'auteur : canvas graphe, formulaires,
validation couches 1+2, outils MCP, preview scriptée, export pack.

## Lancer

```bash
cd studio
npm install
npm run dev
```

## Périmètre spike vs 200

- Fait : canvas (nœuds draggable, liens = `NODE_COMPLETED`, undo/redo),
  éditeur questions QUIZ + formulaires GEOFENCE/NODE_COMPLETED/TIMER/POOL_DRAWN/
  PROXIMITY_MASTER + `randomPool` (autres modules en JSON brut validé), AJV live
  à l'édition + à l'export, outils MCP (`composeNodes`, `setActivation`,
  `registerAsset`, `validateGame`, `buildManifest` via `exportPack`), provenance
  + statuts, overlay de relecture 7-erreurs, overrides JSON, i18n verrouillée +
  simulation retraduction, preview scriptée (bypass, `forceDraw`, `sessionId`,
  flag triche), test 5 branches en 1 clic, export `game.json` + `manifest.json` +
  `studio-meta.json`.
- UX créateurs (français, Tailwind v4) : barre haute (Valider, Exemple, Exporter,
  animateur), palette de blocs (Étape, Lieu GPS, Tirage, Fin), inspecteur en
  5 familles, barre d'état (validité, étapes, fin, impasses), impasses en rouge
  (lignes animées), préréglages de rayon (Piéton 15 m, Parc 30 m, Vélo 50 m,
  Forêt 60 m), simulateur de signal GPS (vert 5 m / orange 15 m / rouge 40 m)
  branché sur le gating `maxAccuracyM`. Glossaire centralisé `src/game/i18n-ui.ts`.
- Stubs assumés : formulaires modules hors QUIZ en JSON brut, manifest assets
  saisis à la main (SHA-256 vérifié au format), pas de lib canvas imposée
  au-delà de ce spike.
- Schéma et fixture copiés de `openspec/changes/archive/2026-09-12-100-*`
  (source opposable : le change 100, pas ce dossier).

## Vérifications

- `npx tsc -b` : 0 erreur.
- `npm run dev:smoke` : fixture 5 POI verte C1+C2, 5 branches forcées vers FIN.

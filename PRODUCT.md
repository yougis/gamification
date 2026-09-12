# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Primary: creators (collectivités, offices de tourisme, musées, opérateurs événementiels) composing geolocated games in the Studio; animators framing groups on the field and testing / forcing draws; visiting players (families, scolaires, event groups) playing 1h outdoor sessions offline on iOS / Android.

Other audiences only when confirmed; no invented personas.

## Product Purpose

GeoPlay is a factory for offline geolocated games, not a single game. It lets creators compose a Node-graph game, have it reviewed, export a verified offline pack, and lets players download once then play 100% offline with map, compass, puzzles and AR to a defined ending. Success = a reusable attraction that works on terrain without network and remains maintainable via versioned packs.

## Positioning

Generic game factory with one opposable JSON graph (Nodes + `activation.requires/operator`) + versioned extensible module registry, same schema Studio and runtime, offline packs verified file-by-file (SHA-256). A neighboring product offering a single hard-coded treasure hunt could not truthfully copy the graph + registry + double-layer validation mechanism.

## Operating Context

Creator workflow: compose graph → fill modules → review `draft|reviewed|published` with provenance → validate layers 1+2 → export pack → diffuse (QR, lien, borne). Animator workflow: installs pack, previews with cheat bypass (`GEOFENCE` bypass, Quiz auto-validation, `forceDraw`), forces draws when needed (cheat flag traced). Player workflow: download pack on network → play offline → terminate on an `isEnding` node → scores logged for later resync.

Environments: exterior, dense forest, buildings / caves without GPS, sun glare, metal interference, 1h battery-calibrated sessions. Tools / materials: Studio web canvas + MCP, native player apps (files + SQLite + pre-tiled maps), GPX author trace as display polyline only.

## Capabilities and Constraints

Confirmed: oriented Node graph, single `activation` object per Node, strict `AND|OR` operator, states `LOCKED→UNLOCKED→ACTIVE→COMPLETED` with single ACTIVE modal + queue, per-Node `latch`, revocable `GEOFENCE`/`PROXIMITY_MASTER` only, `allowCycle` (edge) vs `onReentry/replay/maxReentries/scoreOnReplay` (node), structural `RANDOM_POOL` (`candidates/drawCount/drawTiming`, no replacement, persisted `randomDraws[sessionId]`), explicit `isEnding` termination, Draft-07 + applicative validation, registry base types `QUIZ, DIFFERENCE_GAME, PUZZLE, AR_MARKER, BOUSSOLE`, all radii / predicates / thresholds read from JSON never hard-coded.

Constraints: offline-first after download — partial manifest never launchable; unknown / reserved module or condition types ignored gracefully, never crash; `draft` unplayable except animator-cheat mode; cheat / preview events always flagged.

Explicitly undecided / deferred to changes 600-640: sync-scoring-master, branding tokens + system modes beyond cheat/preview, full i18n-difficulty pipeline, `WINDOW onMiss`/recurrence + gamebook `CONDITIONAL`, full a11y / battery / SOS suite.

## Brand Commitments

Name GeoPlay. French-first creator vocabulary in Studio spike (centralized glossary `src/game/i18n-ui.ts`). Generic platform voice — no single-game theming baked into framework. No logo / palette / type commitment recorded; do not invent.

## Evidence on Hand

Real: `docs/cahier-specifications-geoplay.md`, `docs/dossier-communication-geoplay.md` (incl. Étretat « Lupin et l'Aiguille » demo narrative), `openspec/specs/` (game-graph, game-schema, game-triggers, game-validation, module-registry, proximity, studio-authoring), `openspec/changes/archive/` schema + `game-5poi.json` neutral 1/5→FIN fixture, `studio/src/App.tsx` spike (canvas, inspector, AJV live, preview, export), `studio/README.md`, `ROADMAP.md` (000→500, deferred 600-640).

Absences future work must not fabricate: no player testimonials, customers, benchmarks, pricing, or deployment claims beyond packs above; demo coordinates are examples on public places.

## Product Principles

1. Generic over specific — every feature must serve any creator's game, never one scenario.
2. Terrain truth over demo truth — offline integrity, hysteresis / dwell, and graceful sensor fallback decide.
3. Same schema both sides — no Studio-only state without JSON equivalent; no visual state without export.
4. Author trust is traceable — provenance, review statuses, cheat flags, and validation verdicts are explicit.
5. Extend by registry, not by fork — new play comes as a registry entry, never a Nodes/Links schema edit.

## Accessibility & Inclusion

Known: never color alone — compass arrow pairs with text distance + redundant haptic; Quiz readable in full sun; touch targets dilated for finger / gloves (`touchDilatation` in 7-errors); Bluetooth / WiFi-local permissions requested in-flow with justification. Full voice-over / contrast modes and other inclusion work are roadmap (640), not socle — do not claim them as shipped.

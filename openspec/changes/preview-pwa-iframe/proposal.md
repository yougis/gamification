## Why

La prévisualisation Studio ne permet pas de jouer le vrai jeu : dashboard statique (`pointer-events-none`), boutons d'étape morts (`<span>`, `action` jamais consommée), terminal React qui duplique le rendu joueur au lieu de le réutiliser. Émuler la PWA dans Prévisualiser donne le vrai player (carte navigable, volet Ouvrir, modules) sans développer de 4e interface.

## What Changes

- Écran Prévisualiser embarque la PWA dans une iframe aux dimensions `VIEWPORTS` (téléphone/tablette, portrait/paysage).
- Endpoint Studio `/emulate/*` servant le jeu courant (`game.json`, `manifest.json`, `compat.json`, assets de session) — même esprit que le proxy `/tiles` existant.
- PWA : `?game=<url>` auto-charge un pack depuis une URL, `?cheat=1` pré-ouvre le panneau triche animateur.
- Sessions d'émulation namespacées pour ne jamais polluer les vraies parties (stockage WebStorage séparé).
- Cible PWA configurable : build local (`wasmJsBrowserDistribution`) ou URL déployée stable (défaut conseillé : déployée, zéro build local).
- Terminal React et dashboard statique inchangés dans ce change (cohabitation, pas de suppression).

## Capabilities

### New Capabilities

- `studio-pwa-emulation`: iframe PWA dans Prévisualiser, endpoint `/emulate`, viewports, sessions namespacées, cible configurable.

### Modified Capabilities

- `player-install`: la coquille PWA accepte `?game=<url>` (auto-chargement pack) et `?cheat=1` (panneau triche pré-ouvert).

## Impact

- Code : `studio/vite.config.ts` (ou plugin middleware `/emulate`), écran Prévisualiser (`App.tsx`), `player/web/.../Main.kt` (params `game`/`cheat`, namespace session).
- Aucun changement moteur, schéma, validation, offline-first joueur (l'émulation exige le réseau par nature :PC dev, jamais le terrain).
- Non-couvert ici : vocabulaire `action` des boutons (toujours no-op partout, y compris PWA — change dédié), pont postMessage (marche 2), suppression du terminal React (marche 2).

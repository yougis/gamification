## Why

Le Studio exporte des packs valides et la logique d'évaluation est prouvée en
TS pur, mais aucun exécutable ne les fait tourner : sans Player Android, le
premier jeu jouable sur le terrain n'existe pas. Ce change donne au framework
son application joueur générique : installée une fois, elle importe n'importe
quel pack Studio et le joue 100 % offline.

## What Changes

- Player Android générique (option A) : import de pack (QR, lien, fichier),
  vérification manifest SHA-256 au premier lancement, refus si partiel,
  exécution graphe/orchestrateur/modules, progression SQLite, journalisation
  scores (flag triche), mode animateur in-app.
- Premier pack jouable : `game-5poi.json` comme pack de référence embarqué
  en démo (import QR testé de bout en bout).
- Distribution POC : sideload direct (APK debug) puis Play Interne ;
  permissions justifiées dans le flux (localisation, Bluetooth, caméra).
- APK blanche par jeu (option B) explicitement différée : documentée comme
  pipeline ultérieur (même Player + branding + pack pré-embarqué), jamais
  construite ici.

## Capabilities

### New Capabilities

- `player-install`: import/vérification de pack, exécution offline, progression
  et scores journalisés, distribution Android (sideload puis Play Interne).

### Modified Capabilities

- Aucune (consomme `game-schema`, `viewer-orchestrator`, `offline-pack`,
  `minigame-modules`, `proximity` en lecture).

## Impact

- Nouvelle app `player/` ; consommateurs : Studio (`exportPack` comme source),
  packs existants (aucun changement de format), skills `geoplay-runtime-engine`.
- Réseau requis uniquement à l'import du pack ; jeu 0 réseau ensuite.
- Dépend de : specs 000/100/300/400/500 + `proximity` (toutes archivées et
  synchronisées).

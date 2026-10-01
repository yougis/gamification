## Why

Sur l'écran Importer du player, la carte « Fichier » est inatteignable sur petit écran (layout non scrollable), et surtout la partie lancée après import n'est pas le pack importé : `loadGame` ouvre `packs.firstOrNull()` (ordre filesystem indéfini) au lieu du pack qui vient d'être installé, avec repli silencieux sur le `reference-5poi` embarqué. De plus, il n'existe aucun moyen de recharger un jeu déjà installé sans réimporter : chaque reprise exige de repasser par URL/fichier/QR.

## What Changes

- Écran Importer scrollable (toutes les voies d'import atteignables sur tout écran).
- Ouverture du pack qui vient d'être importé (identifiant passé en argument de navigation) ; `firstOrNull()` ne reste que le défaut au démarrage à froid.
- Catalogue local : liste des jeux installés sur le téléphone (nom, version, date d'installation, état vérifié) avec ouverture directe, triés du plus récent au plus ancien ; re-vérification SHA-256 à l'ouverture, pack corrompu signalé et non lancé.

## Capabilities

### New Capabilities
Aucune.

### Modified Capabilities
- `player-install`: écran Importer scrollable, ouverture du pack importé, catalogue local des jeux installés avec ouverture et re-vérification.

## Impact

- Code app Android uniquement : `fragment_import.xml` (scroll), `GameFragments.kt` (argument pack + `loadGame`, liste locale), `PackManager.kt` (tri par date, métadonnées d'installation, re-vérification à l'ouverture).
- Aucun changement schéma, moteur partagé, validation, offline-first ; clutch budget inchangé.
- Non-couvert : suppression/renommage de packs installés, partage inter-appareils, catalogue distant (existant inchangé).

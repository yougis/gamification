## Why

Quand la validation bloque l'export, l'auteur ne peut accéder au JSON source nulle part : impossible d'inspecter, de partager ou de corriger hors Studio un jeu invalide (cas réel : clés inconnues à la racine et dans `global.screen.zones`, invisibles sans le fichier). Le blocage protège le terrain, mais il ne doit pas confisquer la donnée.

## What Changes

- L'écran Exporter expose, à côté du bouton bloqué, un bouton toujours actif « Télécharger le JSON brut (non valide, debug) » : télécharge `game.json` tel quel (jeu courant, sans manifest, sans SHA, sans assets), avec rappel des causes du blocage.
- Le **pack** reste strictement bloqué tant que C1/C2 ou les statuts l'exigent : le JSON brut n'est jamais un pack (pas de `manifest.json`, pas de `compat.json`, nom de fichier marqué `non-valide`), donc impossible à confondre avec un jeu jouable.
- Aucune écriture : ni JSON modifié, ni historique undo, ni rapport d'export ; le téléchargement ne change aucun état.

## Capabilities

### New Capabilities

- Aucune.

### Modified Capabilities

- `studio-authoring`: l'écran Exporter permet le téléchargement du JSON brut même en cas de blocage, avec rappel des causes ; la porte unique du pack reste inchangée et bloquante.

## Impact

- **Studio** : écran Exporter (`App.tsx`, zone du bouton bloqué + liste des causes) ; réutilise le motif de téléchargement blob existant (`genererPack`).
- **Specs** : `studio-authoring` (delta, exigence « Export à porte unique » complétée).
- **Sécurité** : aucun assouplissement du pack (manifest/SHA toujours exigés pour jouer) ; le fichier brut est impropre au runtime par construction.
- **Réseau** : aucun (téléchargement local).

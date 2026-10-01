## Why

Le catalogue local grossit sans fin : l'ensemencement du `reference-5poi` compare `"reference-5poi"` à des noms de dossiers horodatés (égalité impossible) et réimporte donc à chaque démarrage, et seul l'import catalogue déduplique — réimporter le même JSON par URL/fichier duplique le dossier. Il est en outre impossible de supprimer un jeu et impossible de recommencer une partie terminée (reprise `last_session` sans porte de sortie).

## What Changes

- Règle catalogue stable : **seul l'import ajoute** (tout type) ; contenu identique (même `gameId` + même SHA) → entrée réutilisée ; même `gameId` contenu différent → **remplacement en place** (décision actée).
- Fix ensemencement : test sur le `gameId` lu (plus sur le nom de dossier), drapeau « déjà ensemencé » persisté, suppression respectée (jamais re-créé).
- Supprimer un jeu : action explicite avec confirmation listant la conséquence (dossier supprimé, historique SQLite des sessions conservé orphelin).
- Reset triche : nouvelle session vierge pour ce jeu (historique gardé), visible uniquement si mode animateur actif.
- Aucune limite, aucune éviction : la liste reflète exactement les dossiers installés.

## Capabilities

### New Capabilities
Aucune.

### Modified Capabilities
- `player-install`: catalogue local stable (unicité par `gameId`, suppression, reset triche, ensemencement unique).

## Impact

- Code app Android : `GeoPlayApplication` (seed), `PackManager` (dedupe/remplace/supprime), `ImportFragment` + liste (supprimer, reset triche), prefs (drapeau seed).
- Aucun changement schéma, moteur partagé, validation, offline-first ; clutch sessions/progression inchangé (historique jamais effacé par ces actions).
- Non-couvert : renommage de packs, purge auto, partage inter-appareils.

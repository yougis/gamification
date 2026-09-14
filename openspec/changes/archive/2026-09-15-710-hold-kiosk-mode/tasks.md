## 1. Schema Draft-07

- [x] 1.1 Ajouter `global.holdMode` (enum) et `global.holdExit`
  (objet) au schema JSON avec `additionalProperties:false`
  maintenu. Verifier Draft-07 valide avec l'example
  `game-5poi.json` (champs optionnels, defaut `"none"`)
- [x] 1.2 Ajouter les regles if/then Draft-07 : si
  `holdMode != "none"` alors `holdExit.method` est requis.
  Valider avec un counter-example holdMode sans holdExit
- [x] 1.3 Mettre a jour `game-5poi.json` pour valider que
  l'example passe avec holdMode absent (backward compatible)

**Verification** : `ajv validate` passe sur les jeux existants
sans holdMode et rejette un jeu avec holdMode sans holdExit.

## 2. Runtime / Viewer-Orchestrator

- [x] 2.1 Implementer le verrouillage OS au lancement de
  session : iOS Guided Access / Android Screen Pinning /
  Lock Task Mode selon `global.holdMode`
- [x] 2.2 Implementer le canal d'exit admin : `setHoldExit`
  dans le runtime, verification du PIN en local (SQLite
  chiffre), decription de session HOLD
- [x] 2.3 Implementer la journalisation systématique
  (`sessionStart`, `sessionPause`, `sessionResume`,
  `sessionEnd`, `holdLock`, `holdUnlock`, `holdExit`,
  `holdBlock`, `holdForceExit`) en SQLite avec filtres
  par session et type
- [x] 2.4 Implementer `onPause`/`onStop` behavior : en HOLD,
  le verrouillage OS reste actif, seul le journal est
  mis a jour (pas de pause de l'évaluation sauf kill OS)
- [x] 2.5 Implementer `holdForceExit` et re-join sur
  restart avec le meme `sessionId`

**Verification** : Sur un emulator iOS/Android, le mode
HOLD verrouille le device, le PIN admin le relache, le
journal SQLite contient tous les events.

## 3. Studio MCP

- [x] 3.1 Ajouter `setHoldMode(gameId, mode)` et
  `setHoldExit(gameId, exitConfig)` aux operations MCP
- [x] 3.2 Ajouter `getHoldConfig(gameId)` a l'interface Studio
- [x] 3.3 Verifier que l'export bloque si `holdMode != "none"`
  sans `holdExit` (validation AJV cote Studio)
- [x] 3.4 Ajouter le preview HOLD avec `forceHoldLock` /
  `forceHoldExit` et flag triche + holdMode sur les events

**Verification** : Le Studio peut configurer HOLD pour un jeu,
l'export bloque si incoherent, le preview simule la
sequence HOLD sans modifier le JSON source.

## 4. Module Registry

- [x] 4.1 Ajouter le champ optionnel `needsLock` (bool) a
  l'enregistrement du module dans le registre
- [x] 4.2 Le validateur applicatif rejette si un module
  `needsLock: true` est present avec `holdMode: "none"`
- [x] 4.3 Un module `needsLock: false` (defaut) fonctionne
  normalement meme en mode HOLD (verrouillage global, pas
  de contrainte specifique)

**Verification** : Un jeu avec module `needsLock: true` et
`holdMode: "none"` est rejete en couche 2 avec le message
approprie.

## 5. Game-Validation

- [x] 5.1 Ajouter les regles applicatives HOLD :
  `holdExit` present si `holdMode != "none"`, coherence
  `needsLock`/`holdMode`, format PIN valide
- [x] 5.2 Ajouter les regles Draft-07 : `holdMode` enum valide,
  `holdExit.method` requis si `holdMode != "none"`
- [x] 5.3 Verifier la non-regression : les jeux existants
  (sans holdMode) passent les deux couches

**Verification** : Le validateur rejecte un jeu avec
`holdMode: "lockTask"` sans `holdExit`, accepte les jeux
existants, accepte un jeu HOLD complete.

## 6. Documentation et Roadmap

- [x] 6.1 Mettre a jour ROADMAP.md : ajouter la ligne
  `710-hold-kiosk-mode` entre `640-a11y-battery-sos-tests`
  et la fin
- [x] 6.2 Mettre a jour `openspec/config.yaml` si besoin
  pour refleter le nouveau mode systeme HOLD

**Verification** : ROADMAP.md contient la ligne 710.
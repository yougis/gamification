## Why

Un Jeu valide sur papier est inutile si son pack ne s'installe pas, se corrompt
ou suppose du réseau sur le terrain. Ce change donne au framework son moteur de
packaging et stockage natif : téléchargement vérifié, différentiel et
reprenable, puis exécution 100 % offline (données + carte + progression).

## What Changes

- Manifest `{path, version, size, sha256}` **par fichier**, seul faisant foi pour
  version et intégrité ; archive pré-tuilée dézippée en worker.
- Téléchargement : vérif SHA-256 par fichier (1 fautif = 1 seul re-téléchargé),
  diff par version, reprise, background download. **Partiel = non lançable**
  avec état explicite (progression, fichier fautif).
- Stockage natif fichiers app + SQLite (progression, `randomDraws[sessionId]`,
  tirages ; écriture immédiate, jamais de recalcul).
- Packs carte configurables `{provider, bbox, minZoom, maxZoom, attribution}`
  (MapLibre Native), taille chiffrée **avant** téléchargement, fallback image
  statique ; trace GPX + boussole utilisables sur fond uni.
- **BREAKING** : aucun (premier moteur ; remplace l'hypothèse web bilatéralement
  abandonnée — Service Worker/CacheStorage/localStorage exclus).

## Capabilities

### New Capabilities

- `offline-pack`: manifest, archive, vérification SHA-256, diff/reprise/background,
  packs carte + fallback, stockage SQLite, état partiel non lançable.

### Modified Capabilities

- Aucune (consomme `game-schema` et `module-registry` en lecture).

## Impact

- Nouveau moteur natif (iOS + Android) ; consommateurs : Studio (`buildManifest`,
  `exportPack`), runtime (installation, progression), validateur (règle manifest).
- Réseau requis uniquement au téléchargement/mise à jour ; parcours joueur 0 réseau.
- Dépend de : `100-define-game-schema` (structure + manifest) et `000` (archivé).

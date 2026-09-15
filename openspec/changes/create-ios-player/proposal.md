## Why

Le framework GeoPlay possede deja un Player Android defini dans la spec
`player-install`. Pour toucher le marche iOS et permettre le deployment
sur iPhone et iPad en borne ou en distribution, il faut un Player iOS
compatible avec le meme schema de jeu, le meme systeme de pack offline,
et le meme cycle de progression. Ce changement comble l'absence de
cible native iOS dans le framework.

## What Changes

- **Nouveau Player iOS** : application native iOS capable d'importer un
  pack GeoPlay, de le verifier (manifest SHA-256), de jouer offline et
  de journaliser scores et progression en SQLite.
- **Distribution iOS** : le Player s'installe via TestFlight, Ad Hoc
  ou enterprise, avec gestion des permissions justifiees (localisation,
  Bluetooth, camera).
- **Parite fonctionnelle** : le Player iOS implemente les memes exigences
  que le Player Android (import de pack, execution graphe, progression
  SQLite, HOLD kiosque) avec des adaptations platform (UI native iOS,
  gestes, notifications).
- **Spec modifiee** : la spec `player-install` est etendue avec des
  exigences iOS-specific dans le cadre du meme schema generique.

## Capabilities

### New Capabilities
- (Aucun — ce change ne cree pas une nouvelle capability)

### Modified Capabilities
- `player-install` : ajout des exigences specifiques a la distribution
  iOS, aux permissions et a l'integration platform iOS.

## Impact

- **`openspec/specs/player-install/spec.md`** : la spec existante est
  etendue avec des exigences iOS (ADDED)
- **Runtime natif iOS** : nouvelle cible de build dans le runtime
  GeoPlay
- **Pack Studio** : les packs doivent etre compatibles iOS (meme JSON,
  memes assets, pas de dependance Android)
- **Distribution** : TestFlight, Ad Hoc, enterprise — pas de sideload
  APK
- **Permissions** : localisation, Bluetooth, camera demandes dans le
  flux iOS avec justification
- **Offline-first** : identique au Player Android — SQLite local, manifest
  SHA-256, reprise par sessionId

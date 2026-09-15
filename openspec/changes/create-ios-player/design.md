## Context

Le framework GeoPlay possede deja un Player Android definit dans la
spec `player-install` (openspec/specs/player-install/spec.md). Ce
player implemente l'import de pack, l'execution graphe, la progression
SQLite, et le mode HOLD kiosque. Le besoin est de creer un Player iOS
parfaitement parallele, compatible avec le meme schema de jeu et le
meme systeme de pack offline.

Le projet cible "natif iOS + Android" depuis le debut (voir
`openspec/config.yaml`). Le Player iOS comble cette absence sans
modifier le schema du jeu ni le runtime pour Android.

## Goals / Non-Goals

**Goals:**
- Creer un Player iOS natif capable d'importer, verifier et jouer
  des packs GeoPlay offline
- Implementer le mode HOLD kiosque via les API iOS equivalents
- Maintenir la parite fonctionnelle avec le Player Android
- Support des permissions iOS avec justification dans le flux

**Non-Goals:**
- Modifier le schema Draft-07 du jeu (le JSON est identique iOS/Android)
- Modifier le Player Android existant
- Coder le runtime en Swift — ceci est un changement de spec, pas
  d'implementation
- Modifier le Studio MCP (deja symetrique)

## Decisions

1. **Extension de la spec `player-install` existante** :
   Plutot que de creer une nouvelle capability `ios-player`, la spec
   `player-install` est etendue avec des exigences iOS-specific.
   Le schema du jeu reste le meme pour les deux plateformes.

2. **Distribution via TestFlight/Ad Hoc** : Le sideload APK
   (Android) est remplace par TestFlight/Ad Hoc/enterprise (iOS).
   Le `CFBundleVersion` suit l'app, le pack reste versionne par
   son manifest.

3. **Permissions justifiees dans le flux** : Les permissions iOS
   (localisation, Bluetooth, camera) sont demandees dans le contexte
   du jeu, pas au prealable.

4. **HOLD via API iOS equivalents** : Guided Access, Screen Time,
   ou Lock Task selon le `holdMode` defini dans le JSON du jeu.

5. **SQLite dans le dossier Documents** : La base SQLite vit dans
   le dossier Documents iOS avec backup exclu (NSFileBackupException).

## Risks / Trade-offs

- **Risque** : Les API iOS equivalents au Lock Task Mode Android
  ne sont pas parfaitement paralleles (Guided Access vs Lock Task).
  - **Mitigation** : Le runtime iOS abstrait le verrouillage via
    un adaptateur platform qui mappe `holdMode` vers l'API iOS
    appropriee.
- **Risque** : La verification SHA-256 peut etre plus lente sur
  iOS en raison des restrictions de file system.
  - **Mitigation** : Verification parallele par fichier avec
    background download supporte.
- **Trade-off** : L'interface iOS native vs le meme composant web
  que l'Android.
  - **Resolution** : Les composants de presentation restent dans le
    runtime (pas dans la spec), la spec definie le comportement.

## Open Questions

- Le Player iOS utilise-t-il MapKit ou un rendu web view pour la
  carte ? La spec ne dicte pas l'implementation.
- Le format du manifest SHA-256 est-il identique entre Android et
  iOS ? (Oui — le manifest est definie par le Studio, pas par le
  Player.)
- Le support du mode HOLD sur iOS necessite-t-il une version
  minimale d'iOS ? (A determiner lors de l'implementation.)
- La synchronization multi-session MASTER P2P fonctionne-t-elle
  sur iOS avec les restrictions Bluetooth ? (A valider.)

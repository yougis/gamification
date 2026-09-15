## ADDED Requirements

### Requirement: Distribution iOS

Le Player iOS SHALL s'installer via TestFlight, Ad Hoc ou enterprise
distribution. Le `CFBundleVersion` SHALL suivre l'app, jamais le pack
(les packs sont versionnes par leur manifest). L'installation en borne
SHALL etre possible sans compte Apple ID.

#### Scenario: Installation en borne iOS

- **GIVEN** une iPad en borne sans compte Apple ID
- **WHEN** l'animateur installe le pack via TestFlight ou Ad Hoc
- **THEN** le jeu tourne sans compte ni reseau

#### Scenario: Distribution TestFlight

- **GIVEN** un createur partageant un build via TestFlight
- **WHEN** le joueur installe le pack
- **THEN** le jeu fonctionne avec le pack verify par manifest SHA-256

### Requirement: Permissions iOS justifiees

Le Player iOS SHALL demander les permissions iOS (localisation,
Bluetooth, camera) dans le flux avec justification. Le flux de
permission SHALL etre justifie par le contexte du jeu (un jeu avec
AR_MARKER demande la camera, un jeu avec PROXIMITY_MASTER demande
le Bluetooth).

#### Scenario: Permission camera pour AR_MARKER

- **GIVEN** un jeu avec module AR_MARKER
- **WHEN** le joueur lance le jeu sur iOS
- **THEN** la permission camera est demandee avec justification
  "Necessaire pour le mode AR de ce jeu"

#### Scenario: Permission Bluetooth pour PROXIMITY_MASTER

- **GIVEN** un jeu avec condition PROXIMITY_MASTER en transport BLE
- **WHEN** le joueur lance le jeu sur iOS
- **THEN** la permission Bluetooth est demandee avec justification

### Requirement: UI et gestes iOS natifs

Le Player iOS SHALL presenter l'interface avec les composants natifs
iOS (UIKit, SwiftUI). Les gestes (swipe, pinch, tap long) SHALL
etre supportes pour la navigation entre etapes et l'interaction avec
les modules. La carte SHALL utiliser MapKit ou un rendu web view
compatible iOS.

#### Scenario: Navigation swipe entre etapes

- **GIVEN** un jeu GUIDED avec presentation ["STORY"]
- **WHEN** le joueur swipe vers la gauche
- **THEN** l'etape suivante s'affiche avec animation iOS native

#### Scenario: Pinch sur la carte

- **GIVEN** un jeu avec presentation ["MAP"]
- **WHEN** le joueur pince l'ecran
- **THEN** la carte zoom avec le geste natif iOS

### Requirement: HOLD kiosque iOS

Le Player iOS SHALL supporter le mode HOLD via les API iOS
equivalentes (Screen Time, Guided Access, ou Lock Task). Le
runtime SHALL activer le verrouillage kiosque OS immediatement
avant la premiere interaction joueur. La sortie HOLD SHALL etre
reservee a l'animateur via le panneau admin avec PIN.

#### Scenario: Guided Access iOS

- **GIVEN** un jeu avec `global.holdMode: "guidedAccess"`
- **WHEN** la session démarre sur iPad iOS
- **THEN** le systeme iOS passe en Guided Access, le verrouillage
  est actif et le joueur ne peut pas changer d'application

#### Scenario: Sortie HOLD par PIN animateur

- **GIVEN** session HOLD active sur iOS
- **WHEN** l'animateur saisit le PIN correct via le panneau admin
- **THEN** le runtime relache le verrouillage iOS et un event
  `holdExit` est journalise

### Requirement: SQLite offline et reprise iOS

Le Player iOS SHALL maintenir la progression, les `randomDraws[sessionId]`
et les events en SQLite avec ecriture immediate. Reprendre = meme
`sessionId` relu ; nouvelle partie = nouveau `sessionId`. Le
stockage local SHALL utiliser le dossier Documents iOS avec backup
exclu pour la base SQLite.

#### Scenario: Reprise apres kill iOS

- **GIVEN** une partie avec inventaire et progression persistes
- **WHEN** l'application iOS est tuee puis relancee avec le meme
  `sessionId`
- **THEN** l'inventaire et la progression sont restaures depuis SQLite

### Requirement: Pack verification SHA-256 iOS

Le Player iOS SHALL verifier le manifest SHA-256 par fichier au
premier lancement. Un pack partiel ou corrompu SHALL reste non
lançable avec etat explicite (progression %, fichier fautif).

#### Scenario: Pack verifie iOS

- **GIVEN** un pack avec manifest valide
- **WHEN** le joueur importe le pack sur iPad
- **THEN** chaque fichier est verifie SHA-256 et le jeu demarre
  offline

#### Scenario: Pack partiel refuse iOS

- **GIVEN** un pack avec 1 asset corrompu sur 20
- **WHEN** le joueur tente de lancer
- **THEN** le lancement est refuse avec le fichier fautif nomme

## ADDED Requirements

### Requirement: Prévisualisation par simulateur Compose web

L'écran Prévisualiser SHALL embarquer le simulateur Compose web (`compose-web-simulator`) en appel direct : le jeu courant est passe en memoire (jamais d'URL, jamais de snapshot serveur), l'etat simule (positions mockees, tirages forces, `sessionId` injecte) est fourni par les controles d'essai existants. Toute interaction SHALL rester sans ecriture (ni JSON source, ni session, ni event). L'iframe PWA, l'endpoint `/emulate` et la cible configurable SHALL ne plus exister.

#### Scenario: Essai sans ecriture
- **GIVEN** un jeu charge dans Previsualiser avec le simulateur ouvert
- **WHEN** l'auteur navigue, repond un quiz et force un tirage
- **THEN** les ecrans reagissent et le JSON source, l'essai hors simulateur et le journal restent intacts hors events SIMULE journalises

#### Scenario: Plus d'iframe
- **GIVEN** l'ecran Previsualiser affiche
- **WHEN** l'auteur cherche la cible PWA ou l'etat d'erreur iframe
- **THEN** aucun controle d'iframe n'existe ; seule la vue simulateur et les controles d'essai sont proposes

## REMOVED Requirements

### Requirement: Prévisualisation traçée
**Reason**: Le terminal React duplique et la previsualisation iframe rejoue un vrai player ; les deux sont remplaces par le simulateur Compose web unique.
**Migration**: Essai pas-a-pas, bypass capteurs, `forceDraw`, injection `sessionId` et `forceHoldLock`/`forceHoldExit` via les controles d'essai branchés sur le simulateur ; badge SIMULE conserve sur tout event simule.

## Purpose
Extension du viewer-orchestrator pour supporter les nouvelles couches de présentation et de navigation fonctionnelle.

## Requirements

### Requirement: HOLD meta-état kiosque

Quand `global.holdMode != "none"`, le runtime SHALL activer le verrouillage kiosque OS immédiatement avant la première interaction joueur et le maintenir actif tant que la session n'est pas terminée. Le runtime N'INTERCEPTE JAMAIS le bouton Home ou le geste système — l'OS verrouille.

#### Scenario: Session HOLD démarre et verrouille
- **GIVEN** un Jeu avec `global.holdMode: "lockTask"` et `holdExit` configuré
- **WHEN** la session démarre
- **THEN** le terminal passe en Lock Task Mode

#### Scenario: Appui Home en mode HOLD
- **GIVEN** session HOLD active, le joueur tente le bouton Home
- **WHEN** l'OS intercepte et verrouille
- **THEN** l'application reste visible, le joueur ne change pas d'application, un event `holdBlock` est journalise

### Requirement: Sortie HOLD par action animateur

Quand `holdMode != "none"`, le runtime SHALL fournir un canal d'exit réservé à l'animateur, accessible uniquement via l'interface d'administration du runtime. Chaque sortie réussie produit un event `holdExit` avec le timestamp, le `sessionId`, et la méthode utilisée.

#### Scenario: PIN correct désactive HOLD
- **GIVEN** `holdMode: "guidedAccess"`, `holdExit.method: "adminPin"`
- **WHEN** l'animateur saisit le PIN correct via le panneau admin
- **THEN** le runtime relâche le verrouillage OS, `holdExit` event journalisé

#### Scenario: PIN incorrect
- **GIVEN** `holdMode: "guidedAccess"`, `holdExit.method: "adminPin"`
- **WHEN** l'animateur saisit un PIN incorrect
- **THEN** le runtime rejette, compteur de tentative incrémenté, event `holdExitAttempt` journalise avec `success: false`

### Requirement: Sortie HOLD forcee par l'OS

Si l'OS force la sortie de l'app (coupure système, redémarrage), le runtime SHALL journaliser un event `holdForceExit`. Au redémarrage, le même `sessionId` relit l'état depuis SQLite ; le HOLD est relancé.

#### Scenario: Redémarrage après coupure en HOLD
- **GIVEN** session HOLD active, coupure système
- **WHEN** le joueur redémarre avec le même `sessionId`
- **THEN** le HOLD est relancé

### Requirement: Tous les modes journalisent entrées/sorties

Tout mode de jeu (HOLD ou `holdMode: "none"`) SHALL journaliser dans l'interface animateur : `sessionStart`, `sessionPause`, `sessionResume`, `sessionEnd`, `holdLock` / `holdUnlock`, `holdExit`.

#### Scenario: Mode non-HOLD journalise les entrées/sorties
- **GIVEN** `holdMode: "none"`
- **WHEN** le joueur lance la session, la quitte et la relance
- **THEN** `sessionStart`, `sessionPause`, `sessionResume`, `sessionEnd` sont tous journalisés

### Requirement: Boucle d'évaluation continue

Le runtime SHALL évaluer les `activation` en continu, résoudre les pools `ON_GAME_START` en ordre topo à l'init, et persister chaque tirage aussitôt en SQLite. En mode HOLD, la boucle d'évaluation continue mais les signaux `onPause`/`onStop` ne provoquent pas de pause sauf si l'OS force l'arrêt.

#### Scenario: Init avec pools en cascade
- **GIVEN** un pool B `ON_GAME_START` dépendant du pool A `ON_GAME_START`
- **WHEN** la session démarre
- **THEN** A est tiré puis B, dans l'ordre topo, avant tout `UNLOCKED`

#### Scenario: HOLD ne pause pas l'évaluation
- **GIVEN** session HOLD active, le joueur revient en arrière
- **WHEN** l'OS signale `onPause`
- **THEN** l'évaluation continue en arrière-plan, seul le journal est mis à jour, le verrouillage kiosque reste actif

### Requirement: File FIFO à modale unique

Le runtime SHALL présenter au plus 1 modale `ACTIVE` : passage auto pour `GEOFENCE`/`TIMER`, choix (menu/carte) pour `NODE_COMPLETED`/`POOL_DRAWN` multiples, file d'attente FIFO, `ACTIVE` latché, file suivant le `latch` (sortie de file si relock). Les triggers d'activation peuvent être géographiques (GEOFENCE) ou fonctionnels (ITEM_USED, CODE_INPUT, CLUE_RESOLVED).

#### Scenario: Deux geofences simultanées
- **GIVEN** un Quiz `ACTIVE` et un second geofence qui devient vrai
- **WHEN** le moteur évalue
- **THEN** le second attend en file FIFO sans seconde modale

#### Scenario: Activation par objet dans la file
- **GIVEN** un jeu ESCAPE_GAME où un nœud devient UNLOCKED via ITEM_USED
- **WHEN** le joueur utilise l'objet
- **THEN** le nœud entre dans la file ACTIVE comme pour tout autre déclencheur

### Requirement: Capteurs sobres et guidance non bloquante

Le GPS SHALL adapter sa fréquence (ralenti hors épreuve), appliquer gating `maxAccuracyM` + `dwell` + hystérésis depuis le JSON. La boussole SHALL fournir heading nord vrai lissé + accuracy pour flèche POI + distance texte + haptique (jamais couleur seule). Le GPS SHALL adapter sa fréquence selon le modèle de navigation. En mode GUIDED ou ESCAPE_GAME sans composante GPS, le GPS peut être inactif ou en mode basse fréquence.

#### Scenario: Cour fermée sans accuracy
- **GIVEN** un POI `maxAccuracyM:15` et des fixes à 40 m
- **WHEN** le joueur piétine dans le rayon
- **THEN** le Nœud ne s'active pas et l'UI indique l'attente de précision

#### Scenario: HOLD avec precisions GPS
- **GIVEN** `holdMode: "guidedAccess"`, POI avec `maxAccuracyM:15`
- **WHEN** le joueur est dans le rayon avec des fixes à 20 m
- **THEN** le Nœud ne s'active pas, l'UI indique l'attente de précision, le verrouillage kiosque reste actif

#### Scenario: Jeu GUIDED sans GPS
- **GIVEN** un jeu GUIDED avec `navigationModel: "GUIDED"` et `presentation: ["STORY"]`
- **WHEN** le joueur lance la session
- **THEN** le GPS est inactif ou en mode très basse fréquence, seul le story renderer est actif

### Requirement: Rendu carte et triche tracée

La carte SHALL afficher position + trace GPX display + POI éligibles, sur fond uni si tuiles absentes. Le mode triche in-app SHALL offrir bypass GEOFENCE, auto-validation et forceDraw, chaque event portant le flag triche.

#### Scenario: Preview terrain d'une branche
- **GIVEN** un animateur forçant `pool->marche` en triche
- **WHEN** les events remontent
- **THEN** chacun porte le flag et le tirage réel reste intact

#### Scenario: Triche en mode HOLD via panneau admin
- **GIVEN** `holdMode: "lockTask"`, l'animateur accède au panneau admin
- **WHEN** l'animateur active le bypass GEOFENCE
- **THEN** chaque event porte le flag triche et le flag holdMode

### Requirement: Mode triche en navigation fonctionnelle

Le mode triche (bypass GEOFENCE, forceDraw, auto-validation) SHALL fonctionner avec les nouveaux types d'activation (ITEM_USED, CODE_INPUT, CLUE_RESOLVED). Chaque event triche porte le flag triche et, en mode HOLD, le flag holdMode.

#### Scenario: Triche avec ITEM_USED
- **GIVEN** un jeu avec holdMode "guidedAccess", l'animateur force ITEM_USED en triche
- **WHEN** l'event remonte
- **THEN** il porte le flag triche et le flag holdMode

### Requirement: Rendu selon le modèle de présentation

Le runtime SHALL adapter le rendu du Player selon la configuration `global.presentation`. Les modes de présentation supportés : `MAP`, `LIST`, `STORY`, `CLUE`, `TOOLBOX`, `TIMELINE`. Le runtime SHALL pouvoir combiner plusieurs présentations simultanément.

#### Scenario: Présentation combinée
- **GIVEN** un jeu avec `presentation: ["MAP", "TOOLBOX", "CLUE"]`
- **WHEN** le joueur ouvre le jeu
- **THEN** la carte, la boîte à outils et la zone d'indices s'affichent simultanément

### Requirement: Sélection dynamique de la vue

Le runtime SHALL permettre la transition entre les modes de présentation selon l'état du jeu.

#### Scenario: Transition MAP → CLUE
- **GIVEN** un jeu avec `presentation: ["MAP", "CLUE"]`
- **WHEN** le joueur arrive à une étape avec une énigme
- **THEN** la vue CLUE est affichée en plus de la carte

### Requirement: Présentation selon le modèle

Le runtime SHALL adapter le rendu du Player selon le modèle de navigation configuré. Le Player NE DOIT PAS être obligé d'afficher une carte pour tous les jeux.

#### Scenario: Jeu GUIDED sans carte
- **GIVEN** un jeu GUIDED avec `presentation: ["STORY"]`
- **WHEN** le joueur lance le jeu
- **THEN** aucune carte n'est affichée, seul le récit narratif est visible

### Requirement: Icône d'inventaire persistante

Quand le jeu définit des objets (`objects[]` non vide) ET que `presentation` inclut `TOOLBOX`, le Player SHALL afficher une icône d'inventaire persistante sur tous les écrans, sauf sur les Nœuds avec `inventoryAccess: false`. L'ouverture SHALL afficher la boîte à outils en overlay ; la fermeture SHALL reprendre l'écran exact (état moteur, modale ACTIVE et file FIFO inchangés). Sans objet ou sans `TOOLBOX`, aucune icône SHALL apparaître.

#### Scenario: Accès à tout moment
- **GIVEN** un jeu avec objets et `presentation: ["MAP", "TOOLBOX"]`, joueur sur un Nœud sans `inventoryAccess`
- **WHEN** le joueur touche l'icône puis la referme
- **THEN** la boîte à outils s'est ouverte par-dessus et l'écran est restauré à l'identique, sans transition d'état

#### Scenario: Épreuve isolée
- **GIVEN** un Nœud avec `inventoryAccess: false` dans le même jeu
- **WHEN** le joueur atteint ce Nœud
- **THEN** aucune icône n'est affichée tant que le Nœud est ACTIVE

#### Scenario: Jeu sans inventaire inchangé
- **GIVEN** un jeu BASIC sans objet
- **WHEN** le joueur ouvre le jeu
- **THEN** aucune icône d'inventaire n'apparaît

### Requirement: Surimpression fermable (terminal simulé)

Constat de périmètre : aucun player (natif, PWA, shared Compose) ne rend aujourd'hui les `ScreenDefinition` — le terminal joueur simulé du Studio est le seul renderer d'écrans. Le contrat ci-dessous y est implémenté ; le renderer natif/PWA le reprendra dans un change dédié.

Quand la zone `overlay` d'un écran porte `fermable: true`, le terminal simulé SHALL permettre au joueur de masquer la surimpression par clic sur son fond semi-transparent. L'écran dessous SHALL rester jouable (renderer déjà interactif ; aucune transition d'état, aucun event dédié, aucune complétion implicite). Une icône « message » persistante (chrome player, glyphe fixe teinté branding) SHALL être visible tant que l'overlay est masquée ; son activation SHALL réafficher l'overlay avec son état conservé (mémoire session, non persistée : à la reprise l'overlay revient affichée). Masquer et réafficher SHALL être libres et illimités. Sans `fermable` (défaut), le clic sur le fond SHALL ne rien masquer.

#### Scenario: Masquage au clic-fond, écran jouable
- **GIVEN** un Nœud ACTIVE avec overlay `fermable: true` par-dessus un quiz en cours
- **WHEN** le joueur clique le fond de la surimpression
- **THEN** l'overlay se masque, le quiz reste jouable, le Nœud reste ACTIVE, aucun event n'est journalisé

#### Scenario: Réouverture par l'icône message
- **GIVEN** le même Nœud avec l'overlay masquée (saisie en cours dans la carte)
- **WHEN** le joueur touche l'icône « message »
- **THEN** l'overlay réapparaît avec sa saisie conservée, toujours sans transition d'état

#### Scenario: Non fermable inchangé
- **GIVEN** un Nœud avec overlay sans `fermable`
- **WHEN** le joueur clique le fond de la surimpression
- **THEN** rien ne se masque et aucune icône « message » n'apparaît

#### Scenario: Reprise avec overlay affichée
- **GIVEN** une session où l'overlay `fermable: true` était masquée au kill
- **WHEN** le joueur reprend avec le même `sessionId`
- **THEN** l'overlay est affichée (état propre), la progression moteur est restaurée

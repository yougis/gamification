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

Le runtime SHALL adapter le rendu du Player selon la configuration `global.presentation`. Les modes de présentation supportés : `MAP`, `LIST`, `STORY`, `CLUE`, `TOOLBOX`, `TIMELINE`, `HOME`. Le runtime SHALL pouvoir combiner plusieurs présentations simultanément.

Quand `HOME` est présent, le runtime SHALL afficher une entrée « Accueil » permanente (tab/barre) menant au tableau de bord ; le contenu affiché SHALL être identique au tableau par défaut (temps écoulé, comptes à rebours par POI, états, proposition d'ouverture, entrée inventaire selon sa règle). Naviguer vers ou depuis l'Accueil SHALL ne produire ni transition d'état ni event.

#### Scenario: Présentation combinée
- **GIVEN** un jeu avec `presentation: ["MAP", "TOOLBOX", "CLUE"]`
- **WHEN** le joueur ouvre le jeu
- **THEN** la carte, la boîte à outils et la zone d'indices s'affichent simultanément

#### Scenario: Onglet Accueil permanent
- **GIVEN** un jeu avec `presentation: ["HOME", "MAP"]`
- **WHEN** le joueur navigue entre la carte et l'onglet « Accueil »
- **THEN** chaque vue s'affiche avec son contenu (carte d'un côté, tableau de l'autre), sans transition d'état ni event

### Requirement: Tableau de bord entre les étapes

Quand `presentation` inclut `HOME`, le player SHALL afficher par défaut (aucune modale ACTIVE) un tableau de bord contenant : le temps écoulé de la session ; pour chaque POI non terminé porteur d'une condition `TIMER` non encore satisfaite, le compte à rebours restant affiché à côté du POI (calculé depuis l'ancre et le délai existants, sans nouvelle donnée) ; une entrée vers la boîte à outils (même règle d'affichage que l'icône persistante) ; l'état de chaque POI (fait / à faire, depuis les états moteur) ; la proposition d'ouverture de l'étape en tête de file (même file FIFO, aucune transition ajoutée). Ouvrir ou fermer le tableau de bord SHALL ne produire ni transition d'état ni event de progression. Les temps limites d'épreuve (`timeLimitSeconds`, `maxAttempts`) SHALL rester affichés uniquement dans les écrans d'étapes par les modules.

#### Scenario: Compte à rebours par POI
- **GIVEN** un POI avec `TIMER {GAME_START + 600s}` et une session écoulée de 240s
- **WHEN** le joueur consulte le tableau de bord
- **THEN** le POI affiche « dans 06:00 » à côté de son état

#### Scenario: Proposition d'ouverture
- **GIVEN** un tableau de bord avec `baker` en tête de file
- **WHEN** le joueur touche « Ouvrir : baker »
- **THEN** l'étape s'ouvre comme par tout autre déclencheur, sans event supplémentaire

#### Scenario: Limites d'épreuve hors tableau de bord
- **GIVEN** un quiz avec `timeLimitSeconds: 30`
- **WHEN** le joueur consulte le tableau de bord
- **THEN** aucune mention des 30 secondes n'y figure ; elles s'affichent dans l'écran du quiz

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

### Requirement: Panneau triche de la coquille PWA

La coquille PWA SHALL offrir un panneau triche regroupant bypass GEOFENCE, `forceDraw` par branche et position simulée. Chaque event simulé SHALL porter visuellement et en journal le flag triche (badge distinct) et SHALL ne jamais ressembler à un event réel. La triche SHALL être une simulation locale : elle ne modifie jamais le JSON source et ne nécessite aucun réseau.

#### Scenario: Bypass débloque sans GPS

- **GIVEN** une PWA sans position GPS (fallback) devant un nœud GEOFENCE
- **WHEN** l'animateur active le bypass GEOFENCE
- **THEN** le nœud devient UNLOCKED comme en présence réelle, chaque event portant le flag triche

#### Scenario: Event simulé distinct du réel

- **WHEN** l'animateur consulte le journal après un `forceDraw`
- **THEN** l'event porte le badge triche et est distinguable des events réels

### Requirement: Arrivée immersive sur le nœud à jouer

Au chargement d'une partie (pack importé, nouvelle session ou reprise), le player SHALL ouvrir directement l'écran du nœud à jouer au lieu de la liste, selon la règle : si `HOME` est présent dans `presentation`, le tableau de bord s'affiche et pilote (sa proposition d'ouverture existante fait foi) ; sinon, le player ouvre le premier nœud non terminé sans parent — aucune dépendance `NODE_COMPLETED`/`POOL_DRAWN` entrante — avec préférence au nœud nommé `start` quand il est éligible. Si aucun nœud n'est éligible, le player affiche la liste actuelle (repli inchangé). L'ouverture SHALL être une présentation d'éligible existant : aucune transition d'état, aucun event de progression.

#### Scenario: Arrivée avec HOME

- **GIVEN** un jeu avec `presentation: ["HOME", "TOOLBOX"]` et `baker` en tête de file
- **WHEN** le joueur charge le pack
- **THEN** le tableau de bord s'affiche avec « Ouvrir : baker », jamais la liste brute

#### Scenario: Arrivée sans HOME sur le start

- **GIVEN** un jeu sans `HOME` dont `start` (sans parent) est éligible et non terminé
- **WHEN** le joueur charge le pack
- **THEN** l'écran de `start` s'ouvre directement

#### Scenario: Arrivée sans éligible

- **GIVEN** un jeu sans `HOME` et sans nœud éligible (ex. attente géorepérage)
- **WHEN** le joueur charge le pack
- **THEN** la liste actuelle s'affiche (repli inchangé), sans erreur

#### Scenario: Reprise au milieu du parcours

- **GIVEN** une reprise (`sessionId` existant) avec `scotland` non terminé et éligible
- **WHEN** le joueur rouvre la partie
- **THEN** le player ouvre l'écran de `scotland` (progression relue, pas le début)

### Requirement: Enchaînement des écrans après validation

Valider une étape (module `onComplete`, Terminer, Abandonner exclu) SHALL avancer automatiquement vers l'écran éligible suivant de la file FIFO : même file, aucune transition ajoutée, aucun event ajouté. À défaut d'éligible, le player revient au tableau de bord (si `HOME`) ou à la liste (repli). Si un nœud `isEnding` passe `COMPLETED`, l'écran de fin existant s'affiche.

#### Scenario: Validation enchaîne

- **GIVEN** le joueur validant `baker` avec `scotland` éligible ensuite
- **WHEN** la complétion est enregistrée
- **THEN** l'écran de `scotland` s'ouvre sans repasser par la liste

#### Scenario: Fin de parcours

- **GIVEN** le joueur validant le nœud `fin` (`isEnding`)
- **WHEN** la complétion est enregistrée
- **THEN** l'écran de fin s'affiche (comportement existant, non modifié)

### Requirement: Temps global et verrouillages dans le tableau de bord

Quand `global.dureeTotale` est posée et que le tableau de bord s'affiche, le tableau SHALL afficher en tête le temps restant de partie (`dureeTotale − elapsed`, jamais négatif). Pour chaque POI porteur d'une condition `WINDOW` avec `avantSecondes` non encore atteint, le tableau SHALL afficher « se verrouille dans … » à côté du POI. En mode `finDeTemps: "continuer"` après échéance, le tableau SHALL signaler « hors délai » ; en mode `"terminer"`, la partie est finie (le tableau ne s'affiche plus). Aucune donnée nouvelle : tout est calculé depuis `dureeTotale` et les `WINDOW` existants.

#### Scenario: Rebours global affiché

- **GIVEN** `dureeTotale: 3600` et 600s écoulées, tableau affiché
- **WHEN** le joueur consulte le tableau
- **THEN** la tête affiche « 50:00 restantes »

#### Scenario: Verrouillage annoncé

- **GIVEN** un POI avec `WINDOW {avantSecondes: 900}` et 600s écoulées
- **WHEN** le joueur consulte le tableau
- **THEN** le POI affiche « se verrouille dans 05:00 » à côté de son état

#### Scenario: Hors délai signalé sans bloquer

- **GIVEN** `finDeTemps: "continuer"`, échéance dépassée
- **WHEN** le joueur consulte le tableau
- **THEN** « hors délai » est signalé et le jeu continue normalement

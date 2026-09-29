## MODIFIED Requirements

### Requirement: Arrivée immersive sur le nœud à jouer

Au chargement d'une partie (pack importé, nouvelle session ou reprise), le player SHALL ouvrir directement l'écran du nœud à jouer au lieu de la liste, selon la règle : si `HOME` est présent dans `presentation`, le tableau de bord s'affiche et pilote (sa proposition d'ouverture existante fait foi) ; sinon, le player ouvre le premier nœud non terminé sans parent — aucune dépendance `NODE_COMPLETED`/`POOL_DRAWN` entrante — avec préférence au nœud nommé `start` quand il est éligible. Si aucun nœud n'est éligible, le player affiche la liste actuelle (repli inchangé). L'ouverture SHALL être une présentation d'éligible existant : aucune transition d'état, aucun event de progression.

#### Scenario: Arrivée avec HOME

- **GIVEN** un jeu avec `presentation: ["HOME", "TOOLBOX"]` et `baker` premier eligible
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

Valider une étape (module `onComplete`, Terminer, Abandonner exclu) SHALL avancer automatiquement vers l'écran du prochain noeud eligible, dans l'ordre des eligibles : aucune transition ajoutée, aucun event ajouté. À défaut d'éligible, le player revient au tableau de bord (si `HOME`) ou à la liste (repli). Si un nœud `isEnding` passe `COMPLETED`, l'écran de fin existant s'affiche.

#### Scenario: Validation enchaîne

- **GIVEN** le joueur validant `baker` avec `scotland` éligible ensuite
- **WHEN** la complétion est enregistrée
- **THEN** l'écran de `scotland` s'ouvre sans repasser par la liste

#### Scenario: Fin de parcours

- **GIVEN** le joueur validant le nœud `fin` (`isEnding`)
- **WHEN** la complétion est enregistrée
- **THEN** l'écran de fin s'affiche (comportement existant, non modifié)

## MODIFIED Requirements (suite, sans ACTIVE ni file)

### Requirement: Tableau de bord entre les étapes

Quand `presentation` inclut `HOME`, le player SHALL afficher par défaut (aucun écran d'étape ouvert) un tableau de bord contenant : le temps écoulé de la session ; pour chaque POI non terminé porteur d'une condition `TIMER` non encore satisfaite, le compte à rebours restant affiché à côté du POI (calculé depuis l'ancre et le délai existants, sans nouvelle donnée) ; une entrée vers la boîte à outils (même règle d'affichage que l'icône persistante) ; l'état de chaque POI (fait / à faire, depuis les états moteur) ; la proposition d'ouverture du premier éligible (aucune transition ajoutée). Ouvrir ou fermer le tableau de bord SHALL ne produire ni transition d'état ni event de progression. Les temps limites d'épreuve (`timeLimitSeconds`, `maxAttempts`) SHALL rester affichés uniquement dans les écrans d'étapes par les modules.

#### Scenario: Compte à rebours par POI
- **GIVEN** un POI avec `TIMER {GAME_START + 600s}` et une session écoulée de 240s
- **WHEN** le joueur consulte le tableau de bord
- **THEN** le POI affiche « dans 06:00 » à côté de son état

#### Scenario: Proposition d'ouverture
- **GIVEN** un tableau de bord avec `baker` premier éligible
- **WHEN** le joueur touche « Ouvrir : baker »
- **THEN** l'étape s'ouvre comme par tout autre déclencheur, sans event supplémentaire

#### Scenario: Limites d'épreuve hors tableau de bord
- **GIVEN** un quiz avec `timeLimitSeconds: 30`
- **WHEN** le joueur consulte le tableau de bord
- **THEN** aucune mention des 30 secondes n'y figure ; elles s'affichent dans l'écran du quiz

### Requirement: Icône d'inventaire persistante

Quand le jeu définit des objets (`objects[]` non vide) ET que `presentation` inclut `TOOLBOX`, le Player SHALL afficher une icône d'inventaire persistante sur tous les écrans, sauf sur les Nœuds avec `inventoryAccess: false`. L'ouverture SHALL afficher la boîte à outils en overlay ; la fermeture SHALL reprendre l'écran exact (état moteur inchangé). Sans objet ou sans `TOOLBOX`, aucune icône SHALL apparaître.

#### Scenario: Accès à tout moment
- **GIVEN** un jeu avec objets et `presentation: ["MAP", "TOOLBOX"]`, joueur sur un Nœud sans `inventoryAccess`
- **WHEN** le joueur touche l'icône puis la referme
- **THEN** la boîte à outils s'est ouverte par-dessus et l'écran est restauré à l'identique, sans transition d'état

#### Scenario: Épreuve isolée
- **GIVEN** un Nœud avec `inventoryAccess: false` dans le même jeu
- **WHEN** le joueur atteint ce Nœud et ouvre son écran
- **THEN** aucune icône n'est affichée tant que l'écran est ouvert

#### Scenario: Jeu sans inventaire inchangé
- **GIVEN** un jeu BASIC sans objet
- **WHEN** le joueur ouvre le jeu
- **THEN** aucune icône d'inventaire n'apparaît

### Requirement: Surimpression fermable (terminal simulé)

Constat de périmètre : le terminal joueur simulé du Studio est le seul renderer d'écrans avec le renderer natif Compose — un seul renderer `commonMain` les porte. Le contrat ci-dessous y est implémenté.

Quand la zone `overlay` d'un écran porte `fermable: true`, le renderer SHALL permettre au joueur de masquer la surimpression par clic sur son fond semi-transparent. L'écran dessous SHALL rester jouable (renderer déjà interactif ; aucune transition d'état, aucun event dédié, aucune complétion implicite). Une icône « message » persistante (chrome player, glyphe fixe teinté branding) SHALL être visible tant que l'overlay est masquée ; son activation SHALL réafficher l'overlay avec son état conservé (mémoire session, non persistée : à la reprise l'overlay revient affichée). Masquer et réafficher SHALL être libres et illimités. Sans `fermable` (défaut), le clic sur le fond SHALL ne rien masquer.

#### Scenario: Masquage au clic-fond, écran jouable
- **GIVEN** un Nœud `UNLOCKED` ouvert avec overlay `fermable: true` par-dessus un quiz en cours
- **WHEN** le joueur clique le fond de la surimpression
- **THEN** l'overlay se masque, le quiz reste jouable, le Nœud reste `UNLOCKED`, aucun event n'est journalisé

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

### Requirement: Widget carte plein écran depuis HOME

Depuis HOME, l'icône du widget carte SHALL ouvrir la carte en plein écran **à la place** de HOME (navigation, pas overlay) ; le retour SHALL se faire via l'entrée « Accueil » (le tableau de bord se réaffiche à l'identique). Un seul widget plein écran à la fois : en ouvrir un second SHALL remplacer le premier. Le plein écran SHALL être inaccessible pendant qu'un écran d'épreuve est ouvert (vues exclusives, comme les présentations). Ouvrir, naviguer et revenir SHALL ne produire ni transition ni event.

#### Scenario: Aller-retour plein écran

- **GIVEN** un joueur sur HOME sans écran d'épreuve ouvert
- **WHEN** il touche l'icône carte puis l'entrée « Accueil »
- **THEN** la carte plein écran s'affiche puis HOME revient à l'identique, sans event

#### Scenario: Plein écran verrouillé pendant une épreuve

- **GIVEN** un écran d'épreuve ouvert (quiz en cours)
- **WHEN** le joueur tente d'ouvrir la carte plein écran
- **THEN** l'ouverture est refusée (ou l'icône est absente) et l'épreuve continue sans interruption

## REMOVED Requirements

### Requirement: File FIFO à modale unique
**Reason**: Plus d'etat `ACTIVE`, plus de modale imposee, plus de file d'attente (voir `game-graph`).
**Migration**: Les noeuds `UNLOCKED` sont presentables librement ; l'arrivee et l'enchainement suivent l'ordre des eligibles sans file.

### Requirement: Panneau triche de la coquille PWA
**Reason**: Plus de coquille PWA ; la triche d'essai vit dans le simulateur Compose web et le preview Studio existant.
**Migration**: Bypass capteurs et `forceDraw` via le simulateur (`compose-web-simulator`) et l'ecran Previsualiser, flag triche inchange.

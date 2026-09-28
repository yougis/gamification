## MODIFIED Requirements

### Requirement: File FIFO à modale unique

Le runtime SHALL calculer des eligibles + file de suggestion, sans modale imposee. L'ouverture SHALL etre manuelle (volet/carte/liste). Valider (`onComplete`, Terminer, Abandonner exclu) SHALL ecrire `COMPLETED` + effets + event puis revenir HOME (si `HOME`) ou liste (repli). Si `isEnding` passe `COMPLETED`, l'ecran de fin s'affiche.

#### Scenario: Deux geofences simultanées
- **GIVEN** un Quiz ouvert en mode jouable et un second geofence qui devient vrai
- **WHEN** le moteur évalue
- **THEN** le second reste suggere en file sans ouverture auto

#### Scenario: Activation par objet dans la file
- **GIVEN** un jeu ESCAPE_GAME où un nœud devient UNLOCKED via ITEM_USED
- **WHEN** le joueur utilise l'objet
- **THEN** le nœud entre dans la file de suggestion comme pour tout autre déclencheur

### Requirement: Arrivée immersive sur le nœud à jouer

Au chargement d'une partie, si `HOME` est present le tableau/carte pilote sans ouverture auto (sa proposition d'ouverture fait foi) ; sinon le player SHALL proposer le noeud principal (premier non termine sans parent, preference `start` eligible) sans l'ouvrir seul. Si aucun noeud eligible, repli liste inchange. La proposition SHALL etre sans transition ni event.

#### Scenario: Arrivée avec HOME
- **GIVEN** un jeu avec `presentation: ["HOME", "TOOLBOX"]` et `baker` en tête de file
- **WHEN** le joueur charge le pack
- **THEN** le tableau de bord s'affiche avec « Ouvrir : baker », jamais la liste brute ni l'etape seule

#### Scenario: Arrivée sans HOME sur le start
- **GIVEN** un jeu sans `HOME` dont `start` (sans parent) est éligible et non terminé
- **WHEN** le joueur charge le pack
- **THEN** `start` est propose en tete, a ouvrir manuellement

#### Scenario: Arrivée sans éligible
- **GIVEN** un jeu sans `HOME` et sans nœud éligible (ex. attente géorepérage)
- **WHEN** le joueur charge le pack
- **THEN** la liste actuelle s'affiche (repli inchangé), sans erreur

#### Scenario: Reprise au milieu du parcours
- **GIVEN** une reprise (`sessionId` existant) avec `scotland` non terminé et éligible
- **WHEN** le joueur rouvre la partie
- **THEN** `scotland` est propose en tete (progression relue, pas le début), a ouvrir manuellement

### Requirement: Tableau de bord entre les étapes

Quand `presentation` inclut `HOME`, le player SHALL afficher par défaut (aucune etape en mode jouable) un tableau/carte contenant : temps écoulé, comptes à rebours TIMER par POI, entrée boîte à outils, états, proposition tête de file. Ouvrir/fermer SHALL ne produire ni transition ni event. Limites d'epreuve (`timeLimitSeconds`, `maxAttempts`) SHALL rester dans les ecrans d'etapes.

#### Scenario: Compte à rebours par POI
- **GIVEN** un POI avec `TIMER {GAME_START + 600s}` et une session écoulée de 240s
- **WHEN** le joueur consulte le tableau de bord
- **THEN** le POI affiche « dans 06:00 » à côté de son état

#### Scenario: Proposition d'ouverture
- **GIVEN** un tableau de bord avec `baker` en tête de file
- **WHEN** le joueur touche « Ouvrir : baker »
- **THEN** l'étape s'ouvre en vue sans event moteur

#### Scenario: Limites d'épreuve hors tableau de bord
- **GIVEN** un quiz avec `timeLimitSeconds: 30`
- **WHEN** le joueur consulte le tableau de bord
- **THEN** aucune mention des 30 secondes n'y figure ; elles s'affichent dans l'écran du quiz

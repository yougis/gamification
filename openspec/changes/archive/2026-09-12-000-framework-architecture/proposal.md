## Why

GeoPlay est un framework natif iOS + Android qui produit des jeux geolocalises
offline. Sans socle fige (lexique, graphe, orchestrateur,
registre, validation), chaque change 100-500 divergera et le cas de reference
(1er POI tire parmi 5) restera inexprimable. Ce change fondateur verrouille le socle
resserre avant tout schema detaille.

## What Changes

- Fige le lexique : Framework, Studio, Jeu, Module, Noeud (instance de Module),
  activation portee par le Noeud (`requires[] + operator`), conditions, donnees
  globales vs donnees module, mode systeme.
- Fige le modele graphe oriente : Jeu = Nœuds + branding + donnees globales ;
  melange libre GEOFENCE / NODE_COMPLETED / TIMER / POOL_DRAWN par Noeud.
- Fige les declencheurs socle : `GEOFENCE` (rayon + override + predicat
  in|out|dwell|through + dwell + hysteresis), `NODE_COMPLETED`, `TIMER` (delai
  minimum ancre `GAME_START|NODE_COMPLETION`), `POOL_DRAWN`. `RANDOM_POOL` =
  noeud structurel `LOCKED -> COMPLETED` sans `ACTIVE`.
- Reserve dans l'enum sans outiller le Studio : `CONDITIONAL` (gamebook) et
  `WINDOW` (fenetre horaire absolue). Politique de compat : moteur ignore un
  type inconnu gracieusement au socle.
- Fige la machine a etats `LOCKED -> UNLOCKED -> ACTIVE -> COMPLETED` :
  `UNLOCKED` vs `ACTIVE` + file 1 modale max (auto vs choix), `latch` par noeud
  (true = reste UNLOCKED, false = retour LOCKED si revocable retombe, ex. sortie
  geofence), `ACTIVE` latche une fois la modale ouverte.
- Fige cycles et rejeu : `allowCycle:false` par defaut (topologie logique),
  `onReentry:ignore` par defaut (execution terrain), `replay` exige `maxReentries`
  + `scoreOnReplay` (defaut false). Validateur ignore les aretes `allowCycle:true`
  et rejette tout cycle residuel.
- Fige la terminaison : `isEnding:true` obligatoire, fin = un `isEnding` passe
  `COMPLETED`, atteignabilite structurelle sous hypothese explicite d'environnement
  favorable, chaque candidat de pool doit atteindre un `isEnding`, detection
  AND-sur-branches-exclusives limitee au cas direct documente.
- Fige le POOL : `{candidates, drawCount, drawTiming ON_POOL_ACTIVATION|ON_GAME_START}`,
  sans remise, `drawCount<=len` + unicite inter-pools en applicatif, ordre topo des
  pools `ON_GAME_START`, persistance immediate `randomDraws[sessionId][poolNodeId]`,
  `forceDraw` triche/preview avec flag triche.
- Fige le registre de modules extensible : sous-schema versionne + besoins
  capteurs/carte + rendu par type, ajout sans toucher Noeuds/Liens. Socle cite
  QUIZ, 7-erreurs (Alpha->polygones), PUZZLE, AR_MARKER, BOUSSOLE.
- Fige la validation en 2 couches : Draft-07 (forme locale) + validateur applicatif
  (cycles, atteignabilite, topo pools, drawCount, unicite, AND-exclusif direct).
- Acte les differes hors socle : sync scoring MASTER P2P, branding fin, i18n/modes
  fins, `WINDOW onMiss`/recurrence, gamebook, trace par module, a11y/batterie/tests
  (lien socle : events, `scoreOnReplay`, flag triche, service boussole, trace display).
- Cas test de reference : graphe START -> POOL (1/5) -> A|B|C|D|E (GEOFENCE si tire)
  -> FIN (`isEnding`), chaque candidat avec son chemin vers FIN.

## Capabilities

### New Capabilities

- `game-graph`: graphe Nœuds/activation, operateur AND/OR, etats + latch + file ACTIVE, cycles/reentry bornes, terminaison isEnding + atteignabilite.
- `game-triggers`: conditions GEOFENCE/NODE_COMPLETED/TIMER/POOL_DRAWN, noeud RANDOM_POOL + drawTiming + persistance + forceDraw, reserves CONDITIONAL/WINDOW.
- `module-registry`: registre extensible, sous-schemas versionnes, besoins capteurs/carte, compat type inconnu, donnees jamais en dur (GPX display, boussole service, Alpha->polygones).
- `game-validation`: double couche Draft-07 + applicative, regles applicatives obligatoires, hypothese env favorable, limites documentees.

### Modified Capabilities

- Aucune (specs/ vide, change fondateur).

## Impact

- Modifie le schema graphe (fondateur sur specs/ vide, sans breaking) ; consommateurs
  impactes : Studio MCP, runtime natif, orchestrateur, modules du registre, packaging
  offline (manifest SHA-256, packs carte, SQLite).
- Touche aux reserves `CONDITIONAL`/`WINDOW` (enum reservee, compat ignore gracieux) ;
  n'ajoute aucun module executable, decrit le registre.
- Aucune connexion reseau requise dans le parcours joueur (offline-first strict,
  fichiers app + SQLite, pas d'exception).
- Dependance : aucune (change fondateur, les changes 100-500 en dependent).

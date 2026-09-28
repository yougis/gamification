## Why

Le parcours HOME carte plein ecran + volet + ouverture manuelle + retour HOME systematique ne sort pas des specs actuelles : ouverture auto GEOFENCE, enchainement FIFO impose, double role de `global.screen`, et aucun contrat de simulation. Le simulateur Studio est de fait le player de reference sans l'assumer.

## What Changes

- Nouveau contrat `player-runtime` : moteur pur + Environnement injectable + etat navigation explicite + PlayerShell unique Studio/PWA/natif.
- HOME carte plein ecran declare cas nominal (pas seulement tableau texte).
- Separation vue != moteur : ouvrir/fermer/revenir = zero ecriture, zero event.
- Deux seules ecritures journalisees : `Valider` (`UNLOCKED --> COMPLETED` en une ecriture) et `Abandonner` (`ABANDON`, consomme le budget).
- Snapshot a l'entree + droit a finir : expiration pendant la saisie = validation acceptee + flag `hors-delai`.
- Consultation large : LOCKED decouvert en apercu gratuit, COMPLETED relu/rejoue (moteur decide score/effets).
- **BREAKING** : suppression de `ACTIVE` du vocabulaire specs et du code (etats `LOCKED | UNLOCKED | COMPLETED` + flags).
- FIFO devient suggestion d'ouverture (tete des eligibles), avance auto supprimee, retour HOME systematique.
- Jeu de test fige : 2 points + 1 quiz chacun, parcours volet->ouvrir->valider->retour HOME + cas grace + abandon + replay.

## Capabilities

### New Capabilities

- `player-runtime`: contrat moteur pur, Environnement injectable, navigation explicite, PlayerShell unique, vocabulaire events ferme (Valider/Abandon/hors-delai).

### Modified Capabilities

- `game-graph`: machine sans ACTIVE, FIFO en suggestion, replay/abandon budget.
- `game-navigation`: HOME-carte cas nominal, retour HOME systematique.
- `viewer-orchestrator`: arrivee, enchainement, tableau, plein ecran carte sans modale.
- `game-schema`: vocabulaire etats sans ACTIVE, events Valider/Abandon/hors-delai.
- `game-validation`: atteignabilite sans ACTIVE, regles replay/abandon/hors-delai, snapshot/grace.
- `player-screen-render`: modes apercu/jouable/relecture/rejeu.
- `studio-screen-builder`: HOME-carte nominal, heritage sans fuite.
- `module-screen-plugins`: renderers selon mode vue.
- `studio-authoring`: Mode Jeux sans modale, journal Valider/Abandon.
- `game-progression`: discovery vs activation vs vue, effets une seule fois par defaut.

## Impact

- Code : `NodeState`, `present()`, `showHomeDashboard`, `noeudPrincipal`, `completeAndAdvance`, `openNode`, carte (`extraireLatLng`/`marqueursCarte`), toolbox, `PlayerTerminal`, `Apercu`, `CarteInteractiveSimu`, GameEngine KMP + PWA + iOS/Android.
- Schema graphe modifie (suppression ACTIVE) : consommateurs Studio MCP, runtime natif, orchestrateur, modules, packaging offline, validation double couche.
- Aucun reseau joueur ajoute : offline-first inchange, position simulee locale uniquement.
- Dependance : evalue sans change precedent bloqueur ; coherence avec `carte-joueur-navigable`, `clic-carte-valide`, `studio-widgets-pleinecran` verifies en code.

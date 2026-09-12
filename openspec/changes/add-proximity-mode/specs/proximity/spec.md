## Purpose

Permet de prouver la presence du joueur la ou le GPS est absent ou inexploitable (cave, interieur, couvert forestier dense) via un MASTER temporaire ou une methode declarative.

## ADDED Requirements

### Requirement: Condition PROXIMITY_MASTER lue depuis le JSON

Toute condition `PROXIMITY_MASTER` SHALL lire depuis le JSON : `masterId`,
`transport` (`ble|wifi`), `minRssiDbm`, `dwellMs`. Aucune de ces valeurs ne
SHALL etre une constante du code. Le MASTER est temporaire (telephone
animateur, Arduino BLE ou equivalent pose en zone) ; aucun identifiant
sensible ne SHALL y figurer, la rotation se fait au Studio. `PROXIMITY_MASTER`
est revocable comme `GEOFENCE` : `latch`, hysteresis, `dwell` et file ACTIVE
s'y appliquent tels quels. Le validateur la traite comme condition
environnementale sous hypothese favorable.

#### Scenario: Entree de grotte avec Arduino

- **GIVEN** un Noeud `PROXIMITY_MASTER masterId:entree-grotte transport:ble minRssiDbm:-75 dwellMs:5000 latch:true`
- **WHEN** le joueur reste 5 s a portee de l'Arduino
- **THEN** le Noeud devient `UNLOCKED`, et le reste apres eloignement

#### Scenario: Sortie de portee en latch suivi

- **GIVEN** un sas `PROXIMITY_MASTER latch:false` devenu `UNLOCKED`
- **WHEN** le signal retombe sous le seuil avec hysteresis depassee
- **THEN** le Noeud retourne `LOCKED` et sort de la file

### Requirement: Methodes declaratives via modules sans changement de schema

QR affiche, code (tournant) MASTER, visee `AR_MARKER`, validation animateur
SHALL etre valides dans un module puis `NODE_COMPLETED`, jamais comme condition
de position. Un QR a enjeu de score SHALL etre couple a un `dwell` sur place ou
a un code tournant (anti-rejeu par photo). La validation animateur SHALL porter
le flag triche. Aucune de ces methodes ne SHALL exiger de modification du schema
Nœuds/Liens.

#### Scenario: QR couple au dwell

- **GIVEN** une salle avec QR affiche et `dwellMs:10000` exige dans le module
- **WHEN** le joueur scanne sans etre reste 10 s
- **THEN** la validation est refusee et le Noeud reste non complete

#### Scenario: Code tournant MASTER

- **GIVEN** un code affiche par le MASTER et renouvele par l'animateur
- **WHEN** le joueur saisit le code courant
- **THEN** le module valide et le Noeud passe `COMPLETED` sans GPS

### Requirement: Matrice milieux et securite

Le Studio SHALL guider l'auteur par milieu : exterieur `GEOFENCE`, foret dense
`GEOFENCE` elargi + `dwell` long, batiment/cave `PROXIMITY_MASTER` puis
QR/code/AR/animateur en secours. Les permissions Bluetooth et WiFi local SHALL
etre demandees dans le flux avec justification. Tout `masterId` perdu ou vole
SHALL etre revocable par rotation au Studio sans republier l'app.

#### Scenario: Batterie MASTER

- **GIVEN** un MASTER telephone en hotspot + BLE toute la journee
- **WHEN** le Studio prepare le kit animateur
- **THEN** la checklist exige une batterie externe dediee

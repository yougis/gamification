## MODIFIED Requirements

### Requirement: Condition PROXIMITY_MASTER lue depuis le JSON

Toute condition `PROXIMITY_MASTER` SHALL lire depuis le JSON : `masterId`,
`transport` (`ble|wifi`), `minRssiDbm`, `dwellMs`. Aucune de ces valeurs ne
SHALL etre une constante du code. Le MASTER est temporaire (telephone
animateur, Arduino BLE ou equivalent pose en zone) ; aucun identifiant
sensible ne SHALL y figurer, la rotation se fait au Studio. `PROXIMITY_MASTER`
est revocable comme `GEOFENCE` : `latch`, hysteresis et `dwell`
s'y appliquent tels quels. Le validateur la traite comme condition
environnementale sous hypothese favorable.

#### Scenario: Entree de grotte avec Arduino

- **GIVEN** un Noeud `PROXIMITY_MASTER masterId:entree-grotte transport:ble minRssiDbm:-75 dwellMs:5000 latch:true`
- **WHEN** le joueur reste 5 s a portee de l'Arduino
- **THEN** le Noeud devient `UNLOCKED`, et le reste apres eloignement

#### Scenario: Sortie de portee en latch suivi

- **GIVEN** un sas `PROXIMITY_MASTER latch:false` devenu `UNLOCKED`
- **WHEN** le signal retombe sous le seuil avec hysteresis depassee
- **THEN** le Noeud retourne `LOCKED`

## ADDED Requirements

### Requirement: PROXIMITY_MASTER au même contrat que GEOFENCE

L'enum des conditions SHALL contenir `PROXIMITY_MASTER` (`masterId`, `transport`
`ble|wifi`, `minRssiDbm`, `dwellMs`) comme condition environnementale révocable
au même titre que `GEOFENCE` : `latch`, hystérésis, `dwell` et file ACTIVE s'y
appliquent, et le validateur l'assimile à une condition pouvant devenir vraie
sous hypothèse favorable. Aucune balise fixe au socle : le MASTER est temporaire
(téléphone animateur, Arduino BLE), identifiants non sensibles, rotation au Studio.

#### Scenario: Grotte sans GPS

- **GIVEN** un Nœud `PROXIMITY_MASTER masterId:entree-grotte latch:true`
- **WHEN** le joueur reste à portée le `dwellMs` puis s'éloigne
- **THEN** le Nœud devient `UNLOCKED` et le reste

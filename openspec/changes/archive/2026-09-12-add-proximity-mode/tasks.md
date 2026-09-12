## 1. Condition PROXIMITY_MASTER

- [x] 1.1 Ajouter `PROXIMITY_MASTER` à l'enum des conditions avec `{masterId, transport, minRssiDbm, dwellMs}` et vérifier qu'un JSON sans `masterId` est rejeté en couche 1
- [x] 1.2 Appliquer sémantique révocable (`latch`, hystérésis, file ACTIVE) identique à `GEOFENCE` et vérifier les 2 scénarios latch:true/false du spec
- [x] 1.3 Étendre le validateur applicatif (condition environnementale sous hypothèse favorable) et vérifier qu'un graphe PROXIMITY→FIN passe l'atteignabilité

## 2. Méthodes déclaratives et Studio

- [x] 2.1 Câbler QR/code/AR/animateur via modules + `NODE_COMPLETED` (aucun changement Nœuds/Liens) et vérifier le scénario QR couplé au dwell
- [x] 2.2 Ajouter la matrice milieux au Studio (extérieur/forêt/bâtiment-cave) avec secours QR/code systématique et vérifier qu'un nœud `PROXIMITY_MASTER` propose un secours
- [x] 2.3 Implémenter rotation `masterId` + flag triche sur validation animateur et vérifier révocation sans republication de l'app

## 3. Campagne terrain et revue

DIFFÉRÉ TERRAIN — hors périmètre de cet archivage. Valeurs par défaut :
`minRssiDbm:-75`, `dwellMs:5000`, à calibrer sur site.

- [ ] 3.1 Calibrer `minRssiDbm`/`dwellMs` par milieu (cave, salle, forêt) avec MASTER téléphone et Arduino et consigner les seuils retenus
- [ ] 3.2 Rejouer batterie MASTER 8 h (BLE + hotspot) avec batterie externe et vérifier aucune coupure de présence
- [x] 3.3 Lancer `openspec validate "add-proximity-mode" --type change` et vérifier le verdict `is valid` avant demande d'archive

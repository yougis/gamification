## 1. Boucle et présentation

- [ ] 1.1 Implémenter la boucle d'évaluation pure (position/horloge/graphe injectés) + topo `ON_GAME_START` + persistance immédiate et vérifier la cascade A→B à l'init
- [ ] 1.2 Implémenter file FIFO à modale unique (auto vs choix, `ACTIVE` latché, éviction au relock) et vérifier le scénario 2 geofences sans empilement
- [ ] 1.3 Isoler l'hôte de modules (crash module = nœud non jouable, boucle vivante) et vérifier la continuité du Jeu

## 2. Capteurs, carte, triche

- [ ] 2.1 Implémenter GPS adaptatif + gating `maxAccuracyM`/`dwell`/hystérésis depuis JSON et vérifier le refus poli en cour fermée
- [ ] 2.2 Implémenter boussole service (heading lissé + accuracy, flèche + texte + haptique, masquage discret) et caméra à la demande, et vérifier jeu continuable sans capteur
- [ ] 2.3 Implémenter carte (position + trace + POI, fond uni sans tuiles) + triche in-app flaguée et vérifier `forceDraw` sans altérer le tirage réel
- [ ] 2.4 Lancer `openspec validate "400-map-viewer-orchestrator" --type change` et vérifier le verdict `is valid` avant demande d'archive

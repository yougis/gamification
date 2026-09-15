## 1. Spec: Ajout des exigences iOS

- [ ] 1.1 Creer le delta spec `specs/player-install/spec.md` avec
  les 6 exigences ADDED (Distribution iOS, Permissions iOS, UI
  gestes iOS, HOLD kiosque iOS, SQLite offline iOS, Pack verification
  iOS)
- [ ] 1.2 Verifier que chaque scenario utilise le format
  `#### Scenario:` avec 4 hashtags et WHEN/THEN
- [ ] 1.3 Verifier que le delta spec ne contient pas de `## Purpose`
  (capabilite existante) et que chaque exigence a au moins un scenario
- [ ] 1.4 Executer `openspec validate --change "create-ios-player"`
  et verifier que le delta spec est valide

## 2. Architecture et integration

- [ ] 2.1 Verifier que le schema Draft-07 du jeu est unchanged —
  le JSON du jeu est identique pour les deux plateformes
- [ ] 2.2 Verifier que le registre de modules est unchanged —
  les modules fonctionnent sur iOS sans modification
- [ ] 2.3 Verifier que le manifest SHA-256 est compatible iOS —
  le format est defini par le Studio, pas par le Player
- [ ] 2.4 Verifier que le runtime iOS adapte `holdMode` vers les
  API equivalents (Guided Access, Screen Time)

## 3. Implementation du Player iOS

- [ ] 3.1 Implementer l'import de pack avec verification SHA-256
  et etat explicite (progression %, fichier fautif)
- [ ] 3.2 Implementer l'execution graphe avec la machine
  `LOCKED → UNLOCKED → ACTIVE → COMPLETED`
- [ ] 3.3 Implementer la persistence SQLite dans le dossier
  Documents iOS avec backup exclu
- [ ] 3.4 Implementer le systeme de permissions avec justification
  dans le flux (localisation, Bluetooth, camera)
- [ ] 3.5 Implementer le mode HOLD kiosque via les API iOS
  equivalents (Guided Access, Lock Task)
- [ ] 3.6 Implementer l'interface UI native iOS pour la carte,
  les etapes, l'inventaire et les modules

## 4. Verification et validation

- [ ] 4.1 Executer `openspec status --change "create-ios-player"`
  et verifier que tous les artifacts sont en statut `done`
- [ ] 4.2 Executer `openspec validate --change "create-ios-player"`
  et verifier que le change est valide avec delta spec
- [ ] 4.3 Verifier que `specs/player-install/spec.md` existe et
  contient les 6 exigences ADDED avec leurs scenarios
- [ ] 4.4 Verifier que la spec `player-install` originelle est
  preservationnee avec les nouvelles exigences iOS creees

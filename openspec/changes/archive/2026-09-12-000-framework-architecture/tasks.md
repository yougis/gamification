## 1. Graphe et machine a etats

- [x] 1.1 Figer le lexique (Framework/Studio/Jeu/Module/Noeud/activation/donnees/mode) dans les 4 specs et verifier coherence terminologique par relecture croisee proposal/specs/design
- [x] 1.2 Decrire `activation.requires/operator` (obligatoire si >=2, interdit si <=1) avec exemples AND/OR et verifier qu'un JSON sans operateur est declare invalide dans `specs/game-graph/spec.md`
- [x] 1.3 Decrire `LOCKED/UNLOCKED/ACTIVE/COMPLETED`, file 1 modale, `latch` true/false, `ACTIVE` qui latche, et verifier chaque transition couverte par au moins un scenario WHEN/THEN

## 2. Declencheurs et POOL

- [x] 2.1 Decrire `GEOFENCE` (lat/lng/radius+override, predicat, dwell, hysteresis, maxAccuracyM) et `NODE_COMPLETED`/`TIMER` ancre plus `POOL_DRAWN`, et verifier aucune valeur en dur cote moteur dans les specs
- [x] 2.2 Decrire `RANDOM_POOL` (sans remise, drawTiming, topo ON_GAME_START, interdictions boot, unicite, persistance `randomDraws[sessionId]`, `forceDraw` + flag) et verifier les 3 scenarios tirage/relance/boot-invalide presents
- [x] 2.3 Documenter `CONDITIONAL`/`WINDOW` reserves ignores gracieusement et verifier la non-regression : un moteur v0 ne crash pas sur type reserve

## 3. Registre, donnees et modes socle

- [x] 3.1 Decrire le registre (sous-schemas versionnes, besoins capteurs/carte, ajout sans toucher Noeuds/Liens, inconnu non bloquant) avec les 5 types socle cites et verifier la regle d'extension dans `specs/module-registry/spec.md`
- [x] 3.2 Decrire donnees depuis JSON (GPX display seule, boussole service + enigme interne, Alpha->polygones au build + dilatation, manifest SHA-256 + SQLite) et verifier chaque asset reference un manifest versionne
- [x] 3.3 Decrire branding objet + triche/test et preview (meme bypass, deux entrees, flag score) et verifier les differes 600-640 listes hors socle

## 4. Validation double couche et terminaison

- [x] 4.1 Repartir chaque regle entre Draft-07 et applicative (cycles, atteignabilite, topo pools, drawCount, unicite, AND-exclusif direct) et verifier la liste exhaustive dans `specs/game-validation/spec.md`
- [x] 4.2 Decrire `isEnding` obligatoire + atteignabilite sous hypothese env favorable + chaque candidat vers FIN, et verifier le libelle d'hypothese present dans le rapport
- [x] 4.3 Documenter les limites volontaires (AND transitif, solveur, ordres de file, valeurs hysteresis en 100, hote preview en 610) et verifier qu'aucune n'est presentee comme garantie

## 5. Reference 5 POI et revue finale

- [x] 5.1 Construire le graphe de reference START->POOL(1/5)->A|B|C|D|E->FIN avec donnees fictives neutres et verifier chaque candidat avec son chemin vers FIN
- [x] 5.2 Rejouer les 3 cas validateur (cycle rejete, Salle du Sage bornee, boussole display) et verifier verdict attendu pour chacun
- [x] 5.3 Lancer `openspec validate "000-framework-architecture" --type change` et verifier le verdict `is valid` avant demande d'archive

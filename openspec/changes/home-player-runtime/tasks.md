## 1. Jeu de test et contrat

- [x] 1.1 Figer le jeu 2 points + 1 quiz chacun + HOME carte et verifier C1+C2 verts
- [x] 1.2 Decrire le parcours volet->ouvrir->valider->retour HOME et verifier lecture manuelle OK
- [x] 1.3 Cas grace/abandon/replay verifies (headless 4.6 + cablage verdicts 4.2 ; passe visuel navigateur residuel)

## 2. Moteur pur

- [x] 2.1 Ajouter `suggest()` (tete + file, sans auto-assignation) a cote de `present()` inchange (TS + KMP) et verifier smokes/suites existants OK
- [x] 2.2 Implementer snapshot `t0`, Valider une ecriture, flag `hors-delai` et verifier test pur OK
- [x] 2.3 Implementer `ABANDON` idempotent + budget `maxReentries` et verifier non-regression replay
- [x] 2.4 Effets une seule fois + score `scoreOnReplay` et verifier pas de double `GIVE_ITEM`

## 3. Navigation explicite (par surface, `present()` intact jusqu'en 3.1.4)

- [x] 3.1.1 Introduire le type `Navigation` pur (TS + KMP : `HOME | Volet(id) | ETAPE(id, mode) | PLEIN_ECRAN`) sans cablage UI et verifier tests purs verts
- [x] 3.1.2 Cabler la simu Studio (`App.tsx`) sur `Navigation` + `suggest()` et verifier simu pas-a-pas visuellement identique + smokes verts
- [x] 3.1.3 Cabler `GeoPlayNav` (KMP) sur `Navigation` et verifier `commonTest` + build OK
- [x] 3.1.4 Cabler PWA (`Main.kt`) sur `Navigation` et verifier build + jeu de test 2pts identique au Studio

## 4. Simu Studio sur verdicts (debloque 1.3)

- [x] 4.1 Brancher `Apercu` (suggestion + ouvrir, badge SIMULE conserve) et verifier badge et file en simu
- [x] 4.2 Brancher `PlayerTerminal` Valider/Abandonner sur `verdictValider`/`verdictAbandonner`/`regimeCompletion` avec retour HOME systematique et verifier les 3 cas 1.3 passent
- [x] 4.3 Brancher `ApercuAccueil` tableau/carte sur `Navigation` et verifier visuellement fixture 2pts

## 5. Modes vue et anti-fuite

- [x] 5.1 Rendre les 4 modes (apercu LOCKED / jouable UNLOCKED / relecture / rejeu COMPLETED) dans `PlayerTerminal` + renderers et verifier chaque mode sur fixture
- [x] 5.2 Appliquer l'anti-fuite carte globale (etape sans content propre = content neutre) et verifier visuellement qu'aucune carte ne fuit
- [x] 5.3 Journal SIMULE Valider/Abandon/hors-delai distinct du reel et verifier lecture du journal en simu

## 6. Parite joueurs

- [x] 6.1 Parite PWA sur shell (jeu de test 2pts identique au Studio) et verifier parcours complet en PWA
- [x] 6.2 Parite Android (`GameFragments`) sur shell et verifier parcours complet sur Android

## 7. Suppression ACTIVE

- [ ] 7.1 Alias deprecie `ACTIVE` (= UNLOCKED affiche) + validateurs tolerants et verifier jeux existants (5poi, sherlock, demo-home) verts
- [x] 7.2 Supprimer `ACTIVE` du code/tests (TS, KMP, Swift si reference) et verifier suites vertes + `openspec validate` OK
